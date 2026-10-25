import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Download,
  Zap,
  ZapOff,
  Grid,
  Clock,
  ArrowRight,
  Send,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';
import {
  CameraFacing,
  CameraMode,
  AspectRatio,
  TimerDuration,
  CameraDestinationOptions,
  CameraError,
  SocialCameraModalProps
} from './types';

// ─── Module-scoped Destination Store ─────────────────────────────────────────
// Stored strictly inside this camera module (not a global/window variable)
let activeDestinationOptions: CameraDestinationOptions | null = null;

export const setCameraDestination = (opts: CameraDestinationOptions | null) => {
  activeDestinationOptions = opts;
};

export const getCameraDestination = (): CameraDestinationOptions | null => {
  return activeDestinationOptions;
};

// ─── Helper: Get last used facing mode from localStorage ─────────────────────
const getStoredFacingMode = (): CameraFacing => {
  try {
    const saved = localStorage.getItem('dv-cam-facing');
    if (saved === 'user' || saved === 'environment') {
      return saved;
    }
  } catch {
    // Ignore storage errors in private browsing
  }
  return 'environment'; // Default to BACK camera for chat and post
};

const storeFacingMode = (facing: CameraFacing) => {
  try {
    localStorage.setItem('dv-cam-facing', facing);
  } catch {
    // Ignore storage errors
  }
};

