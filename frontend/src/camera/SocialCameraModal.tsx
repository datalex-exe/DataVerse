/**
 * Social Media Camera System with 200 Working Real-time Filters
 * Mobile-first social camera with horizontal filter carousel, WebGL shaders,
 * MediaPipe face tracking, accessories, particle engines, and video/photo capture.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  X,
  RotateCw,
  Zap,
  ZapOff,
  Camera as CameraIcon,
  Sparkles,
  Search,
  Star,
  Activity,
  Send,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  FilterDefinition,
  CameraFacing,
  CameraMode,
  CameraStats
} from './types';
import { FILTERS_CATALOG, FILTER_CATEGORIES } from './filters';
import { CameraFilterEngine } from './renderer';
import { getFilterThumbnail } from './thumbnailGenerator';

// Default "Original / No Filter" definition
const ORIGINAL_FILTER: FilterDefinition = {
  id: 'original',
  name: 'Original',
  category: 'aesthetic',
  thumbnail: '',
  effectType: 'color-grade',
  parameters: {
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    temperature: 0.0,
    tint: 0.0,
  },
  performanceTier: 'light',
  enabled: true,
};

// Full list including original at index 0
const ALL_FILTERS = [ORIGINAL_FILTER, ...FILTERS_CATALOG];

interface SocialCameraModalProps {
  initialMode?: CameraMode;
  onCapture: (blob: Blob, mode: CameraMode) => void;
  onClose: () => void;
  title?: string;
}

export const SocialCameraModal: React.FC<SocialCameraModalProps> = ({
  initialMode = 'photo',
  onCapture,
  onClose,
}) => {
  // Camera & Stream states
  const [cameraMode, setCameraMode] = useState<CameraMode>(initialMode);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(true);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Active filter & discovery
  const [activeFilter, setActiveFilter] = useState<FilterDefinition>(ORIGINAL_FILTER);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dataverse_camera_favs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Recording & captured preview states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);

  // Telemetry & diagnostics
  const [showStats, setShowStats] = useState<boolean>(false);
  const [stats, setStats] = useState<CameraStats | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<CameraFilterEngine | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const recordTimerRef = useRef<number | null>(null);

  // Save favorites to localStorage
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

  // Stop all camera hardware tracks
  const stopHardwareTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize or re-initialize camera stream
  const initCamera = useCallback(
    async (facing: CameraFacing) => {
      setIsLoadingCamera(true);
      setCameraError(null);
      stopHardwareTracks();

      try {
        // Enumerate devices to check camera count
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoInputs.length > 1);
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: cameraMode === 'video',
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities?.() || {}) as any;
          setIsTorchSupported(Boolean(capabilities.torch));
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Initialize Filter Engine once canvas is ready
        if (canvasRef.current && videoRef.current) {
          if (!engineRef.current) {
            engineRef.current = new CameraFilterEngine(canvasRef.current);
            engineRef.current.onStats((s) => setStats(s));
          }
          engineRef.current.setVideoSource(videoRef.current, facing);
          engineRef.current.setFilter(activeFilter);
          engineRef.current.start();
        }

        setIsLoadingCamera(false);
      } catch (err: any) {
        console.error('Camera initialization failed:', err);
        setIsLoadingCamera(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Camera access was denied. Please allow camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError('Camera is already in use by another application.');
        } else {
          setCameraError('Unable to start camera. Please verify device permissions.');
        }
      }
    },
    [cameraFacing, cameraMode, activeFilter, stopHardwareTracks]
  );

  // Initialize camera on mount
  useEffect(() => {
    initCamera(cameraFacing);
    return () => {
      stopHardwareTracks();
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    };
  }, []);

  // Switch facing camera (User vs Environment)
  const handleToggleFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    initCamera(nextFacing);
  };

  // Toggle Torch/Flash
  const handleToggleTorch = async () => {
    if (!streamRef.current || !isTorchSupported) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const nextTorch = !isTorchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Could not toggle torch:', err);
    }
  };

  // Switch filter smoothly without restarting camera stream
  const handleSelectFilter = (filter: FilterDefinition) => {
    setActiveFilter(filter);
    if (engineRef.current) {
      engineRef.current.setFilter(filter);
    }

    // Scroll selected item into center of carousel
    const el = document.getElementById(`filter-thumb-${filter.id}`);
    if (el && carouselRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // Filter list based on selected category, search query, or favorites
  const displayedFilters = useMemo(() => {
    let list = ALL_FILTERS;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.effectType.toLowerCase().includes(q)
      );
    }

    if (selectedCategory === 'favorites') {
      return list.filter((f) => f.id === 'original' || favorites.includes(f.id));
    }

    if (selectedCategory !== 'all') {
      return list.filter((f) => f.id === 'original' || f.category === selectedCategory);
    }

    return list;
  }, [selectedCategory, searchQuery, favorites]);

  // Shutter action: Photo capture or Video recording toggle
  const handleShutter = async () => {
    if (!engineRef.current) return;

    if (cameraMode === 'photo') {
      try {
        const photoBlob = await engineRef.current.capturePhoto('image/jpeg', 0.95);
        const url = URL.createObjectURL(photoBlob);
        setCapturedBlob(photoBlob);
        setCapturedPreviewUrl(url);
      } catch (err) {
        console.error('Failed to capture photo:', err);
      }
    } else {
      // Video mode
      if (!isRecording) {
        // Start recording
        const audioTrack = streamRef.current?.getAudioTracks()[0] || null;
        const started = engineRef.current.startRecording(audioTrack);
        if (started) {
          setIsRecording(true);
          setRecordDuration(0);
          recordTimerRef.current = window.setInterval(() => {
            setRecordDuration((prev) => prev + 1);
          }, 1000);
        }
      } else {
        // Stop recording
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        setIsRecording(false);
        try {
          const videoBlob = await engineRef.current.stopRecording();
          const url = URL.createObjectURL(videoBlob);
          setCapturedBlob(videoBlob);
          setCapturedPreviewUrl(url);
        } catch (err) {
          console.error('Failed to stop video recording:', err);
        }
      }
    }
  };

  // Retake photo/video
  const handleRetake = () => {
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setRecordDuration(0);
    // Resume engine rendering
    if (engineRef.current) {
      engineRef.current.start();
    }
  };

  // Accept and send/save captured media
  const handleAcceptCapture = () => {
    if (!capturedBlob) return;
    onCapture(capturedBlob, cameraMode);
    onClose();
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between select-none overflow-hidden h-[100dvh]">
      {/* Hidden live camera source video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* ─── Top Header Bar ────────────────────────────────────────── */}
      <div className="w-full max-w-lg flex items-center justify-between p-4 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Flash / Torch Toggle */}
        <button
          onClick={handleToggleTorch}
          disabled={!isTorchSupported || !!capturedPreviewUrl}
          className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
            isTorchOn
              ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/30'
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
          } ${!isTorchSupported ? 'opacity-30 cursor-not-allowed' : ''}`}
          title={isTorchSupported ? 'Toggle Flash' : 'Flash not available on this camera'}
        >
          {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
        </button>

        {/* Filter Name & Mode Badge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-xs font-semibold text-white tracking-wide">
              {activeFilter.name}
            </span>
            {activeFilter.id !== 'original' && (
              <button
                onClick={(e) => toggleFavorite(activeFilter.id, e)}
                className="ml-1 text-white/70 hover:text-amber-300"
              >
                <Star
                  className={`w-3 h-3 ${
                    favorites.includes(activeFilter.id)
                      ? 'fill-amber-300 text-amber-300'
                      : ''
                  }`}
                />
              </button>
            )}
          </div>
          <span className="text-[10px] text-white/60 font-medium tracking-wider uppercase mt-0.5">
            {activeFilter.category} • 200 Filters Library
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Telemetry Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
              showStats
                ? 'bg-emerald-500/80 text-white border-emerald-400'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title="Performance HUD"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Close Camera Button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all active:scale-95"
            title="Close Camera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Main Viewfinder Viewport ──────────────────────────────── */}
      <div className="w-full flex-1 max-w-lg relative flex items-center justify-center overflow-hidden rounded-3xl mx-auto my-1 border border-white/10 bg-zinc-950 shadow-2xl">
        {/* Loading Spinner */}
        {isLoadingCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30">
            <div className="w-12 h-12 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin mb-4" />
            <p className="text-white/80 text-sm font-medium">Starting Camera & Filters...</p>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-30">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-3">
              <CameraIcon className="w-7 h-7" />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Camera Access Issue</h3>
            <p className="text-white/70 text-xs max-w-xs mb-4">{cameraError}</p>
            <button
              onClick={() => initCamera(cameraFacing)}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs active:scale-95 transition-all shadow-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Real-time WebGL Filter Engine Canvas */}
        {!capturedPreviewUrl ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Captured Post-Preview Display */
          cameraMode === 'photo' ? (
            <img
              src={capturedPreviewUrl}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={capturedPreviewUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )
        )}

        {/* Recording Timer Badge */}
        {isRecording && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white backdrop-blur-md shadow-lg border border-red-400/40 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <span className="text-xs font-bold tracking-wider">{formatTime(recordDuration)}</span>
          </div>
        )}

        {/* Performance Telemetry HUD */}
        {showStats && stats && (
          <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-md border border-white/20 p-2.5 rounded-xl text-[10px] text-white/90 font-mono space-y-1 shadow-lg pointer-events-none">
            <div className="flex justify-between gap-3">
              <span className="text-white/50">FPS:</span>
              <span className={stats.fps >= 50 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {stats.fps}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-white/50">Frame Time:</span>
              <span>{stats.frameTimeMs} ms</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-white/50">Resolution:</span>
              <span>{stats.resolution.width}x{stats.resolution.height}</span>
            </div>
            {stats.memoryMb && (
              <div className="flex justify-between gap-3">
                <span className="text-white/50">Memory:</span>
                <span>{stats.memoryMb} MB</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-white/50">Active Tier:</span>
              <span className="capitalize">{activeFilter.performanceTier}</span>
            </div>
          </div>
        )}

        {/* Category Pill Drawer Toggle (Over viewfinder bottom) */}
        {!capturedPreviewUrl && (
          <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center">
            <button
              onClick={() => setIsCategoryDrawerOpen(!isCategoryDrawerOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-white text-[11px] font-medium transition-all"
            >
              <SlidersHorizontal className="w-3 h-3 text-amber-300" />
              <span className="capitalize">{selectedCategory} Filters ({displayedFilters.length})</span>
              {isCategoryDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* ─── Category Selection Drawer ─────────────────────────────── */}
      {isCategoryDrawerOpen && !capturedPreviewUrl && (
        <div className="w-full max-w-lg px-4 py-2 z-20 bg-black/90 backdrop-blur-xl border-t border-white/10 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              All (200)
            </button>
            <button
              onClick={() => setSelectedCategory('favorites')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-400 text-black font-semibold'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              Favs ({favorites.length})
            </button>
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {cat.name} ({FILTERS_CATALOG.filter((f) => f.category === cat.id).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Search Modal / Drawer ─────────────────────────────────── */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 200 filters (e.g. vintage, blush, cyber)..."
                autoFocus
                className="bg-transparent text-white placeholder-white/40 text-sm focus:outline-none w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/50 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>

          {/* Search Results Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-3 p-1">
            {displayedFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  handleSelectFilter(f);
                  setIsSearchOpen(false);
                }}
                className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                  activeFilter.id === f.id
                    ? 'bg-white/20 border-amber-400'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <img
                  src={getFilterThumbnail(f)}
                  alt={f.name}
                  className="w-12 h-12 rounded-full mb-1 shadow-md"
                />
                <span className="text-[10px] text-white text-center font-medium line-clamp-1">
                  {f.name}
                </span>
                <span className="text-[8px] text-white/40 uppercase">
                  {f.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bottom Controls & Horizontal Filter Carousel ──────────── */}
      <div className="w-full max-w-lg flex flex-col items-center pb-6 pt-2 z-20 bg-gradient-to-t from-black via-black/90 to-transparent">
        {/* Horizontal Carousel (Active when not previewing capture) */}
        {!capturedPreviewUrl && (
          <div className="w-full relative py-2">
            <div
              ref={carouselRef}
              className="flex items-center gap-3 overflow-x-auto no-scrollbar px-6 scroll-smooth snap-x snap-mandatory"
            >
              {displayedFilters.map((filter) => {
                const isSelected = activeFilter.id === filter.id;
                const thumbUri = getFilterThumbnail(filter);
                return (
                  <button
                    key={filter.id}
                    id={`filter-thumb-${filter.id}`}
                    onClick={() => handleSelectFilter(filter)}
                    className="flex flex-col items-center shrink-0 snap-center transition-transform active:scale-95 group focus:outline-none"
                  >
                    <div
                      className={`relative w-14 h-14 rounded-full transition-all flex items-center justify-center p-0.5 ${
                        isSelected
                          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-110 shadow-lg shadow-amber-400/40'
                          : 'ring-1 ring-white/20 hover:ring-white/50 opacity-80 group-hover:opacity-100'
                      }`}
                    >
                      <img
                        src={thumbUri}
                        alt={filter.name}
                        className="w-full h-full rounded-full object-cover"
                        loading="lazy"
                      />
                      {favorites.includes(filter.id) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow">
                          <Star className="w-2.5 h-2.5 fill-black text-black" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[9px] mt-1.5 max-w-[64px] truncate text-center tracking-tight transition-colors ${
                        isSelected ? 'font-bold text-amber-300' : 'text-white/70'
                      }`}
                    >
                      {filter.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Social Camera Actions Row */}
        <div className="w-full flex items-center justify-between px-8 pt-3">
          {capturedPreviewUrl ? (
            /* Post-capture controls: Retake & Send/Save */
            <div className="w-full flex items-center justify-between px-4">
              <button
                onClick={handleRetake}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow-lg">
                  <RotateCw className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Retake</span>
              </button>

              <button
                onClick={handleAcceptCapture}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-sm shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Use {cameraMode === 'photo' ? 'Photo' : 'Video'}</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Live Camera Controls */
            <>
              {/* Filter Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-3 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 active:scale-95 backdrop-blur-md transition-all"
                title="Search 200 Filters"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Shutter Button (Instagram/Snapchat style) */}
              <div className="flex flex-col items-center">
                <button
                  onClick={handleShutter}
                  disabled={isLoadingCamera || !!cameraError}
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-95 shadow-2xl ${
                    cameraMode === 'photo'
                      ? 'border-white bg-white/20 hover:bg-white/30'
                      : isRecording
                      ? 'border-red-500 bg-red-600/30 animate-pulse'
                      : 'border-red-500 bg-red-500/20 hover:bg-red-500/30'
                  }`}
                  title={cameraMode === 'photo' ? 'Take Photo' : isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  <div
                    className={`transition-all ${
                      cameraMode === 'photo'
                        ? 'w-16 h-16 rounded-full bg-white shadow-inner'
                        : isRecording
                        ? 'w-7 h-7 rounded-md bg-red-500'
                        : 'w-16 h-16 rounded-full bg-red-500 shadow-inner'
                    }`}
                  />
                </button>

                {/* Mode Selector Pill */}
                <div className="flex items-center gap-3 mt-3 bg-black/60 border border-white/15 px-3 py-1 rounded-full backdrop-blur-md">
                  <button
                    onClick={() => setCameraMode('photo')}
                    disabled={isRecording}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      cameraMode === 'photo' ? 'text-amber-400' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Photo
                  </button>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <button
                    onClick={() => setCameraMode('video')}
                    disabled={isRecording}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      cameraMode === 'video' ? 'text-red-400' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>

              {/* Camera Flip Button */}
              <button
                onClick={handleToggleFacing}
                disabled={!hasMultipleCameras || isRecording}
                className={`p-3 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 active:scale-95 backdrop-blur-md transition-all ${
                  !hasMultipleCameras ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                title="Switch Front/Rear Camera"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
