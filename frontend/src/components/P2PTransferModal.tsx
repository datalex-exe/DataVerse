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
const RELAY_CHUNK_SIZE = 32 * 1024; // 32 KB chunk size for fallback relay

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
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

  const statusRef = useRef(status);
  statusRef.current = status;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const isDataChannelOpenRef = useRef<boolean>(false);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const lastSpeedCheckRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: Date.now() });
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isAbortedRef = useRef<boolean>(false);
  const isOfferInitiatedRef = useRef<boolean>(false);
  const isCompletedRef = useRef<boolean>(false);
  const isDataChannelBoundRef = useRef<boolean>(false);
  const isRelayActiveRef = useRef<boolean>(false);
  const processedSignalsRef = useRef<Set<string>>(new Set());

  // Timers
  const fallbackTimerRef = useRef<any>(null);
  const acceptRetryTimerRef = useRef<any>(null);
  const offerRetryTimerRef = useRef<any>(null);

  const clearAllTimers = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (acceptRetryTimerRef.current) {
      clearInterval(acceptRetryTimerRef.current);
      acceptRetryTimerRef.current = null;
    }
    if (offerRetryTimerRef.current) {
      clearInterval(offerRetryTimerRef.current);
      offerRetryTimerRef.current = null;
    }
  }, []);

  const cleanupP2P = useCallback(() => {
    isAbortedRef.current = true;
    clearAllTimers();
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch {}
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
  }, [clearAllTimers]);

  // Finalize receiving file and trigger disk download
  const finalizeTransfer = useCallback(() => {
    if (isCompletedRef.current || !session) return;
    isCompletedRef.current = true;
    clearAllTimers();

    const blob = new Blob(receivedChunksRef.current, { type: session.fileType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setStatus('completed');
    setProgressBytes(session.fileSize);

    // Auto-trigger browser download to disk
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = session.fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch {}
      }, 1000);
    } catch (e) {
      console.warn('Auto-download trigger error:', e);
    }

    if (onCompleted) onCompleted(session, url);
  }, [clearAllTimers, onCompleted, session]);

  // WebSocket High-Speed Chunk Relay Fallback (Guarantees transfer even behind symmetric NAT)
  const startWebSocketRelayStreaming = useCallback((file: File) => {
    if (isAbortedRef.current || isCompletedRef.current || isRelayActiveRef.current || !session) return;
    isRelayActiveRef.current = true;
    clearAllTimers();

    // Close any pending or open DataChannel so chunks never mix
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch {}
      dataChannelRef.current = null;
    }

    console.log('[P2P] WebRTC direct path bypassed; activating high-speed WebSocket relay stream');
    setStatus('transferring');

    sendSignaling({
      type: 'p2p_file_relay_start',
      transferId: session.transferId,
      partnerId: session.partnerId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    let offset = 0;
    const totalSize = file.size;
    let lastTime = Date.now();
    let lastBytes = 0;

    const readAndSendChunk = () => {
      if (isAbortedRef.current || isCompletedRef.current) return;
      if (offset >= totalSize) {
        sendSignaling({
          type: 'p2p_file_relay_complete',
          transferId: session.transferId,
          partnerId: session.partnerId
        });
        const localUrl = session?.file ? URL.createObjectURL(session.file) : '';
        setStatus('completed');
        setProgressBytes(totalSize);
        if (session && onCompleted) onCompleted(session, localUrl);
        return;
      }

      const slice = file.slice(offset, offset + RELAY_CHUNK_SIZE);
      const reader = new FileReader();
      reader.onload = () => {
        if (isAbortedRef.current || isCompletedRef.current) return;
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Chunk = window.btoa(binary);

        offset += arrayBuffer.byteLength;
        setProgressBytes(Math.min(offset, totalSize));

        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed >= 0.4) {
          const diffBytes = offset - lastBytes;
          setSpeedMBs(diffBytes / (1024 * 1024 * elapsed));
          lastTime = now;
          lastBytes = offset;
        }

        const isLast = offset >= totalSize;
        sendSignaling({
          type: 'p2p_file_relay_chunk',
          transferId: session.transferId,
          partnerId: session.partnerId,
          chunk: base64Chunk,
          offset,
          totalSize,
          isLast
        });

        if (isLast) {
          const localUrl = session?.file ? URL.createObjectURL(session.file) : '';
          setStatus('completed');
          setProgressBytes(totalSize);
          if (session && onCompleted) onCompleted(session, localUrl);
        } else {
          // Pace transmissions slightly (6ms) so WebSocket message buffer stays lean
          setTimeout(readAndSendChunk, 6);
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    readAndSendChunk();
  }, [clearAllTimers, onCompleted, sendSignaling, session]);

  // Sender file streaming routine over direct RTCDataChannel
  const startFileStreaming = useCallback((dc: RTCDataChannel, file: File) => {
    if (isAbortedRef.current || isCompletedRef.current || isRelayActiveRef.current) return;
    setStatus('transferring');
    clearAllTimers();
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
            setProgressBytes(Math.min(offset, totalSize));

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
              // Wait for bufferedAmount to drain completely before sending EOF and marking completed
              const checkDrainAndComplete = () => {
                if (dc.bufferedAmount > 0) {
                  dc.onbufferedamountlow = () => {
                    dc.onbufferedamountlow = null;
                    checkDrainAndComplete();
                  };
                  // Safety timer in case onbufferedamountlow does not trigger
                  setTimeout(checkDrainAndComplete, 150);
                  return;
                }
                try {
                  dc.send(JSON.stringify({ type: 'p2p_file_complete' }));
                } catch {}
                setStatus('completed');
                setProgressBytes(totalSize);
                const localUrl = session?.file ? URL.createObjectURL(session.file) : '';
                if (session && onCompleted) onCompleted(session, localUrl);
              };
              checkDrainAndComplete();
            } else {
              sendNextChunk();
            }
          } catch (err: any) {
            console.error('Data channel send error:', err);
            // Fallback to relay if data channel fails mid-stream
            if (session?.file && !isRelayActiveRef.current) {
              startWebSocketRelayStreaming(session.file);
            } else {
              setStatus('error');
              setErrorMessage('Data channel transfer interrupted');
            }
          }
        };
        reader.readAsArrayBuffer(slice);
        return;
      }
    };

    sendNextChunk();
  }, [clearAllTimers, onCompleted, session, startWebSocketRelayStreaming]);

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
          partnerId: session.partnerId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[P2P] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearAllTimers();
      } else if (pc.iceConnectionState === 'failed') {
        console.warn('[P2P] ICE failed; switching to relay fallback');
        if (session?.role === 'sender' && session?.file && !isRelayActiveRef.current) {
          startWebSocketRelayStreaming(session.file);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        if (statusRef.current !== 'completed' && !isAbortedRef.current && !isCompletedRef.current) {
          if (session?.role === 'sender' && session?.file && !isRelayActiveRef.current) {
            startWebSocketRelayStreaming(session.file);
          }
        }
      }
    };

    return pc;
  }, [clearAllTimers, sendSignaling, session, startWebSocketRelayStreaming]);

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

  // Sender initial offer dispatch after peer accepts
  const initiateSenderOffer = useCallback(async () => {
    if (!session || !session.file || isOfferInitiatedRef.current) return;
    isOfferInitiatedRef.current = true;
    setStatus('connecting');

    const pc = initPeerConnection();
    const dc = pc.createDataChannel('p2p_file_transfer', { ordered: true });
    dc.binaryType = 'arraybuffer';
    dataChannelRef.current = dc;

    dc.onopen = () => {
      if (isAbortedRef.current || isCompletedRef.current || isRelayActiveRef.current) {
        return;
      }
      console.log('[P2P] WebRTC DataChannel OPEN! Streaming direct P2P...');
      isDataChannelOpenRef.current = true;
      clearAllTimers();
      if (session.file) {
        startFileStreaming(dc, session.file);
      }
    };

    dc.onerror = (e) => {
      console.error('P2P Sender DataChannel error:', e);
      if (session.file && !isRelayActiveRef.current) {
        startWebSocketRelayStreaming(session.file);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignaling({
        type: 'p2p_file_offer',
        transferId: session.transferId,
        partnerId: session.partnerId,
        sdp: offer
      });

      // Retry sending offer if no answer within 2.5s and DC not open
      let offerRetries = 0;
      offerRetryTimerRef.current = setInterval(() => {
        if (!isDataChannelOpenRef.current && statusRef.current === 'connecting' && offerRetries < 3) {
          offerRetries++;
          console.log('[P2P] Retrying p2p_file_offer attempt', offerRetries);
          sendSignaling({
            type: 'p2p_file_offer',
            transferId: session.transferId,
            partnerId: session.partnerId,
            sdp: offer
          });
        } else {
          if (offerRetryTimerRef.current) {
            clearInterval(offerRetryTimerRef.current);
            offerRetryTimerRef.current = null;
          }
        }
      }, 2500);

      // 4.5s fallback timer: if WebRTC DataChannel has not opened, stream via relay
      fallbackTimerRef.current = setTimeout(() => {
        if (!isDataChannelOpenRef.current && !isCompletedRef.current && !isAbortedRef.current && !isRelayActiveRef.current) {
          console.log('[P2P] Direct WebRTC connection negotiation pending; activating relay fallback');
          if (session.file) {
            startWebSocketRelayStreaming(session.file);
          }
        }
      }, 4500);

    } catch (err: any) {
      console.error('Error creating P2P offer:', err);
      if (session.file && !isRelayActiveRef.current) {
        startWebSocketRelayStreaming(session.file);
      }
    }
  }, [clearAllTimers, initPeerConnection, sendSignaling, session, startFileStreaming, startWebSocketRelayStreaming]);

  // Receiver setup
  const acceptIncomingTransfer = useCallback(async () => {
    if (!session) return;
    setStatus('connecting');
    sendSignaling({
      type: 'p2p_file_accept',
      transferId: session.transferId,
      partnerId: session.partnerId
    });

    // Retry sending accept if no offer is received within 2s
    let acceptRetries = 0;
    acceptRetryTimerRef.current = setInterval(() => {
      if (statusRef.current === 'connecting' && !isDataChannelOpenRef.current && !isRelayActiveRef.current && acceptRetries < 3) {
        acceptRetries++;
        console.log('[P2P] Retrying p2p_file_accept attempt', acceptRetries);
        sendSignaling({
          type: 'p2p_file_accept',
          transferId: session.transferId,
          partnerId: session.partnerId
        });
      } else {
        if (acceptRetryTimerRef.current) {
          clearInterval(acceptRetryTimerRef.current);
          acceptRetryTimerRef.current = null;
        }
      }
    }, 2000);

    const pc = initPeerConnection();

    pc.ondatachannel = (event) => {
      if (isDataChannelBoundRef.current) return;
      isDataChannelBoundRef.current = true;
      isDataChannelOpenRef.current = true;
      clearAllTimers();

      const dc = event.channel;
      dc.binaryType = 'arraybuffer';
      dataChannelRef.current = dc;
      setStatus('transferring');

      receivedChunksRef.current = [];
      receivedBytesRef.current = 0;
      lastSpeedCheckRef.current = { bytes: 0, time: Date.now() };

      dc.onmessage = (e) => {
        if (isRelayActiveRef.current || isCompletedRef.current || isAbortedRef.current) return;

        if (typeof e.data === 'string') {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.type === 'p2p_file_complete') {
              finalizeTransfer();
              return;
            }
          } catch {}
          return;
        }

        // Binary array buffer chunk
        const buffer = e.data as ArrayBuffer;
        receivedChunksRef.current.push(buffer);
        receivedBytesRef.current += buffer.byteLength;
        setProgressBytes(Math.min(receivedBytesRef.current, session.fileSize));

        const now = Date.now();
        const elapsed = (now - lastSpeedCheckRef.current.time) / 1000;
        if (elapsed >= 0.4) {
          const diff = receivedBytesRef.current - lastSpeedCheckRef.current.bytes;
          setSpeedMBs(diff / (1024 * 1024 * elapsed));
          lastSpeedCheckRef.current = { bytes: receivedBytesRef.current, time: now };
        }

        // Auto-finalize as soon as all expected bytes have arrived!
        if (session.fileSize > 0 && receivedBytesRef.current >= session.fileSize) {
          finalizeTransfer();
        }
      };

      dc.onerror = (e) => {
        console.error('P2P Receiver DataChannel error:', e);
        if (!isCompletedRef.current && !isRelayActiveRef.current) {
          setStatus('error');
          setErrorMessage('Data transfer error');
        }
      };
    };
  }, [clearAllTimers, finalizeTransfer, initPeerConnection, sendSignaling, session]);

  const declineTransfer = useCallback(() => {
    if (session) {
      sendSignaling({
        type: 'p2p_file_reject',
        transferId: session.transferId,
        partnerId: session.partnerId
      });
    }
    cleanupP2P();
    onClose();
  }, [cleanupP2P, onClose, sendSignaling, session]);

  // Process any incoming signaling packet directly without dropped events
  const processSignal = useCallback(async (sig: any) => {
    if (!sig || !session || sig.transferId !== session.transferId) return;

    // Deduplicate critical signals so they never run twice
    const sigKey = `${sig.type}_${sig.transferId}`;
    if (sig.type === 'p2p_file_accept' || sig.type === 'p2p_file_offer' || sig.type === 'p2p_file_answer' || sig.type === 'p2p_file_relay_start') {
      if (processedSignalsRef.current.has(sigKey)) return;
      processedSignalsRef.current.add(sigKey);
    }

    const pc = pcRef.current || initPeerConnection();

    if (sig.type === 'p2p_file_accept' && session.role === 'sender') {
      console.log('[P2P] Peer accepted transfer; initiating offer');
      await initiateSenderOffer();
    } else if (sig.type === 'p2p_file_reject') {
      clearAllTimers();
      setStatus('cancelled');
      setErrorMessage(`${session.partnerName} declined the transfer request`);
    } else if (sig.type === 'p2p_file_cancel') {
      clearAllTimers();
      setStatus('cancelled');
      setErrorMessage(`${session.partnerName} cancelled the transfer`);
    } else if (sig.type === 'p2p_file_offer' && session.role === 'receiver') {
      try {
        console.log('[P2P] Receiver got offer; creating answer');
        await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
        await drainCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignaling({
          type: 'p2p_file_answer',
          transferId: session.transferId,
          partnerId: session.partnerId,
          sdp: answer
        });
      } catch (err) {
        console.error('Error handling P2P offer:', err);
      }
    } else if (sig.type === 'p2p_file_answer' && session.role === 'sender') {
      try {
        console.log('[P2P] Sender got answer; setting remote description');
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
    } else if (sig.type === 'p2p_file_relay_start' && session.role === 'receiver') {
      // Sender activated relay mode; disconnect data channel to prevent chunk collision
      isRelayActiveRef.current = true;
      clearAllTimers();
      if (dataChannelRef.current) {
        try { dataChannelRef.current.close(); } catch {}
        dataChannelRef.current = null;
      }
      setStatus('transferring');
      receivedChunksRef.current = [];
      receivedBytesRef.current = 0;
      lastSpeedCheckRef.current = { bytes: 0, time: Date.now() };
    } else if (sig.type === 'p2p_file_relay_chunk' && session.role === 'receiver') {
      if (isCompletedRef.current) return;
      isRelayActiveRef.current = true;
      setStatus('transferring');

      // Decode base64 chunk
      const binaryString = window.atob(sig.chunk);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      receivedChunksRef.current.push(bytes.buffer);
      receivedBytesRef.current += bytes.buffer.byteLength;
      setProgressBytes(Math.min(receivedBytesRef.current, session.fileSize));

      const now = Date.now();
      const elapsed = (now - lastSpeedCheckRef.current.time) / 1000;
      if (elapsed >= 0.4) {
        const diff = receivedBytesRef.current - lastSpeedCheckRef.current.bytes;
        setSpeedMBs(diff / (1024 * 1024 * elapsed));
        lastSpeedCheckRef.current = { bytes: receivedBytesRef.current, time: now };
      }

      if (sig.isLast || (session.fileSize > 0 && receivedBytesRef.current >= session.fileSize)) {
        finalizeTransfer();
      }
    } else if (sig.type === 'p2p_file_relay_complete' && session.role === 'receiver') {
      finalizeTransfer();
    }
  }, [clearAllTimers, drainCandidates, finalizeTransfer, initPeerConnection, initiateSenderOffer, sendSignaling, session]);

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

  // Fallback for incomingSignal ONLY if registerSignalHandler is not provided
  useEffect(() => {
    if (!registerSignalHandler && incomingSignal) {
      processSignal(incomingSignal);
    }
  }, [incomingSignal, processSignal, registerSignalHandler]);

  // Auto-accept if session requested autoAccept
  useEffect(() => {
    if (session?.role === 'receiver' && session?.autoAccept) {
      acceptIncomingTransfer();
    }
  }, [session?.role, session?.autoAccept, acceptIncomingTransfer]);

  // 35s global safety guard: if still not transferring or completed after 35s
  useEffect(() => {
    if (status === 'connecting' || (status === 'waiting_accept' && session?.role === 'receiver')) {
      const timer = setTimeout(() => {
        if (statusRef.current === 'connecting' || statusRef.current === 'waiting_accept') {
          const name = session?.partnerName || 'peer';
          setStatus('error');
          setErrorMessage(`Connection timed out. Ask @${name} to keep the app open, or use Standard Media Upload for cloud storage.`);
        }
      }, 35000);
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
