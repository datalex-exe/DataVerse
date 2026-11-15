import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Zap, 
  X, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Film, 
  Image as ImageIcon, 
  Music, 
  Archive,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck
} from 'lucide-react';

export interface P2PTransferSession {
  transferId: string;
  role: 'sender' | 'receiver';
  partnerId: string;
  partnerName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  file?: File;
}

interface P2PTransferModalProps {
  session: P2PTransferSession | null;
  incomingSignal: any;
  sendSignaling: (msg: any) => void;
  onClose: () => void;
  onCompleted?: (session: P2PTransferSession) => void;
}

const CHUNK_SIZE = 64 * 1024; // 64 KB optimal SCTP chunk size for WebRTC DataChannel
const MAX_BUFFERED_AMOUNT = 2 * 1024 * 1024; // 2 MB backpressure threshold

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(mime: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-6 h-6 text-cyan-400" />;
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return <Film className="w-6 h-6 text-purple-400" />;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return <Music className="w-6 h-6 text-emerald-400" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-6 h-6 text-amber-400" />;
  }
  return <FileText className="w-6 h-6 text-teal-400" />;
}

export const P2PTransferModal: React.FC<P2PTransferModalProps> = ({
  session,
  incomingSignal,
  sendSignaling,
  onClose,
  onCompleted
}) => {
  const [status, setStatus] = useState<
    'waiting_accept' | 'connecting' | 'transferring' | 'completed' | 'cancelled' | 'error'
  >('waiting_accept');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progressBytes, setProgressBytes] = useState<number>(0);
  const [speedMBs, setSpeedMBs] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const lastSpeedCheckRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: Date.now() });
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isAbortedRef = useRef<boolean>(false);

  const cleanupP2P = useCallback(() => {
    isAbortedRef.current = true;
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch {}
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
  }, []);

  // Handle peer connection creation
  const initPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && session) {
        sendSignaling({
          type: 'p2p_file_ice',
          transferId: session.transferId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (status !== 'completed' && !isAbortedRef.current) {
          setStatus('error');
          setErrorMessage('Peer connection disconnected');
        }
      }
    };

    return pc;
  }, [sendSignaling, session, status]);

  // Drain pending candidates when remote description is set
  const drainCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (pendingCandidatesRef.current.length > 0) {
      const list = [...pendingCandidatesRef.current];
      pendingCandidatesRef.current = [];
      for (const c of list) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.warn('Failed to add ICE candidate in P2P transfer:', e);
        }
      }
    }
  }, []);

  // Sender file streaming routine over RTCDataChannel
  const startFileStreaming = useCallback((dc: RTCDataChannel, file: File) => {
    setStatus('transferring');
    let offset = 0;
    const totalSize = file.size;
    let lastTime = Date.now();
    let lastBytes = 0;

    const sendNextChunk = () => {
      if (isAbortedRef.current) return;

      while (offset < totalSize) {
        // Backpressure check: if buffer is full, wait for bufferedamountlow event
        if (dc.bufferedAmount > MAX_BUFFERED_AMOUNT) {
          dc.onbufferedamountlow = () => {
            dc.onbufferedamountlow = null;
            sendNextChunk();
          };
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const reader = new FileReader();
        reader.onload = () => {
          if (isAbortedRef.current || dc.readyState !== 'open') return;
          try {
            dc.send(reader.result as ArrayBuffer);
            offset += (reader.result as ArrayBuffer).byteLength;
            setProgressBytes(offset);

            // Compute transfer speed every 400ms
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed >= 0.4) {
              const diffBytes = offset - lastBytes;
              setSpeedMBs(diffBytes / (1024 * 1024 * elapsed));
              lastTime = now;
              lastBytes = offset;
            }

            if (offset >= totalSize) {
              // Signal EOF to receiver
              dc.send(JSON.stringify({ type: 'p2p_file_complete' }));
              setStatus('completed');
              if (session && onCompleted) onCompleted(session);
            } else {
              sendNextChunk();
            }
          } catch (err: any) {
            console.error('Data channel send error:', err);
            setStatus('error');
            setErrorMessage('Data channel transfer interrupted');
          }
        };
        reader.readAsArrayBuffer(slice);
        return;
      }
    };

    sendNextChunk();
  }, [onCompleted, session]);

  // Sender initial offer dispatch after peer accepts
  const initiateSenderOffer = useCallback(async () => {
    if (!session || !session.file) return;
    setStatus('connecting');

    const pc = initPeerConnection();
    const dc = pc.createDataChannel('p2p_file_transfer', { ordered: true });
    dc.binaryType = 'arraybuffer';
    dataChannelRef.current = dc;

    dc.onopen = () => {
      if (session.file) {
        startFileStreaming(dc, session.file);
      }
    };

    dc.onerror = (e) => {
      console.error('P2P Sender DataChannel error:', e);
      setStatus('error');
      setErrorMessage('Direct data channel failed to establish');
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignaling({
        type: 'p2p_file_offer',
        transferId: session.transferId,
        sdp: offer
      });
    } catch (err: any) {
      console.error('Error creating P2P offer:', err);
      setStatus('error');
      setErrorMessage('Failed to create WebRTC offer');
    }
  }, [initPeerConnection, sendSignaling, session, startFileStreaming]);

  // Receiver setup
  const acceptIncomingTransfer = useCallback(async () => {
    if (!session) return;
    setStatus('connecting');
    sendSignaling({
      type: 'p2p_file_accept',
      transferId: session.transferId
    });

    const pc = initPeerConnection();

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dc.binaryType = 'arraybuffer';
      dataChannelRef.current = dc;
      setStatus('transferring');

      receivedChunksRef.current = [];
      receivedBytesRef.current = 0;
      lastSpeedCheckRef.current = { bytes: 0, time: Date.now() };

      dc.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.type === 'p2p_file_complete') {
              // Assemble the received file into a Blob
              const blob = new Blob(receivedChunksRef.current, { type: session.fileType || 'application/octet-stream' });
              const url = URL.createObjectURL(blob);
              setDownloadUrl(url);
              setStatus('completed');

              // Auto-trigger browser download
              const a = document.createElement('a');
              a.href = url;
              a.download = session.fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);

              if (onCompleted) onCompleted(session);
            }
          } catch {}
          return;
        }

        // Binary array buffer chunk
        const buffer = e.data as ArrayBuffer;
        receivedChunksRef.current.push(buffer);
        receivedBytesRef.current += buffer.byteLength;
        setProgressBytes(receivedBytesRef.current);

        const now = Date.now();
        const elapsed = (now - lastSpeedCheckRef.current.time) / 1000;
        if (elapsed >= 0.4) {
          const diff = receivedBytesRef.current - lastSpeedCheckRef.current.bytes;
          setSpeedMBs(diff / (1024 * 1024 * elapsed));
          lastSpeedCheckRef.current = { bytes: receivedBytesRef.current, time: now };
        }
      };

      dc.onerror = (e) => {
        console.error('P2P Receiver DataChannel error:', e);
        setStatus('error');
        setErrorMessage('Data transfer error');
      };
    };
  }, [initPeerConnection, onCompleted, sendSignaling, session]);

  const declineTransfer = useCallback(() => {
    if (session) {
      sendSignaling({
        type: 'p2p_file_reject',
        transferId: session.transferId
      });
    }
    cleanupP2P();
    onClose();
  }, [cleanupP2P, onClose, sendSignaling, session]);

  // Handle incoming signaling updates
  useEffect(() => {
    if (!incomingSignal || !session || incomingSignal.transferId !== session.transferId) return;

    const handleSignal = async () => {
      const pc = pcRef.current || initPeerConnection();

      if (incomingSignal.type === 'p2p_file_accept' && session.role === 'sender') {
        // Partner accepted! Initiate WebRTC Offer
        await initiateSenderOffer();
      } else if (incomingSignal.type === 'p2p_file_reject') {
        setStatus('cancelled');
        setErrorMessage(`${session.partnerName} declined the transfer request`);
      } else if (incomingSignal.type === 'p2p_file_cancel') {
        setStatus('cancelled');
        setErrorMessage(`${session.partnerName} cancelled the transfer`);
      } else if (incomingSignal.type === 'p2p_file_offer' && session.role === 'receiver') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp));
          await drainCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignaling({
            type: 'p2p_file_answer',
            transferId: session.transferId,
            sdp: answer
          });
        } catch (err) {
          console.error('Error handling P2P offer:', err);
        }
      } else if (incomingSignal.type === 'p2p_file_answer' && session.role === 'sender') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp));
          await drainCandidates(pc);
        } catch (err) {
          console.error('Error handling P2P answer:', err);
        }
      } else if (incomingSignal.type === 'p2p_file_ice') {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(incomingSignal.candidate));
          } catch (e) {
            console.warn('Failed to add incoming candidate:', e);
          }
        } else {
          pendingCandidatesRef.current.push(incomingSignal.candidate);
        }
      }
    };

    handleSignal();
  }, [drainCandidates, incomingSignal, initPeerConnection, initiateSenderOffer, sendSignaling, session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupP2P();
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [cleanupP2P, downloadUrl]);

  if (!session) return null;

  const percent = session.fileSize > 0 
    ? Math.min(100, Math.round((progressBytes / session.fileSize) * 100)) 
    : 0;

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div 
        className="bg-[var(--card)] border border-[var(--line)] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[var(--text)] flex items-center gap-1.5">
                <span>P2P Direct Transfer</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Zero Server Limit
                </span>
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {session.role === 'sender' ? `Sending to @${session.partnerName}` : `Receiving from @${session.partnerName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (status === 'transferring') {
                if (window.confirm('Transfer in progress. Are you sure you want to cancel?')) {
                  declineTransfer();
                }
              } else {
                declineTransfer();
              }
            }}
            className="w-8 h-8 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Card Preview */}
        <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--hover)]/30 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--input)] border border-[var(--line)] flex items-center justify-center shrink-0">
            {getFileIcon(session.fileType, session.fileName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--text)] truncate" title={session.fileName}>
              {session.fileName}
            </p>
            <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
              {formatBytes(session.fileSize)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {session.role === 'sender' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                <ArrowUpRight className="w-3.5 h-3.5" /> Direct Send
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                <ArrowDownLeft className="w-3.5 h-3.5" /> Direct Receive
              </span>
            )}
          </div>
        </div>

        {/* Body Status Content */}
        {status === 'waiting_accept' && session.role === 'sender' && (
          <div className="py-4 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-[var(--muted)]">
              Waiting for <span className="font-bold text-[var(--text)]">@{session.partnerName}</span> to accept the transfer request...
            </p>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Both devices must keep this tab open during peer-to-peer streaming.
            </p>
          </div>
        )}

        {status === 'waiting_accept' && session.role === 'receiver' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-xs text-cyan-300/90 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-cyan-200">Encrypted P2P Connection:</span> This file will transfer directly from <span className="font-semibold text-white">@{session.partnerName}</span>'s device to yours via WebRTC without touching the cloud.
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={declineTransfer}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={acceptIncomingTransfer}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-950/40 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Accept & Download</span>
              </button>
            </div>
          </div>
        )}

        {status === 'connecting' && (
          <div className="py-4 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-[var(--text)] font-semibold">
              Establishing direct peer-to-peer encrypted channel...
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              Negotiating WebRTC ICE candidates and DTLS session.
            </p>
          </div>
        )}

        {status === 'transferring' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Transferring direct...
              </span>
              <span className="font-mono font-bold text-amber-400">{percent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-[var(--input)] overflow-hidden border border-[var(--line)]">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-150 ease-out rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-[var(--muted)] font-mono">
              <span>{formatBytes(progressBytes)} / {formatBytes(session.fileSize)}</span>
              <span>{speedMBs.toFixed(1)} MB/s</span>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className="py-2 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-400">Transfer Completed Successfully!</h4>
              <p className="text-xs text-[var(--muted)]">
                {session.role === 'sender'
                  ? `Successfully sent ${session.fileName} directly to @${session.partnerName}.`
                  : `Successfully downloaded ${session.fileName} to your device.`}
              </p>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={session.fileName}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all active:scale-95 shadow-md shadow-emerald-950/30"
              >
                <Download className="w-4 h-4" />
                <span>Save File Again</span>
              </a>
            )}
            <div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {(status === 'cancelled' || status === 'error') && (
          <div className="py-2 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-400">
                {status === 'cancelled' ? 'Transfer Cancelled' : 'Transfer Failed'}
              </h4>
              <p className="text-xs text-[var(--muted)]">
                {errorMessage || 'Direct peer-to-peer connection was closed.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl text-xs font-semibold text-[var(--text)] bg-[var(--input)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-[10px] text-[var(--muted)] border-t border-[var(--line)]/50 pt-3 flex items-center justify-between">
          <span>End-to-End Encrypted (DTLS/SCTP)</span>
          <span className="text-amber-400 font-semibold">WebRTC DataChannel</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