// Helper: Best supported video mimeType
const getBestSupportedVideoMimeType = (): string => {
  const mimeTypes = [
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm'
  ];
  for (const mime of mimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
};

export const SocialCameraModal: React.FC<SocialCameraModalProps> = ({
  destination = 'post',
  conversationId,
  replyTo,
  initialMode = 'photo',
  onCapture,
  onClose,
  onGallerySelect
}) => {
  // ─── Camera & Hardware States ──────────────────────────────────────────────
  const [cameraMode, setCameraMode] = useState<CameraMode>(initialMode);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>(getStoredFacingMode);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasFirstFrame, setHasFirstFrame] = useState<boolean>(false);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);

  // ─── Tools & Options ───────────────────────────────────────────────────────
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [maxZoom, setMaxZoom] = useState<number>(5.0);
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);

  // ─── Focus & Tap Feedback ──────────────────────────────────────────────────
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [showFlashOverlay, setShowFlashOverlay] = useState<boolean>(false);

  // ─── Review & Capture States ───────────────────────────────────────────────
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0); // 0% to 100%
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startingRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const isClosedRef = useRef<boolean>(false);

  // Shutter press-and-hold & Zoom tracking
  const shutterHoldTimerRef = useRef<number | null>(null);
  const shutterStartPointerYRef = useRef<number>(0);
  const isShutterHoldingRef = useRef<boolean>(false);
  const recordStartTimeRef = useRef<number>(0);
  const recordIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Gesture tracking (pinch to zoom, double tap to flip)
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);
  const lastTapTimeRef = useRef<number>(0);

  // ─── Destination Initialization & Cleanup ──────────────────────────────────
  useEffect(() => {
    // Store destination within the module
    setCameraDestination({
      destination,
      conversationId,
      replyTo
    });

    return () => {
      // Clear destination when camera component unmounts
      setCameraDestination(null);
    };
  }, [destination, conversationId, replyTo]);

  // ─── Handle Safe Close & Back Button ───────────────────────────────────────
  const handleClose = useCallback(() => {
    if (isClosedRef.current) return;
    isClosedRef.current = true;

    // Clear destination
    setCameraDestination(null);

    // Stop all media tracks immediately so camera light turns off
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Clean up captured preview URL
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }

    // Pop browser history state if it was pushed
    if (window.history.state?.dvCameraOpen) {
      window.history.back();
    }

    onClose();
  }, [capturedPreviewUrl, onClose]);

  // Support phone & browser Back button returning to opening screen without reload
  useEffect(() => {
    window.history.pushState({ dvCameraOpen: true }, '');

    const handlePopState = () => {
      if (!isClosedRef.current) {
        isClosedRef.current = true;
        setCameraDestination(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // ─── Stop Camera Tracks Helper ─────────────────────────────────────────────
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    setIsTorchOn(false);
  }, []);

  // ─── STEP 1 & BUG 2: Initialize Camera Stream (Fast, Single Call) ──────────
  const initCamera = useCallback(
    async (facing: CameraFacing) => {
      const currentRequestId = ++requestIdRef.current;
      startingRef.current = true;
      setCameraError(null);

      // Check secure context
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setCameraError({
          type: 'insecure',
          message: 'Camera requires a secure HTTPS connection. Please access this app over HTTPS.'
        });
        startingRef.current = false;
        return;
      }

      // Check mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError({
          type: 'unsupported',
          message: 'Camera API is not supported on this browser.'
        });
        startingRef.current = false;
        return;
      }

      // Stop previous tracks before starting new camera
      stopTracks();

      try {
        let stream: MediaStream;
        try {
          // Attempt ideal high quality (1080p, 30fps)
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 }
            },
            audio: false // Only request audio when recording video starts
          });
        } catch (constraintErr: any) {
          // If 1080p is rejected (OverconstrainedError), fallback to default resolution
          if (constraintErr?.name === 'OverconstrainedError' || constraintErr?.name === 'ConstraintNotSatisfiedError') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: facing }
              },
              audio: false
            });
          } else {
            throw constraintErr;
          }
        }

        // Stale check: if another request won while this was pending, drop this stream
        if (currentRequestId !== requestIdRef.current || isClosedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Inspect hardware capabilities (torch, zoom)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const caps = (videoTrack.getCapabilities?.() || {}) as any;
            setIsTorchSupported(Boolean(caps.torch));
            if (caps.zoom) {
              setMaxZoom(caps.zoom.max || 5.0);
            }
          } catch {
            // Capabilities inspection not critical
          }
        }

        // Attach stream directly to plain <video> element (no canvas pipeline)
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch (playErr) {
            console.warn('Video play interrupted or prevented:', playErr);
          }
        }
      } catch (err: any) {
        if (currentRequestId !== requestIdRef.current) return;

        console.error('Camera getUserMedia error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError({
            type: 'permission',
            message: 'Camera access was denied. Tap the lock or tune icon in your address bar to allow camera, then tap Retry.'
          });
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError({
            type: 'notfound',
            message: 'No camera hardware found on this device.'
          });
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError({
            type: 'inuse',
            message: 'Camera is currently in use by another app or browser tab. Please close other camera apps and retry.'
          });
        } else {
          setCameraError({
            type: 'unknown',
            message: err.message || 'Unable to open camera.'
          });
        }
      } finally {
        startingRef.current = false;
        setIsFlipping(false);
      }
    },
    [stopTracks]
  );

  // Initialize camera immediately on mount
  useEffect(() => {
    initCamera(cameraFacing);

    // Stop tracks when tab is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTracks();
        setHasFirstFrame(false);
      } else {
        if (!capturedPreviewUrl && !isClosedRef.current) {
          initCamera(cameraFacing);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopTracks();
    };
  }, [cameraFacing, capturedPreviewUrl, initCamera, stopTracks]);

  // ─── Flip Camera (Front / Back) ────────────────────────────────────────────
  const handleFlipCamera = useCallback(() => {
    if (startingRef.current || isRecording) return;
    setIsFlipping(true);
    setHasFirstFrame(false);

    const nextFacing: CameraFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    storeFacingMode(nextFacing);

    initCamera(nextFacing);
  }, [cameraFacing, initCamera, isRecording]);

  // ─── Torch / Flash Toggle ──────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack || !isTorchSupported) return;

    try {
      const nextState = !isTorchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch applyConstraints failed:', err);
    }
  }, [isTorchOn, isTorchSupported]);

  // ─── Tap to Focus ──────────────────────────────────────────────────────────
  const handleTapToFocus = useCallback(async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const container = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - container.left;
    const y = clientY - container.top;

    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1000);

    // Hardware focus pointsOfInterest if supported
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const normX = Math.max(0, Math.min(1, x / container.width));
        const normY = Math.max(0, Math.min(1, y / container.height));
        const caps = (videoTrack.getCapabilities?.() || {}) as any;

        if (caps.pointsOfInterest || caps.focusMode) {
          await (videoTrack as any).applyConstraints({
            advanced: [
              {
                pointsOfInterest: [{ x: normX, y: normY }],
                focusMode: 'single-shot'
              }
            ]
          });
        }
      } catch {
        // Focus constraints unsupported or failed safely
      }
    }
  }, []);

  // ─── Pinch to Zoom ─────────────────────────────────────────────────────────
  const applyHardwareZoom = useCallback(async (newZoom: number) => {
    const clamped = Math.max(1.0, Math.min(maxZoom, newZoom));
    setZoomLevel(clamped);

    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const caps = (videoTrack.getCapabilities?.() || {}) as any;
        if (caps.zoom) {
          await (videoTrack as any).applyConstraints({
            advanced: [{ zoom: clamped }]
          });
        }
      } catch {
        // Track zoom not available; CSS scale handles visual zoom
      }
    }
  }, [maxZoom]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoomLevel;
    } else if (e.touches.length === 1) {
      // Double tap to flip detection
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        handleFlipCamera();
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
        handleTapToFocus(e);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchStartDistRef.current;
      const targetZoom = pinchStartZoomRef.current * ratio;
      applyHardwareZoom(targetZoom);
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  // ─── STEP 2 & BUG 4: Capture Photo at Native Resolution ────────────────────
  const executePhotoCapture = useCallback(async () => {
    const video = videoRef.current;
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!video || !videoTrack) return;

    // Trigger white screen flash feedback
    setShowFlashOverlay(true);
    setTimeout(() => setShowFlashOverlay(false), 150);

    // Light haptic if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    let photoBlob: Blob | null = null;

    // 1. Try ImageCapture.takePhoto() first for phone native ISP processing
    if (typeof window !== 'undefined' && 'ImageCapture' in window) {
      try {
        const imageCapture = new (window as any).ImageCapture(videoTrack);
        photoBlob = await imageCapture.takePhoto();
      } catch (e) {
        console.warn('ImageCapture.takePhoto fallback to canvas:', e);
      }
    }

    // 2. Fallback: draw video at native resolution onto an offscreen canvas
    if (!photoBlob) {
      const nativeWidth = video.videoWidth || 1920;
      const nativeHeight = video.videoHeight || 1080;
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = nativeWidth;
      offscreenCanvas.height = nativeHeight;

      const ctx = offscreenCanvas.getContext('2d');
      if (ctx) {
        // Do NOT mirror photos taken with front camera (standard natural photo)
        ctx.drawImage(video, 0, 0, nativeWidth, nativeHeight);
        photoBlob = await new Promise<Blob | null>((resolve) => {
          offscreenCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
        });
      }
    }

    if (photoBlob) {
      const previewUrl = URL.createObjectURL(photoBlob);
      setCapturedBlob(photoBlob);
      setCapturedPreviewUrl(previewUrl);
    }
  }, []);

  // ─── Capture Photo with Countdown Timer ────────────────────────────────────
  const takePhoto = useCallback(() => {
    if (countdown !== null) return;

    if (timerDuration > 0) {
      setCountdown(timerDuration);
      let remaining = timerDuration;
      const interval = window.setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          clearInterval(interval);
          setCountdown(null);
          executePhotoCapture();
        }
      }, 1000);
    } else {
      executePhotoCapture();
    }
  }, [countdown, executePhotoCapture, timerDuration]);

  // ─── STEP 3 & BUG 4: Record Video with Microphone (Direct Stream) ──────────
  const startRecording = useCallback(async () => {
    if (isRecording || !streamRef.current) return;

    recordedChunksRef.current = [];
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    // Request microphone audio only when video recording starts
    let combinedStream: MediaStream;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;
      combinedStream = new MediaStream([videoTrack, ...audioStream.getAudioTracks()]);
    } catch (audioErr) {
      console.warn('Microphone access unavailable, recording muted video:', audioErr);
      combinedStream = new MediaStream([videoTrack]);
    }

    const mimeType = getBestSupportedVideoMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

    try {
      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || 'video/webm';
        const videoBlob = new Blob(recordedChunksRef.current, { type: finalMime });
        const previewUrl = URL.createObjectURL(videoBlob);
        setCapturedBlob(videoBlob);
        setCapturedPreviewUrl(previewUrl);

        // Turn off audio track
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(100); // Collect data chunks every 100ms
      setIsRecording(true);
      recordStartTimeRef.current = Date.now();

      // Progress interval (up to 60 seconds max)
      recordIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - recordStartTimeRef.current) / 1000;
        setRecordSeconds(Math.floor(elapsed));
        const pct = Math.min(100, (elapsed / 60) * 100);
        setRecordProgress(pct);

        if (elapsed >= 60) {
          stopRecording();
        }
      }, 50);
    } catch (recorderErr) {
      console.error('MediaRecorder start failure:', recorderErr);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording && !mediaRecorderRef.current) return;

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }

    setIsRecording(false);
    setRecordProgress(0);
    setRecordSeconds(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
      }
    }
  }, [isRecording]);

  // ─── Shutter Button Gestures (Tap = Photo, Hold = Video, Slide = Zoom) ─────
  const handleShutterPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (capturedPreviewUrl) return;

    shutterStartPointerYRef.current = e.clientY;
    isShutterHoldingRef.current = false;

    // Timer to distinguish tap from hold (350ms threshold)
    shutterHoldTimerRef.current = window.setTimeout(() => {
      isShutterHoldingRef.current = true;
      startRecording();
    }, 350);
  };

  const handleShutterPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isShutterHoldingRef.current && isRecording) {
      // Slide up while holding to zoom
      const deltaY = shutterStartPointerYRef.current - e.clientY;
      if (deltaY > 20) {
        const zoomDelta = (deltaY - 20) / 120;
        applyHardwareZoom(1.0 + zoomDelta);
      }
    }
  };

  const handleShutterPointerUp = () => {
    if (shutterHoldTimerRef.current) {
      clearTimeout(shutterHoldTimerRef.current);
      shutterHoldTimerRef.current = null;
    }

    if (isShutterHoldingRef.current) {
      isShutterHoldingRef.current = false;
      stopRecording();
    } else {
      // Tap detected: take photo or toggle video depending on mode
      if (cameraMode === 'video') {
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      } else {
        takePhoto();
      }
    }
  };

  // ─── Gallery File Pick ─────────────────────────────────────────────────────
  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onGallerySelect) {
      onGallerySelect(file);
      handleClose();
    } else {
      // Load file into capture preview
      const previewUrl = URL.createObjectURL(file);
      setCapturedBlob(file);
      setCapturedPreviewUrl(previewUrl);
      setCameraMode(file.type.startsWith('video/') ? 'video' : 'photo');
    }
  };

  // ─── Retake & Save Actions ─────────────────────────────────────────────────
  const handleRetake = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setIsSubmitting(false);

    // Re-verify stream is active
    if (!streamRef.current || streamRef.current.getTracks().every((t) => t.readyState === 'ended')) {
      initCamera(cameraFacing);
    }
  };

  const handleSaveToDevice = () => {
    if (!capturedBlob) return;
    const isVid = cameraMode === 'video' || capturedBlob.type.startsWith('video/');
    const ext = isVid ? 'mp4' : 'jpg';
    const filename = `dataverse_camera_${Date.now()}.${ext}`;

    const a = document.createElement('a');
    a.href = capturedPreviewUrl || URL.createObjectURL(capturedBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── BUG 1: Finish Capture & Send to Correct Destination ───────────────────
  const handleFinishCapture = () => {
    if (!capturedBlob || isSubmitting) return;

    const targetDestination = destination || getCameraDestination()?.destination;

    // If destination is missing for any reason: default to closing camera with no action, NOT to post flow
    if (!targetDestination) {
      handleClose();
      return;
    }

    setIsSubmitting(true);

    try {
      // Hand the captured media immediately to the recipient and close camera instantly
      onCapture(capturedBlob, cameraMode, targetDestination);
      handleClose();
    } catch (err) {
      console.error('Failed to dispatch captured media to destination:', err);
      setIsSubmitting(false);
    }
  };

  // ─── Desktop Keyboard Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (capturedPreviewUrl) {
          handleFinishCapture();
        } else if (cameraMode === 'video') {
          if (isRecording) stopRecording();
          else startRecording();
        } else {
          takePhoto();
        }
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        if (!capturedPreviewUrl) handleFlipCamera();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraMode, capturedPreviewUrl, handleClose, handleFinishCapture, handleFlipCamera, isRecording, startRecording, stopRecording, takePhoto]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black select-none overflow-hidden"
      style={{
        backgroundColor: 'var(--camera-bg, #000000)'
      }}
    >
      {/* Phone-shaped container on desktop, full-screen on mobile */}
      <div
        className="relative w-full h-full md:max-w-[420px] md:max-h-[860px] md:rounded-[28px] md:shadow-2xl md:border md:border-white/10 flex flex-col justify-between overflow-hidden bg-black"
        style={{
          aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '4:5' ? '4/5' : '1/1'
        }}
      >
        {/* Hidden plain HTML5 video for stream feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onPlaying={() => setHasFirstFrame(true)}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150 ${
            hasFirstFrame && !capturedPreviewUrl ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none',
            // Digital zoom fallback if hardware zoom unavailable
            scale: zoomLevel > 1.0 ? `${zoomLevel}` : '1.0'
          }}
        />

        {/* Video preview on review screen */}
        {capturedPreviewUrl && (
          <div className="absolute inset-0 w-full h-full z-10 bg-black flex items-center justify-center">
            {cameraMode === 'video' || capturedBlob?.type.startsWith('video/') ? (
              <video
                src={capturedPreviewUrl}
                playsInline
                autoPlay
                loop
                muted={isVideoMuted}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={capturedPreviewUrl}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {/* Camera Loading Spinner State (Dark background, small spinner, never white box) */}
        {!hasFirstFrame && !capturedPreviewUrl && !cameraError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black text-white/70 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-2)]" />
            <p className="text-xs font-medium tracking-wide">Starting camera...</p>
          </div>
        )}

        {/* Flip transition visual indicator */}
        {isFlipping && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity">
            <RotateCcw className="w-10 h-10 text-white/80 animate-spin" />
          </div>
        )}

        {/* Camera Hardware Error States (Friendly fallback with Retry button) */}
        {cameraError && !capturedPreviewUrl && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black text-white">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Camera Unavailable</h3>
            <p className="text-xs text-white/70 max-w-xs mb-6 leading-relaxed">
              {cameraError.message}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => initCamera(cameraFacing)}
                className="px-5 py-2.5 rounded-full font-semibold text-xs text-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                style={{ backgroundColor: 'var(--accent-2)' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-full font-semibold text-xs bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rule of Thirds 3x3 Grid Overlay */}
        {showGrid && !capturedPreviewUrl && (
          <div className="absolute inset-0 z-10 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/15">
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-white/15" />
            <div className="border-r border-white/15" />
            <div />
          </div>
        )}

        {/* Focus indicator animation */}
        {focusPoint && (
          <div
            className="absolute z-20 w-16 h-16 border-2 border-yellow-400 rounded-lg pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping"
            style={{ left: focusPoint.x, top: focusPoint.y }}
          />
        )}

        {/* White Screen Flash Overlay for photo capture */}
        <div
          className={`absolute inset-0 z-30 bg-white pointer-events-none transition-opacity duration-150 ${
            showFlashOverlay ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 pointer-events-none">
            <span className="text-8xl font-black text-white drop-shadow-2xl animate-pulse">
              {countdown}
            </span>
          </div>
        )}

        {/* Interactive viewfinder touch surface */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleTapToFocus}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* ─── TOP CONTROL BAR ─────────────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,16px)+8px)] pb-3 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Close (X) button: 48px tap target */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close camera"
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Center Indicator (e.g. Recording Timer) */}
          {isRecording ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/90 text-white font-mono font-bold text-xs shadow-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>
                {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Torch toggle if supported */}
              {isTorchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  aria-label={isTorchOn ? 'Turn off flash' : 'Turn on flash'}
                  className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                    isTorchOn ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-black/40 text-white hover:bg-black/60'
                  }`}
                >
                  {isTorchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                </button>
              )}
            </div>
          )}

          {/* Right Tools & Expandable menu button */}
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              aria-label="More camera options"
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            >
              <Grid className="w-5 h-5" />
            </button>

            {/* Expandable Tools Popup */}
            {showToolsMenu && (
              <div className="absolute top-14 right-0 z-30 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-2 min-w-[150px] animate-in fade-in slide-in-from-top-2">
                {/* Timer setting */}
                <button
                  type="button"
                  onClick={() => {
                    const next: TimerDuration = timerDuration === 0 ? 3 : timerDuration === 3 ? 10 : 0;
                    setTimerDuration(next);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--accent-2)]" />
                    <span>Timer</span>
                  </span>
                  <span className="font-bold text-[var(--accent-2)]">
                    {timerDuration === 0 ? 'Off' : `${timerDuration}s`}
                  </span>
                </button>

                {/* Grid toggle */}
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-[var(--accent-2)]" />
                    <span>Grid 3x3</span>
                  </span>
                  <span className={`font-bold ${showGrid ? 'text-[var(--accent-2)]' : 'text-white/40'}`}>
                    {showGrid ? 'On' : 'Off'}
                  </span>
                </button>

                {/* Aspect ratio */}
                <button
                  type="button"
                  onClick={() => {
                    const next: AspectRatio = aspectRatio === '9:16' ? '4:5' : aspectRatio === '4:5' ? '1:1' : '9:16';
                    setAspectRatio(next);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <span className="text-white/80">Aspect</span>
                  <span className="font-bold text-[var(--accent-2)]">{aspectRatio}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── BOTTOM CONTROLS & SHUTTER ───────────────────────────────────── */}
        <div className="w-full flex flex-col items-center pb-[calc(env(safe-area-inset-bottom,20px)+8px)] pt-3 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
          {/* Review Screen Actions (Retake, Save, Send / Post to DataVerse) */}
          {capturedPreviewUrl ? (
            <div className="w-full flex items-center justify-between px-6 py-3">
              {/* Retake Button */}
              <button
                type="button"
                onClick={handleRetake}
                aria-label="Retake photo or video"
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all active:scale-95"
              >
                <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow-lg">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Retake</span>
              </button>

              {/* Sound Toggle for Video Preview */}
              {(cameraMode === 'video' || capturedBlob?.type.startsWith('video/')) && (
                <button
                  type="button"
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  aria-label={isVideoMuted ? 'Unmute video' : 'Mute video'}
                  className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-95"
                >
                  {isVideoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-[var(--accent-2)]" />}
                </button>
              )}

              {/* Download / Save Button */}
              <button
                type="button"
                onClick={handleSaveToDevice}
                aria-label="Save to device"
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all active:scale-95"
              >
                <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow-lg">
                  <Download className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Save</span>
              </button>

              {/* BUG 1: Primary Action Button: "Send" for Chat, "Post to DataVerse" for Post */}
              {destination === 'chat' ? (
                <button
                  type="button"
                  onClick={handleFinishCapture}
                  disabled={isSubmitting}
                  aria-label="Send media message to chat"
                  className="flex items-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full font-bold text-xs text-black shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-2)' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishCapture}
                  disabled={isSubmitting}
                  aria-label="Post to DataVerse"
                  className="flex items-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full font-bold text-xs text-black shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-2)' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Post to DataVerse</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Live Camera Viewfinder Controls */
            <div className="w-full flex flex-col items-center">
              {/* Shutter Row */}
              <div className="w-full flex items-center justify-around px-8 py-2">
                {/* Left: Gallery Picker */}
                <button
                  type="button"
                  onClick={handleGalleryClick}
                  aria-label="Choose photo or video from gallery"
                  className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-900/90 border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-zinc-800"
                >
                  <ImageIcon className="w-5 h-5" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </button>

                {/* Center: Big Shutter Button with Circular SVG Progress Ring */}
                <div className="relative flex items-center justify-center">
                  {/* Circular recording progress SVG ring */}
                  <svg className="w-24 h-24 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="5"
                    />
                    {isRecording && (
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="red"
                        strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 44}
                        strokeDashoffset={2 * Math.PI * 44 * (1 - recordProgress / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-75"
                      />
                    )}
                  </svg>

                  {/* Primary Shutter Button */}
                  <button
                    type="button"
                    onPointerDown={handleShutterPointerDown}
                    onPointerMove={handleShutterPointerMove}
                    onPointerUp={handleShutterPointerUp}
                    aria-label={cameraMode === 'video' ? 'Record video' : 'Take photo'}
                    className={`absolute w-18 h-18 min-w-[64px] min-h-[64px] rounded-full border-4 transition-all duration-150 flex items-center justify-center active:scale-90 shadow-2xl ${
                      isRecording
                        ? 'bg-red-600 border-white scale-110'
                        : 'bg-white border-white/60 hover:scale-105'
                    }`}
                  >
                    <div
                      className={`transition-all duration-200 ${
                        isRecording
                          ? 'w-6 h-6 bg-white rounded-md'
                          : cameraMode === 'video'
                          ? 'w-8 h-8 rounded-full bg-red-600'
                          : 'w-14 h-14 rounded-full border border-black/10'
                      }`}
                    />
                  </button>
                </div>

                {/* Right: Flip Camera Button (48px tap target) */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  aria-label="Flip camera"
                  className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-zinc-900/90 border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-zinc-800"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              {/* Photo / Video Mode Toggle Pill */}
              <div className="flex items-center gap-6 mt-3 text-xs font-bold tracking-widest uppercase">
                <button
                  type="button"
                  onClick={() => setCameraMode('photo')}
                  className={`transition-all py-1 px-2 ${
                    cameraMode === 'photo'
                      ? 'text-[var(--accent-2)] border-b-2 border-[var(--accent-2)]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Photo
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode('video')}
                  className={`transition-all py-1 px-2 ${
                    cameraMode === 'video'
                      ? 'text-[var(--accent-2)] border-b-2 border-[var(--accent-2)]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Video
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialCameraModal;
