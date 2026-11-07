import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, ShieldCheck } from 'lucide-react';

export interface CallState {
  status: 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';
  callId?: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  isCaller: boolean;
}

interface AudioCallModalProps {
  call: CallState | null;
  onEndCall: () => void;
  sendSignaling: (msg: any) => void;
  incomingSignal?: any;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const AudioCallModal: React.FC<AudioCallModalProps> = ({
  call,
  onEndCall,
  sendSignaling,
  incomingSignal
}) => {
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Clean cleanup of media streams and peer connection
  const cleanupCall = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // Initialize peer connection and local audio stream
  const setupPeerConnection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local audio tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Receive remote audio
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(e => console.warn('Audio play auto failed:', e));
        }
      };

      // Candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && call) {
          sendSignaling({
            type: 'webrtc_ice',
            callId: call.callId,
            candidate: event.candidate
          });
        }
      };

      return pc;
    } catch (err) {
      console.error('Failed to get user audio media:', err);
      onEndCall();
      return null;
    }
  }, [call, sendSignaling, onEndCall]);

  // Handle Caller initiation
  useEffect(() => {
    if (!call || !call.isCaller || call.status !== 'outgoing') return;

    let isDone = false;
    (async () => {
      const pc = await setupPeerConnection();
      if (!pc || isDone) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignaling({
        type: 'call_request',
        callId: call.callId,
        sdp: offer
      });
    })();

    return () => { isDone = true; };
  }, [call?.callId, call?.isCaller, call?.status]);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!incomingSignal || !pcRef.current) return;

    (async () => {
      const pc = pcRef.current;
      if (!pc) return;

      if (incomingSignal.type === 'call_accept') {
        // Callee accepted, wait for answer SDP if sent
      } else if (incomingSignal.type === 'webrtc_answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp));
        }
      } else if (incomingSignal.type === 'webrtc_ice') {
        if (incomingSignal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(incomingSignal.candidate));
          } catch (_) {}
        }
      } else if (incomingSignal.type === 'call_end' || incomingSignal.type === 'call_reject') {
        cleanupCall();
        onEndCall();
      }
    })();
  }, [incomingSignal, cleanupCall, onEndCall]);

  // Duration timer when connected
  useEffect(() => {
    if (call?.status === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call?.status]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  if (!call || call.status === 'idle') return null;

  const handleAcceptCall = async () => {
    const pc = await setupPeerConnection();
    if (!pc) return;

    if (incomingSignal && incomingSignal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignaling({
        type: 'webrtc_answer',
        callId: call.callId,
        sdp: answer
      });
    }

    sendSignaling({
      type: 'call_accept',
      callId: call.callId
    });
  };

  const handleDeclineOrEnd = () => {
    sendSignaling({
      type: call.status === 'incoming' ? 'call_reject' : 'call_end',
      callId: call.callId
    });
    cleanupCall();
    onEndCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in select-none">
      <audio ref={remoteAudioRef} autoPlay />

      <div className="w-full max-w-sm rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-2xl p-7 flex flex-col items-center text-center animate-zoom relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-[var(--accent-2)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-teal-400 mb-6 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted Audio Call</span>
        </div>

        {/* Partner Avatar with Pulse Ring */}
        <div className="relative mb-4">
          <div className={`w-24 h-24 rounded-full bg-[var(--input)] border-2 border-[var(--accent-2)]/40 overflow-hidden flex items-center justify-center shadow-xl ${
            call.status === 'connected' ? 'animate-pulse' : call.status === 'outgoing' || call.status === 'incoming' ? 'ring-8 ring-teal-500/20 animate-bounce' : ''
          }`}>
            {call.partnerAvatar ? (
              <img src={`/api/media/file/${call.partnerAvatar}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-[var(--accent-2)]">
                {call.partnerName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          {call.status === 'connected' && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--card)]" />
          )}
        </div>

        <h3 className="text-lg font-bold text-[var(--text)] tracking-tight">
          {call.partnerName}
        </h3>

        {/* Call Status Label / Duration */}
        <div className="mt-1 mb-8">
          {call.status === 'outgoing' && (
            <p className="text-xs text-[var(--accent-2)] font-semibold animate-pulse">
              Calling...
            </p>
          )}
          {call.status === 'incoming' && (
            <p className="text-xs text-teal-400 font-semibold animate-pulse">
              Incoming Audio Call
            </p>
          )}
          {call.status === 'connected' && (
            <div className="flex items-center gap-2 justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-sm font-mono font-bold text-emerald-400">
                {formatCallTime(duration)}
              </p>
            </div>
          )}
        </div>

        {/* Audio Waveform Effect when connected */}
        {call.status === 'connected' && (
          <div className="flex items-center gap-1.5 h-6 mb-8">
            <span className="w-1 bg-teal-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0ms' }} />
            <span className="w-1 bg-teal-400 rounded-full animate-bounce h-5" style={{ animationDelay: '150ms' }} />
            <span className="w-1 bg-teal-400 rounded-full animate-bounce h-6" style={{ animationDelay: '300ms' }} />
            <span className="w-1 bg-teal-400 rounded-full animate-bounce h-4" style={{ animationDelay: '450ms' }} />
            <span className="w-1 bg-teal-400 rounded-full animate-bounce h-2" style={{ animationDelay: '600ms' }} />
          </div>
        )}

        {/* Call Controls */}
        {call.status === 'incoming' ? (
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleAcceptCall}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg animate-pulse active:scale-90 transition-transform"
              title="Accept"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {call.status === 'connected' && (
              <button
                type="button"
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isMuted ? 'bg-amber-500 text-white shadow-md' : 'bg-[var(--input)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]'
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
