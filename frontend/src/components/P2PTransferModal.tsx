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
  Minus,
  Maximize2
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
  autoAccept?: boolean;
}

interface P2PTransferModalProps {
  session: P2PTransferSession | null;
  incomingSignal?: any;
  registerSignalHandler?: (handler: ((signal: any) => void) | null) => void;
  sendSignaling: (msg: any) => void;
  onClose: () => void;
  onCompleted?: (session: P2PTransferSession, blobUrl: string) => void;
}

const CHUNK_SIZE = 64 * 1024; // 64 KB optimal SCTP chunk size for WebRTC DataChannel
const MAX_BUFFERED_AMOUNT = 2 * 1024 * 1024; // 2 MB backpressure threshold

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ],
  iceCandidatePoolSize: 10
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
  registerSignalHandler,
  sendSignaling,
  onClose,
  onCompleted
}) => {
  const [status, setStatus] = useState<
    'waiting_accept' | 'connecting' | 'transferring' | 'completed' | 'cancelled' | 'error'
  >(session?.autoAccept ? 'connecting' : 'waiting_accept');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progressBytes, setProgressBytes] = useState<number>(0);
  const [speedMBs, setSpeedMBs] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

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
              if (session && onCompleted) onCompleted(session, '');
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

              // Auto-trigger browser download to disk
              const a = document.createElement('a');
              a.href = url;
              a.download = session.fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);

              if (onCompleted) onCompleted(session, url);
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

  // Process any incoming signaling packet directly without dropped events
  const processSignal = useCallback(async (sig: any) => {
    if (!sig || !session || sig.transferId !== session.transferId) return;

    const pc = pcRef.current || initPeerConnection();

    if (sig.type === 'p2p_file_accept' && session.role === 'sender') {
      // Partner accepted! Initiate WebRTC Offer
      await initiateSenderOffer();
    } else if (sig.type === 'p2p_file_reject') {
      setStatus('cancelled');
      setErrorMessage(`${session.partnerName} declined the transfer request`);
    } else if (sig.type === 'p2p_file_cancel') {
      setStatus('cancelled');
      setErrorMessage(`${session.partnerName} cancelled the transfer`);
    } else if (sig.type === 'p2p_file_offer' && session.role === 'receiver') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
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
    } else if (sig.type === 'p2p_file_answer' && session.role === 'sender') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
        await drainCandidates(pc);
      } catch (err) {
        console.error('Error handling P2P answer:', err);
      }
    } else if (sig.type === 'p2p_file_ice') {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
        } catch (e) {
          console.warn('Failed to add incoming candidate:', e);
        }
      } else {
        pendingCandidatesRef.current.push(sig.candidate);
      }
    }
  }, [drainCandidates, initPeerConnection, initiateSenderOffer, sendSignaling, session]);

  // Register signal handler with parent for immediate delivery
  useEffect(() => {
    if (registerSignalHandler) {
      registerSignalHandler(processSignal);
      return () => {
        registerSignalHandler(null);
      };
    }
    return undefined;
  }, [registerSignalHandler, processSignal]);

  // Fallback for incomingSignal prop
  useEffect(() => {
    if (incomingSignal) {
      processSignal(incomingSignal);
    }
  }, [incomingSignal, processSignal]);

  // Auto-accept if session requested autoAccept
  useEffect(() => {
    if (session?.role === 'receiver' && session?.autoAccept) {
      acceptIncomingTransfer();
    }
  }, [session?.role, session?.autoAccept, acceptIncomingTransfer]);

  // 25s timeout guard for connection establishment
  useEffect(() => {
    if (status === 'connecting' || (status === 'waiting_accept' && session?.role === 'receiver')) {
      const timer = setTimeout(() => {
        if (status === 'connecting' || status === 'waiting_accept') {
          const name = session?.partnerName || 'peer';
          setStatus('error');
          setErrorMessage('Peer device connection timed out. In direct P2P mode, both devices must be active simultaneously. Ask @' + name + ' to keep the app open, or use Standard Media Upload (📸) for 24/7 cloud availability.');
        }
      }, 25000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, session?.role, session?.partnerName]);

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

  if (isMinimized) {
    return createPortal(
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-4 z-[999999] bg-[#061215]/95 border-2 border-teal-500/50 shadow-[0_0_35px_rgba(20,184,166,0.5)] rounded-2xl p-3 flex items-center gap-3 backdrop-blur-md cursor-pointer animate-slide-up text-white max-w-xs hover:border-teal-400 transition-all active:scale-95 select-none"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/50 flex items-center justify-center text-teal-300 shrink-0">
          <Zap className="w-4 h-4 fill-current animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{session.fileName}</p>
          <p className="text-[10px] text-teal-400/80 font-medium truncate">
            {status === 'transferring' ? `${percent}% • ${speedMBs.toFixed(1)} MB/s` : status === 'waiting_accept' ? 'Waiting for peer...' : status === 'completed' ? 'Completed' : 'Connecting...'}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
          className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0"
          title="Expand"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in"
    >
      <div 
        className="relative bg-gradient-to-br from-[#061215] via-[#091b22] to-[#040c0e] border border-teal-500/30 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {session.role === 'sender' ? 'Sending File' : 'Receiving File'}
              </h3>
              <p className="text-xs text-slate-400">
                @{session.partnerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (status === 'transferring') {
                  if (window.confirm('Cancel file transfer?')) {
                    declineTransfer();
                  }
                } else {
                  declineTransfer();
                }
              }}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
              aria-label="Close"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Card Preview */}
        <div className="relative p-4 rounded-2xl border border-white/10 bg-black/60 flex items-center gap-3.5 backdrop-blur-md">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center shrink-0">
            {getFileIcon(session.fileType, session.fileName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate" title={session.fileName}>
              {session.fileName}
            </p>
            <p className="text-xs text-teal-300 font-mono font-medium mt-0.5">
              {formatBytes(session.fileSize)}
            </p>
          </div>
        </div>

        {/* Body Status Content */}
        {status === 'waiting_accept' && session.role === 'sender' && (
          <div className="py-5 text-center space-y-2.5 bg-black/40 rounded-2xl border border-white/5">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-200 font-medium">
              Waiting for @{session.partnerName} to accept...
            </p>
          </div>
        )}

        {status === 'waiting_accept' && session.role === 'receiver' && (
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={declineTransfer}
                className="flex-1 py-3 px-4 rounded-2xl border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={acceptIncomingTransfer}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 text-xs font-bold transition-all shadow-[0_0_20px_rgba(45,212,191,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}

        {status === 'connecting' && (
          <div className="py-6 text-center space-y-2.5 bg-black/40 rounded-2xl border border-white/5">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-200 font-medium">
              Connecting...
            </p>
          </div>
        )}

        {status === 'transferring' && (
          <div className="space-y-3.5 p-4 rounded-2xl bg-black/50 border border-teal-500/20">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {session.role === 'sender' ? 'Sending...' : 'Downloading...'}
              </span>
              <span className="font-mono font-bold text-teal-300 text-sm">{percent}%</span>
            </div>

            {/* Glowing Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-teal-500/30 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 transition-all duration-150 ease-out rounded-full shadow-[0_0_10px_rgba(45,212,191,0.8)]"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
              <span className="text-slate-300">{formatBytes(progressBytes)} / {formatBytes(session.fileSize)}</span>
              <span className="text-teal-300 font-medium bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                {speedMBs.toFixed(1)} MB/s
              </span>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className="py-2 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-400">
                {session.role === 'sender' ? 'File Sent!' : 'File Downloaded!'}
              </h4>
              <p className="text-xs text-slate-300 truncate max-w-xs mx-auto">
                {session.fileName}
              </p>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={session.fileName}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all active:scale-95 shadow-md shadow-emerald-950/30"
              >
                <Download className="w-4 h-4" />
                <span>Save to Device</span>
              </a>
            )}
            <div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/10 transition-colors cursor-pointer"
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
      </div>
    </div>,
    document.body
  );
};
