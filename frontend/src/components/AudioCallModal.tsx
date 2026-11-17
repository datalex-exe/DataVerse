import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  ShieldCheck, 
  Video, 
  VideoOff, 
  SwitchCamera,
  User as UserIcon 
} from 'lucide-react';

export interface CallState {
  status: 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';
  callId?: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  isCaller: boolean;
  callType?: 'audio' | 'video';
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
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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

export const AudioCallModal: React.FC<AudioCallModalProps> = ({
  call,
  onEndCall,
  sendSignaling,
  incomingSignal
}) => {
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasRemoteVideo, setHasRemoteVideo] = useState<boolean>(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const isVideoCall = call?.callType === 'video';

  // Drain queued candidates once remote description is set
  const drainPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (pendingCandidatesRef.current.length > 0) {
      const candidates = [...pendingCandidatesRef.current];
      pendingCandidatesRef.current = [];
      for (const cand of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('Failed to add queued ice candidate:', e);
        }
      }
    }
  }, []);

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
    pendingCandidatesRef.current = [];
    setHasRemoteVideo(false);
  }, []);

  // Initialize peer connection and local media stream
  const setupPeerConnection = useCallback(async () => {
    try {
      let stream: MediaStream;
      if (isVideoCall) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch (videoErr) {
          console.warn('Camera request failed, falling back to audio only:', videoErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      localStreamRef.current = stream;

      // Attach local stream to local preview video
      if (localVideoRef.current && isVideoCall) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(e => console.warn('Local video play error:', e));
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local media tracks to peer connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Receive remote media tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          
          if (remoteVideoRef.current && isVideoCall) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.warn('Remote video play auto failed:', e));
            setHasRemoteVideo(true);
          }

          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(e => console.warn('Remote audio play auto failed:', e));
          }
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
      console.error('Failed to get user media for call:', err);
      onEndCall();
      return null;
    }
  }, [call, isVideoCall, facingMode, sendSignaling, onEndCall]);

  // Bind local preview when local stream becomes available
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && isVideoCall) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [isVideoCall, call?.status]);

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
        callType: call.callType || 'audio',
        sdp: offer
      });
    })();

    return () => { isDone = true; };
  }, [call?.callId, call?.isCaller, call?.status, call?.callType, sendSignaling, setupPeerConnection]);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!incomingSignal) return;

    (async () => {
      if (incomingSignal.type === 'call_end' || incomingSignal.type === 'call_reject') {
        cleanupCall();
        onEndCall();
        return;
      }

      const pc = pcRef.current;

      if (incomingSignal.type === 'webrtc_answer') {
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp));
          await drainPendingCandidates(pc);
        }
      } else if (incomingSignal.type === 'webrtc_ice') {
        if (incomingSignal.candidate) {
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(incomingSignal.candidate));
            } catch (_) {}
          } else {
            pendingCandidatesRef.current.push(incomingSignal.candidate);
          }
        }
      }
    })();
  }, [incomingSignal, cleanupCall, onEndCall, drainPendingCandidates]);

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

  // Lock body scroll while in a call modal
  useEffect(() => {
    if (!call || call.status === 'idle') return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [call?.status]);

  if (!call || call.status === 'idle') return null;

  const handleAcceptCall = async () => {
    const pc = await setupPeerConnection();
    if (!pc) return;

    if (incomingSignal && incomingSignal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp));
      await drainPendingCandidates(pc);
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

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getVideoTracks();
      if (tracks.length > 0) {
        const nextState = !tracks[0].enabled;
        tracks.forEach(t => t.enabled = nextState);
        setIsVideoOff(!nextState);
      }
    }
  };

  const flipCamera = async () => {
    if (!localStreamRef.current || !isVideoCall) return;
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (pcRef.current && oldVideoTrack) {
        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      localStreamRef.current.addTrack(newVideoTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setFacingMode(newFacingMode);
    } catch (err) {
      console.warn('Failed to switch camera mode:', err);
    }
  };

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: VIDEO CALL VIEW (Connected Mode)
  // ──────────────────────────────────────────────────────────────────────────
  if (isVideoCall && call.status === 'connected') {
    return createPortal(
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-xl animate-fade-in select-none overscroll-none">
        <audio ref={remoteAudioRef} autoPlay />

        <div className="relative w-full max-w-4xl h-[92vh] sm:h-[80vh] max-h-[820px] bg-[#030608] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
          
          {/* Main Remote Video Stream (Full Cover) */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover z-0" 
          />

          {/* Remote Video Fallback Placeholder (when remote hasn't sent frames yet) */}
          {!hasRemoteVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#09171a] via-[#04080a] to-[#020304] z-[1]">
              <div className="w-28 h-28 rounded-full bg-slate-900 border-2 border-teal-500/30 overflow-hidden flex items-center justify-center shadow-2xl mb-4">
                {call.partnerAvatar ? (
                  <img src={`/api/media/file/${call.partnerAvatar}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-teal-400">
                    {call.partnerName.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{call.partnerName}</h3>
              <p className="text-xs text-teal-400/80 font-medium mt-1 animate-pulse">Connecting video feed...</p>
            </div>
          )}

          {/* Floating Self Camera View (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 z-20 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-2xl bg-slate-950/90 backdrop-blur-md">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${isVideoOff ? 'hidden' : 'block'}`} 
            />
            {isVideoOff && (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 p-2 bg-slate-950">
                <VideoOff className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-400">Camera Off</span>
              </div>
            )}
            <span className="absolute bottom-2 left-2 text-[9px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur px-2 py-0.5 rounded-md text-white">
              You
            </span>
          </div>

          {/* Top Floating Info Bar */}
          <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 bg-slate-950/70 border border-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg">
              <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                {call.partnerAvatar ? (
                  <img src={`/api/media/file/${call.partnerAvatar}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-teal-400" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">{call.partnerName}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{formatCallTime(duration)}</span>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-teal-300 bg-teal-500/15 border border-teal-500/30 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted Video Call</span>
            </div>
          </div>

          {/* Bottom Floating Control Dock */}
          <div className="relative z-10 p-5 sm:p-6 flex items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/80 border border-white/10 backdrop-blur-xl px-5 py-3.5 rounded-3xl shadow-2xl">
              
              {/* Mic Mute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-md ${
                  isMuted 
                    ? 'bg-rose-600/20 border border-rose-500/40 text-rose-400' 
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Camera On/Off Toggle */}
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-md ${
                  isVideoOff 
                    ? 'bg-rose-600/20 border border-rose-500/40 text-rose-400' 
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Flip Camera (Front / Back) */}
              <button
                type="button"
                onClick={flipCamera}
                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center justify-center transition-all active:scale-95 shadow-md"
                title="Flip camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={handleDeclineOrEnd}
                className="w-14 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-rose-900/30"
                title="End video call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>

            </div>
          </div>

        </div>
      </div>,
      document.body
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: AUDIO CALL VIEW & INCOMING/OUTGOING DIALOG
  // ──────────────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in select-none overscroll-none">
      <audio ref={remoteAudioRef} autoPlay />

      <div className="w-full max-w-sm rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-2xl p-7 flex flex-col items-center text-center animate-zoom relative overflow-hidden overscroll-contain">
        {/* Glow backdrop */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-[var(--accent-2)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-teal-400 mb-6 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isVideoCall ? 'Encrypted Video Call' : 'Encrypted Audio Call'}</span>
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
              {isVideoCall ? 'Starting Video Call...' : 'Calling...'}
            </p>
          )}
          {call.status === 'incoming' && (
            <p className="text-xs text-teal-400 font-semibold animate-pulse">
              {isVideoCall ? 'Incoming Video Call...' : 'Incoming Audio Call'}
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

        {/* Audio Waveform Effect when connected in Audio mode */}
        {call.status === 'connected' && !isVideoCall && (
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
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              title="Accept"
            >
              {isVideoCall ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleMute}
              disabled={call.status !== 'connected'}
              className={`w-12 h-12 rounded-full border border-[var(--line)] flex items-center justify-center transition-all active:scale-95 ${
                isMuted 
                  ? 'bg-rose-600/20 border-rose-500/40 text-rose-400' 
                  : 'bg-[var(--input)] hover:bg-[var(--hover)] text-[var(--text)]'
              } ${call.status !== 'connected' ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
