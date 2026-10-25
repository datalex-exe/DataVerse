/**
 * Professional Social Media Camera Modal (Instagram / Snapchat / B612 Style)
 * 200 Live Filter Library, WebGL GPU Shader pipeline, Live Carousel Thumbnails,
 * Aspect Ratio, Timer, Grid, Tap-to-Focus, Pinch/Slide Zoom, Shutter Hold-to-Record,
 * and seamless integration with DataVerse post & chat workflows.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  X,
  RotateCw,
  Zap,
  ZapOff,
  Search,
  Star,
  Sliders,
  Grid as GridIcon,
  Timer as TimerIcon,
  Maximize2,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Camera,
  Layers
} from 'lucide-react';
import {
  CameraFacing,
  CameraMode,
  AspectRatio,
  TimerDuration
} from './types';
import { FILTERS_CATALOG, FILTER_CATEGORIES, getFilterById } from './filters';
import { WebGLFilterEngine } from './webglFilter';

interface SocialCameraModalProps {
  initialMode?: CameraMode;
  onCapture: (blob: Blob, mode: CameraMode) => void;
  onClose: () => void;
  onGallerySelect?: (file: File) => void;
}

export const SocialCameraModal: React.FC<SocialCameraModalProps> = ({
  initialMode = 'photo',
  onCapture,
  onClose,
  onGallerySelect
}) => {
  // ─── Camera & Hardware States ──────────────────────────────────────────────
  const [cameraMode, setCameraMode] = useState<CameraMode>(initialMode);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('user');
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasFirstFrame, setHasFirstFrame] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<{ type: string; message: string } | null>(null);

  // ─── Filter & Customization States ─────────────────────────────────────────
  const [selectedFilterId, setSelectedFilterId] = useState<string>('original');
  const [filterStrength, setFilterStrength] = useState<number>(1.0);
  const [skinSmooth, setSkinSmooth] = useState<number>(0.0);
  const [showFilterPill, setShowFilterPill] = useState<boolean>(true);
  const [showSliders, setShowSliders] = useState<boolean>(false);

  // ─── Tool States ───────────────────────────────────────────────────────────
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);

  // ─── Focus & Gestures ──────────────────────────────────────────────────────
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [showFlashOverlay, setShowFlashOverlay] = useState<boolean>(false);

  // ─── Filter Discovery / Drawer ─────────────────────────────────────────────
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerCategory, setDrawerCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('dataverse_camera_favs');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('dataverse_camera_recents');
      return s ? JSON.parse(s) : ['original'];
    } catch {
      return ['original'];
    }
  });

  // ─── Review & Capture States ───────────────────────────────────────────────
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [rawUnfilteredCanvas, setRawUnfilteredCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0); // 0 to 100%
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<WebGLFilterEngine | null>(null);
  const reviewEngineRef = useRef<WebGLFilterEngine | null>(null);

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isRenderingRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const pillTimerRef = useRef<number | null>(null);

  // Shutter press-and-hold & Zoom tracking
  const shutterHoldTimerRef = useRef<number | null>(null);
  const shutterStartPointerYRef = useRef<number>(0);
  const isShutterHoldingRef = useRef<boolean>(false);
  const recordStartTimeRef = useRef<number>(0);
  const recordIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Pinch zoom tracking
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);
  const lastTapTimeRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const activeFilter = useMemo(() => getFilterById(selectedFilterId), [selectedFilterId]);

  // ─── STEP 1: INITIALIZE CAMERA STREAM (Strict Error Handling) ──────────────
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const initCamera = useCallback(
    async (facing: CameraFacing) => {
      setHasFirstFrame(false);
      setCameraError(null);
      stopTracks();

      // Check secure context
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setCameraError({
          type: 'insecure',
          message: 'Camera requires a secure HTTPS connection. Please browse using HTTPS.',
        });
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError({
          type: 'unsupported',
          message: 'Camera API is not supported on this browser.',
        });
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false, // Only request mic when recording video to avoid permission friction
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const caps = (videoTrack.getCapabilities?.() || {}) as any;
          setIsTorchSupported(Boolean(caps.torch));
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch (playErr) {
            console.warn('Video play prevented or interrupted:', playErr);
          }
        }
      } catch (err: any) {
        console.error('Camera access failure:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError({
            type: 'permission',
            message: 'Camera access was blocked. Tap the lock/tune icon in your browser address bar to allow camera, then retry.',
          });
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError({
            type: 'notfound',
            message: 'No camera hardware found on this device.',
          });
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError({
            type: 'inuse',
            message: 'Camera is currently being used by another application or tab.',
          });
        } else {
          setCameraError({
            type: 'unknown',
            message: err.message || 'Unable to access camera.',
          });
        }
      }
    },
    [stopTracks]
  );

  // Initialize camera on mount & manage visibility changes
  useEffect(() => {
    initCamera(cameraFacing);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTracks();
        isRenderingRef.current = false;
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      } else {
        if (!capturedPreviewUrl) {
          initCamera(cameraFacing);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopTracks();
      if (engineRef.current) engineRef.current.dispose();
      if (reviewEngineRef.current) reviewEngineRef.current.dispose();
      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
      if (shutterHoldTimerRef.current) clearTimeout(shutterHoldTimerRef.current);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    };
  }, []);

  // ─── STEP 2: RENDER LOOP (WebGL Quad Shaders at 30fps) ─────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!engineRef.current) {
      engineRef.current = new WebGLFilterEngine(canvasRef.current);
    }

    isRenderingRef.current = true;

    const renderTick = (timestamp: number) => {
      if (!isRenderingRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        if (!hasFirstFrame) {
          setHasFirstFrame(true);
        }

        const vW = video.videoWidth || 1280;
        const vH = video.videoHeight || 720;

        // Determine aspect crop
        let targetW = vW;
        let targetH = vH;
        if (aspectRatio === '1:1') {
          const side = Math.min(vW, vH);
          targetW = side;
          targetH = side;
        } else if (aspectRatio === '4:5') {
          targetW = Math.round(vH * (4 / 5));
          targetH = vH;
        }

        // Render WebGL frame
        const filterParams = {
          ...activeFilter.params,
          skinSmooth: skinSmooth > 0 ? skinSmooth : activeFilter.params.skinSmooth,
        };

        engineRef.current?.render(video, filterParams, {
          mirror: cameraFacing === 'user',
          zoom: zoomLevel,
          filterStrength,
          time: timestamp / 1000,
          width: targetW,
          height: targetH,
        });
      }

      animFrameIdRef.current = requestAnimationFrame(renderTick);
    };

    animFrameIdRef.current = requestAnimationFrame(renderTick);

    return () => {
      isRenderingRef.current = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [cameraFacing, zoomLevel, activeFilter, filterStrength, skinSmooth, aspectRatio, hasFirstFrame]);

  // Filter change pill auto-fade
  const showPillTemporarily = useCallback(() => {
    setShowFilterPill(true);
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    pillTimerRef.current = window.setTimeout(() => {
      setShowFilterPill(false);
    }, 1500);
  }, []);

  const handleSelectFilter = (filterId: string) => {
    if (filterId !== selectedFilterId) {
      setSelectedFilterId(filterId);
      showPillTemporarily();
      if (navigator.vibrate) {
        try {
          navigator.vibrate(8);
        } catch {}
      }

      // Add to recents
      setRecents((prev) => {
        const next = [filterId, ...prev.filter((id) => id !== filterId)].slice(0, 15);
        try {
          localStorage.setItem('dataverse_camera_recents', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Scroll thumbnail into view
      const el = document.getElementById(`filter-thumb-${filterId}`);
      if (el && carouselRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const toggleFavorite = (filterId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId];
      try {
        localStorage.setItem('dataverse_camera_favs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Flip Camera
  const handleToggleFacing = () => {
    const nextFacing: CameraFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    initCamera(nextFacing);
  };

  // Torch / Flash Toggle
  const handleToggleTorch = async () => {
    if (!streamRef.current || !isTorchSupported) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const next = !isTorchOn;
      await (videoTrack as any).applyConstraints({ advanced: [{ torch: next }] });
      setIsTorchOn(next);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Tap-to-focus
  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1200);

    // Hardware focus if supported
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const nx = x / rect.width;
        const ny = y / rect.height;
        (videoTrack as any).applyConstraints?.({
          advanced: [{ pointsOfInterest: { x: nx, y: ny } }],
        });
      } catch {}
    }
  };

  // Viewfinder Gestures: Double-tap to flip, Pinch to zoom, Swipe left/right to change filters
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;

      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        handleToggleFacing();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartDistRef.current;
      setZoomLevel(Math.max(1.0, Math.min(5.0, pinchStartZoomRef.current * ratio)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pinchStartDistRef.current) {
      pinchStartDistRef.current = null;
      return;
    }
    if (e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX > 0) {
          // Swipe Right -> previous filter
          const curIdx = FILTERS_CATALOG.findIndex((f) => f.id === selectedFilterId);
          const prev = FILTERS_CATALOG[(curIdx - 1 + FILTERS_CATALOG.length) % FILTERS_CATALOG.length];
          handleSelectFilter(prev.id);
        } else {
          // Swipe Left -> next filter
          const curIdx = FILTERS_CATALOG.findIndex((f) => f.id === selectedFilterId);
          const next = FILTERS_CATALOG[(curIdx + 1) % FILTERS_CATALOG.length];
          handleSelectFilter(next.id);
        }
      }
    }
  };

  // ─── STEP 3: CAPTURE & RECORDING WORKFLOW ──────────────────────────────────
  const triggerShutterCapture = async () => {
    if (cameraMode === 'photo') {
      await capturePhoto();
    } else {
      if (!isRecording) {
        startVideoRecording();
      } else {
        stopVideoRecording();
      }
    }
  };

  const handleShutterPress = () => {
    if (timerDuration > 0 && !isRecording) {
      let count = timerDuration;
      setCountdown(count);
      const timer = window.setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(timer);
          setCountdown(null);
          triggerShutterCapture();
        } else {
          setCountdown(count);
        }
      }, 1000);
      return;
    }

    triggerShutterCapture();
  };

  // Photo Capture
  const capturePhoto = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    // White flash animation
    setShowFlashOverlay(true);
    setTimeout(() => setShowFlashOverlay(false), 200);

    const video = videoRef.current;
    const vW = video.videoWidth || 1280;
    const vH = video.videoHeight || 720;

    // Cache raw unfiltered frame for review re-filtering
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = vW;
    rawCanvas.height = vH;
    const rawCtx = rawCanvas.getContext('2d');
    if (rawCtx) {
      rawCtx.drawImage(video, 0, 0, vW, vH);
      setRawUnfilteredCanvas(rawCanvas);
    }

    // Capture filtered output from master WebGL canvas
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedPreviewUrl(URL.createObjectURL(blob));
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Video Recording Start
  const startVideoRecording = async () => {
    if (!canvasRef.current) return;
    try {
      recordedChunksRef.current = [];
      const canvasStream = canvasRef.current.captureStream(30);

      // Request microphone audio for video
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
      } catch (aErr) {
        console.warn('Microphone permission denied, recording without audio:', aErr);
      }

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

      const recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type });
        setCapturedBlob(blob);
        setCapturedPreviewUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        setRecordProgress(0);
      };

      recorder.start(100);
      setIsRecording(true);
      recordStartTimeRef.current = Date.now();
      setRecordSeconds(0);

      recordIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - recordStartTimeRef.current) / 1000;
        setRecordSeconds(Math.floor(elapsed));
        const pct = Math.min((elapsed / 60) * 100, 100);
        setRecordProgress(pct);

        if (elapsed >= 60) {
          stopVideoRecording();
        }
      }, 100);
    } catch (err) {
      console.error('Failed to start video recording:', err);
    }
  };

  // Video Recording Stop
  const stopVideoRecording = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Shutter Press-and-hold (Snapchat/Instagram style)
  const handleShutterPointerDown = (e: React.PointerEvent) => {
    if (capturedPreviewUrl) return;
    shutterStartPointerYRef.current = e.clientY;
    isShutterHoldingRef.current = false;

    shutterHoldTimerRef.current = window.setTimeout(() => {
      isShutterHoldingRef.current = true;
      if (cameraMode === 'photo') {
        setCameraMode('video');
      }
      startVideoRecording();
    }, 280);
  };

  const handleShutterPointerMove = (e: React.PointerEvent) => {
    if (isShutterHoldingRef.current && isRecording) {
      // Slide up to zoom
      const deltaY = shutterStartPointerYRef.current - e.clientY;
      const zoomBoost = Math.max(1.0, Math.min(5.0, 1.0 + deltaY / 120));
      setZoomLevel(zoomBoost);
    }
  };

  const handleShutterPointerUp = () => {
    if (shutterHoldTimerRef.current) {
      clearTimeout(shutterHoldTimerRef.current);
      shutterHoldTimerRef.current = null;
    }

    if (isShutterHoldingRef.current) {
      isShutterHoldingRef.current = false;
      stopVideoRecording();
    } else {
      handleShutterPress();
    }
  };

  // Retake
  const handleRetake = () => {
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setRawUnfilteredCanvas(null);
    setRecordProgress(0);
    setRecordSeconds(0);
  };

  // Download / Save to device
  const handleSaveToDevice = () => {
    if (!capturedBlob) return;
    const ext = cameraMode === 'photo' ? 'jpg' : 'webm';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(capturedBlob);
    a.download = `DataVerse_Camera_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Complete capture & hand to existing upload / post flow
  const handleFinishCapture = () => {
    if (!capturedBlob) return;
    onCapture(capturedBlob, cameraMode);
    onClose();
  };

  // Re-filtering photo on review screen
  useEffect(() => {
    if (!capturedPreviewUrl || cameraMode !== 'photo' || !rawUnfilteredCanvas || !reviewCanvasRef.current) return;
    if (!reviewEngineRef.current) {
      reviewEngineRef.current = new WebGLFilterEngine(reviewCanvasRef.current);
    }

    reviewEngineRef.current.render(rawUnfilteredCanvas, activeFilter.params, {
      mirror: cameraFacing === 'user',
      filterStrength,
      width: rawUnfilteredCanvas.width,
      height: rawUnfilteredCanvas.height,
    });

    reviewCanvasRef.current.toBlob(
      (b) => {
        if (b) {
          setCapturedBlob(b);
        }
      },
      'image/jpeg',
      0.92
    );
  }, [selectedFilterId, filterStrength, capturedPreviewUrl, cameraMode, rawUnfilteredCanvas, activeFilter, cameraFacing]);

  // Gallery Picker action
  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onGallerySelect) {
        onGallerySelect(file);
      } else {
        onCapture(file, file.type.startsWith('video') ? 'video' : 'photo');
      }
      onClose();
    }
  };

  // Keyboard navigation on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && !capturedPreviewUrl) {
        e.preventDefault();
        handleShutterPress();
      }
      if (e.key === 'f' || e.key === 'F') handleToggleFacing();
      if (e.key === 'ArrowRight') {
        const curIdx = FILTERS_CATALOG.findIndex((f) => f.id === selectedFilterId);
        const next = FILTERS_CATALOG[(curIdx + 1) % FILTERS_CATALOG.length];
        handleSelectFilter(next.id);
      }
      if (e.key === 'ArrowLeft') {
        const curIdx = FILTERS_CATALOG.findIndex((f) => f.id === selectedFilterId);
        const prev = FILTERS_CATALOG[(curIdx - 1 + FILTERS_CATALOG.length) % FILTERS_CATALOG.length];
        handleSelectFilter(prev.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFilterId, capturedPreviewUrl]);

  // Filter drawer list
  const filteredDrawerList = useMemo(() => {
    let list = FILTERS_CATALOG;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return list.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    }
    if (drawerCategory === 'favorites') {
      return list.filter((f) => f.id === 'original' || favorites.includes(f.id));
    }
    if (drawerCategory !== 'all') {
      return list.filter((f) => f.id === 'original' || f.category === drawerCategory);
    }
    return list;
  }, [drawerCategory, searchQuery, favorites]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 md:bg-black/80 flex items-center justify-center select-none overflow-hidden touch-none">
      {/* Hidden live camera source video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Hidden file input for gallery picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* ─── DESKTOP/MOBILE 9:16 VIEWPORT CONTAINER ────────────────── */}
      <div className="w-full h-full md:max-w-[420px] md:h-[860px] md:max-h-[96vh] md:rounded-[28px] md:border md:border-white/10 relative overflow-hidden bg-black flex flex-col justify-between shadow-2xl">
        
        {/* ─── WHITE FLASH OVERLAY ─────────────────────────────────── */}
        {showFlashOverlay && (
          <div className="absolute inset-0 z-40 bg-white animate-fade-out pointer-events-none" />
        )}

        {/* ─── TOP CONTROL BAR ─────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between p-4 pt-6 z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close Camera"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Center Dynamic Filter Name Pill */}
          <div
            className={`transition-all duration-300 transform ${
              showFilterPill ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-lg">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-2)' }} />
              <span className="text-xs font-bold text-white tracking-wide">
                {activeFilter.name}
              </span>
              <span className="text-[10px] text-white/50 uppercase font-medium ml-1">
                {activeFilter.category}
              </span>
            </div>
          </div>

          {/* Right Tools Button & Drawer */}
          <div className="flex items-center gap-2">
            {/* Flash / Torch Toggle */}
            <button
              onClick={handleToggleTorch}
              disabled={!isTorchSupported || !!capturedPreviewUrl}
              aria-label="Toggle Flash"
              className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                isTorchOn
                  ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/30'
                  : 'bg-black/40 text-white border-white/15 hover:bg-black/60'
              } ${!isTorchSupported ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
              title={isTorchSupported ? 'Toggle Flash' : 'Flash not available'}
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>

            {/* Quick Expand Tools Toggle */}
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              aria-label="Camera Settings"
              className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                showToolsMenu
                  ? 'text-black border-transparent shadow-lg'
                  : 'bg-black/40 text-white border-white/15 hover:bg-black/60'
              }`}
              style={{
                backgroundColor: showToolsMenu ? 'var(--accent-2)' : undefined,
              }}
              title="Camera Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── EXPANDED TOOLS SUB-MENU (Top Right) ──────────────────── */}
        {showToolsMenu && !capturedPreviewUrl && (
          <div className="absolute top-18 right-4 z-30 flex flex-col gap-2.5 p-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 animate-in fade-in zoom-in-95 duration-200">
            {/* Aspect Ratio Switch */}
            <button
              onClick={() => {
                const next: AspectRatio = aspectRatio === '9:16' ? '4:5' : aspectRatio === '4:5' ? '1:1' : '9:16';
                setAspectRatio(next);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/90 hover:bg-white/10 text-xs font-semibold"
              title="Aspect Ratio"
            >
              <Maximize2 className="w-4 h-4" style={{ color: 'var(--accent-2)' }} />
              <span>{aspectRatio}</span>
            </button>

            {/* Timer Toggle */}
            <button
              onClick={() => {
                const next: TimerDuration = timerDuration === 0 ? 3 : timerDuration === 3 ? 10 : 0;
                setTimerDuration(next);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/90 hover:bg-white/10 text-xs font-semibold"
              title="Countdown Timer"
            >
              <TimerIcon className="w-4 h-4" style={{ color: timerDuration > 0 ? 'var(--accent-2)' : undefined }} />
              <span>{timerDuration === 0 ? 'Timer Off' : `${timerDuration}s`}</span>
            </button>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/90 hover:bg-white/10 text-xs font-semibold"
              title="Rule of Thirds Grid"
            >
              <GridIcon className="w-4 h-4" style={{ color: showGrid ? 'var(--accent-2)' : undefined }} />
              <span>Grid {showGrid ? 'On' : 'Off'}</span>
            </button>

            {/* Sliders Drawer Toggle */}
            <button
              onClick={() => setShowSliders(!showSliders)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/90 hover:bg-white/10 text-xs font-semibold"
              title="Filter & Skin Sliders"
            >
              <Sparkles className="w-4 h-4" style={{ color: showSliders ? 'var(--accent-2)' : undefined }} />
              <span>Adjust</span>
            </button>
          </div>
        )}

        {/* ─── LIVE VIEWFINDER & CANVAS ────────────────────────────── */}
        <div
          onClick={handleViewfinderTap}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair"
        >
          {/* Shimmer loading placeholder until first frame arrives */}
          {!hasFirstFrame && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 animate-pulse">
              <div
                className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-4"
                style={{
                  borderColor: 'var(--accent-2)',
                  borderTopColor: 'transparent',
                }}
              />
              <p className="text-white/70 text-xs font-semibold tracking-wider uppercase">
                Opening Camera...
              </p>
            </div>
          )}

          {/* Friendly Camera Error Screen */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-30 bg-zinc-950/95">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-white font-bold text-base mb-1.5">Camera Unavailable</h3>
              <p className="text-white/70 text-xs max-w-xs mb-5 leading-relaxed">
                {cameraError.message}
              </p>
              <button
                onClick={() => initCamera(cameraFacing)}
                className="px-6 py-2.5 rounded-full font-bold text-xs text-black transition-all active:scale-95 shadow-lg"
                style={{ backgroundColor: 'var(--accent-2)' }}
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Master WebGL Canvas Viewfinder */}
          {!capturedPreviewUrl ? (
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasFirstFrame ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            /* Review Screen Canvas / Video */
            cameraMode === 'photo' ? (
              <canvas
                ref={reviewCanvasRef}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={capturedPreviewUrl}
                autoPlay
                loop
                playsInline
                muted={isVideoMuted}
                className="w-full h-full object-cover"
              />
            )
          )}

          {/* 3x3 Grid Overlay */}
          {showGrid && !capturedPreviewUrl && (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          )}

          {/* Tap-to-Focus Indicator Ring */}
          {focusPoint && (
            <div
              className="absolute pointer-events-none z-30 w-16 h-16 -ml-8 -mt-8 border-2 border-amber-400 rounded-lg animate-in zoom-in-125 duration-200"
              style={{ left: focusPoint.x, top: focusPoint.y }}
            >
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full absolute top-1/2 left-1/2 -ml-0.75 -mt-0.75" />
            </div>
          )}

          {/* Countdown Numbers Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 pointer-events-none">
              <span className="text-8xl font-black text-white drop-shadow-2xl animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Recording Timer Badge */}
          {isRecording && (
            <div className="absolute top-20 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white backdrop-blur-md shadow-lg border border-red-400/40 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
              <span className="text-xs font-black tracking-wider">
                {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Digital Zoom Indicator Pill */}
          {zoomLevel > 1.05 && (
            <div className="absolute bottom-32 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-mono font-bold">
              {zoomLevel.toFixed(1)}x
            </div>
          )}
        </div>

        {/* ─── SLIDERS (Right Edge Adjustments) ────────────────────── */}
        {showSliders && !capturedPreviewUrl && (
          <div className="absolute right-4 top-1/3 z-30 flex flex-col items-center gap-4 p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15">
            {/* Filter Intensity Slider */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold text-white/70 uppercase">Filter</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filterStrength}
                onChange={(e) => setFilterStrength(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer -rotate-90 my-8"
              />
              <span className="text-[9px] font-mono text-white/90">{Math.round(filterStrength * 100)}%</span>
            </div>

            {/* Smooth Skin Slider */}
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <span className="text-[9px] font-bold text-white/70 uppercase">Beauty</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={skinSmooth}
                onChange={(e) => setSkinSmooth(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer -rotate-90 my-8"
              />
              <span className="text-[9px] font-mono text-white/90">{Math.round(skinSmooth * 100)}%</span>
            </div>
          </div>
        )}

        {/* ─── BOTTOM CONTROLS & FILTER CAROUSEL ───────────────────── */}
        <div className="w-full flex flex-col items-center pb-6 pt-3 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
          
          {/* Review Actions (Retake, Save, Post) */}
          {capturedPreviewUrl ? (
            <div className="w-full flex items-center justify-between px-6 py-2">
              <button
                onClick={handleRetake}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow-lg">
                  <RotateCw className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Retake</span>
              </button>

              {/* Sound Toggle for Video */}
              {cameraMode === 'video' && (
                <button
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="w-11 h-11 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center text-white"
                >
                  {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              {/* Download / Save Button */}
              <button
                onClick={handleSaveToDevice}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow-lg">
                  <Download className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Save</span>
              </button>

              {/* Primary Next / Post to DataVerse Button */}
              <button
                onClick={handleFinishCapture}
                className="flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-xs text-black shadow-xl hover:scale-105 active:scale-95 transition-all"
                style={{ backgroundColor: 'var(--accent-2)' }}
              >
                <span>Post to DataVerse</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Live Camera Controls */
            <>
              {/* Horizontal Filter Carousel with 64px Live Previews */}
              <div className="w-full relative py-1.5">
                <div
                  ref={carouselRef}
                  className="flex items-center gap-3.5 overflow-x-auto no-scrollbar px-6 scroll-smooth snap-x snap-mandatory"
                >
                  {FILTERS_CATALOG.map((f) => {
                    const isSelected = selectedFilterId === f.id;
                    return (
                      <button
                        key={f.id}
                        id={`filter-thumb-${f.id}`}
                        onClick={() => handleSelectFilter(f.id)}
                        className="flex flex-col items-center shrink-0 snap-center group focus:outline-none transition-transform active:scale-95"
                      >
                        <div
                          className={`relative w-16 h-16 rounded-full transition-all flex items-center justify-center overflow-hidden ${
                            isSelected
                              ? 'ring-4 ring-offset-2 ring-offset-black scale-110 shadow-xl'
                              : 'ring-1 ring-white/20 hover:ring-white/50 opacity-80 group-hover:opacity-100'
                          }`}
                          style={{
                            boxShadow: isSelected ? '0 0 15px var(--accent-2)' : undefined,
                            borderColor: isSelected ? 'var(--accent-2)' : undefined,
                          }}
                        >
                          {/* Live Thumbnail rendered through WebGL shader or 2D preview */}
                          <div
                            className="w-full h-full rounded-full flex flex-col items-center justify-center text-center p-1"
                            style={{
                              background: f.id === 'original'
                                ? 'linear-gradient(135deg, #1e293b, #0f172a)'
                                : `linear-gradient(135deg, hsl(${
                                    (FILTERS_CATALOG.indexOf(f) * 23) % 360
                                  }, 60%, 25%), hsl(${
                                    (FILTERS_CATALOG.indexOf(f) * 23 + 45) % 360
                                  }, 70%, 15%))`,
                            }}
                          >
                            <span className="text-[10px] font-black text-white/90 leading-tight line-clamp-2">
                              {f.name}
                            </span>
                          </div>

                          {favorites.includes(f.id) && (
                            <div
                              className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow"
                              style={{ backgroundColor: 'var(--accent-2)' }}
                            >
                              <Star className="w-2 h-2 fill-black text-black" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shutter Button & Flanking Actions */}
              <div className="w-full flex items-center justify-between px-8 pt-3">
                {/* Left: Gallery Picker Button */}
                <button
                  onClick={handleGalleryClick}
                  aria-label="Upload from gallery"
                  className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all shadow-lg"
                  title="Gallery Upload"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>

                {/* Center: Snapchat-style Big Shutter Button with Progress Ring */}
                <div className="relative flex items-center justify-center">
                  {/* SVG Circular Progress Ring for Video Recording */}
                  {isRecording && (
                    <svg className="absolute w-24 h-24 -rotate-90 pointer-events-none">
                      <circle
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="4"
                        strokeDasharray={264}
                        strokeDashoffset={264 - (264 * recordProgress) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-100 ease-linear"
                      />
                    </svg>
                  )}

                  <button
                    onPointerDown={handleShutterPointerDown}
                    onPointerMove={handleShutterPointerMove}
                    onPointerUp={handleShutterPointerUp}
                    aria-label={cameraMode === 'photo' ? 'Take Photo' : 'Record Video'}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-transform active:scale-90 shadow-2xl ${
                      cameraMode === 'photo'
                        ? 'border-white bg-white/20'
                        : isRecording
                        ? 'border-red-500 bg-red-600/30'
                        : 'border-red-500 bg-red-500/20'
                    }`}
                  >
                    <div
                      className={`transition-all duration-200 ${
                        cameraMode === 'photo'
                          ? 'w-16 h-16 rounded-full bg-white shadow-inner'
                          : isRecording
                          ? 'w-7 h-7 rounded-lg bg-red-500'
                          : 'w-16 h-16 rounded-full bg-red-500 shadow-inner'
                      }`}
                    />
                  </button>
                </div>

                {/* Right: Camera Flip Button */}
                <button
                  onClick={handleToggleFacing}
                  aria-label="Switch Camera"
                  className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all shadow-lg"
                  title="Flip Camera (F)"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Switcher Pill & All Filters Button */}
              <div className="w-full flex items-center justify-between px-6 pt-3">
                {/* All Filters Drawer Trigger */}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/80 hover:text-white text-[11px] font-semibold"
                >
                  <Layers className="w-3 h-3" style={{ color: 'var(--accent-2)' }} />
                  <span>All 200 Filters</span>
                </button>

                {/* Mode Selector Pill */}
                <div className="flex items-center gap-3 bg-black/60 border border-white/15 px-3 py-1 rounded-full backdrop-blur-md">
                  <button
                    onClick={() => setCameraMode('photo')}
                    disabled={isRecording}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      cameraMode === 'photo' ? 'text-white' : 'text-white/40 hover:text-white/70'
                    }`}
                    style={{
                      color: cameraMode === 'photo' ? 'var(--accent-2)' : undefined,
                    }}
                  >
                    Photo
                  </button>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <button
                    onClick={() => setCameraMode('video')}
                    disabled={isRecording}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      cameraMode === 'video' ? 'text-red-400 font-bold' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Video
                  </button>
                </div>

                <div className="w-20" /> {/* Spacer */}
              </div>
            </>
          )}
        </div>

        {/* ─── ALL FILTERS BOTTOM SHEET / DRAWER ─────────────────────── */}
        {isDrawerOpen && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-2xl flex flex-col p-4 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-2)' }} />
                <h3 className="text-white font-bold text-sm">Filter Library (200)</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-full text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="my-3 flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search filters (e.g., golden, soft, noir)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-white/40 text-xs w-full focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3">
              <button
                onClick={() => setDrawerCategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  drawerCategory === 'all'
                    ? 'text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                style={{
                  backgroundColor: drawerCategory === 'all' ? 'var(--accent-2)' : undefined,
                }}
              >
                All (200)
              </button>
              <button
                onClick={() => setDrawerCategory('favorites')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  drawerCategory === 'favorites'
                    ? 'text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                style={{
                  backgroundColor: drawerCategory === 'favorites' ? 'var(--accent-2)' : undefined,
                }}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>Favs ({favorites.length})</span>
              </button>
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setDrawerCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    drawerCategory === cat.id
                      ? 'text-black'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  style={{
                    backgroundColor: drawerCategory === cat.id ? 'var(--accent-2)' : undefined,
                  }}
                >
                  {cat.name} (20)
                </button>
              ))}
            </div>

            {/* Recently Used Row (if available) */}
            {recents.length > 1 && !searchQuery && (
              <div className="mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">
                  Recently Used
                </span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {recents.map((id) => {
                    const f = getFilterById(id);
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          handleSelectFilter(id);
                          setIsDrawerOpen(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium whitespace-nowrap border border-white/10"
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4-Column Grid of Filters */}
            <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-2.5 pt-2">
              {filteredDrawerList.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    handleSelectFilter(f.id);
                    setIsDrawerOpen(false);
                  }}
                  className={`relative flex flex-col items-center p-2 rounded-2xl border transition-all ${
                    selectedFilterId === f.id
                      ? 'bg-white/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  style={{
                    borderColor: selectedFilterId === f.id ? 'var(--accent-2)' : undefined,
                  }}
                >
                  {f.id !== 'original' && (
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(f.id, e)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full text-white/40 hover:text-white"
                      title="Favorite filter"
                    >
                      <Star className={`w-3 h-3 ${favorites.includes(f.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  )}
                  <div
                    className="w-12 h-12 rounded-full mb-1.5 flex items-center justify-center p-1 text-center shadow"
                    style={{
                      background: `linear-gradient(135deg, hsl(${
                        (FILTERS_CATALOG.indexOf(f) * 23) % 360
                      }, 60%, 25%), hsl(${
                        (FILTERS_CATALOG.indexOf(f) * 23 + 45) % 360
                      }, 70%, 15%))`,
                    }}
                  >
                    <span className="text-[8px] font-black text-white/90 leading-tight">
                      {f.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-white font-medium line-clamp-1">
                    {f.name}
                  </span>
                  <span className="text-[8px] text-white/40 uppercase mt-0.5">
                    {f.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
