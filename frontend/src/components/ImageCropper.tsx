import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, RotateCw, Check } from 'lucide-react';

interface ImageCropperProps {
  file: File;
  isAvatar?: boolean; // circular mask for avatar, square for posts
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  file,
  isAvatar = false,
  onCrop,
  onCancel
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [imageSize, setImageSize] = useState<{ width: number; height: number; fitRatio: number }>({
    width: 0,
    height: 0,
    fitRatio: 1
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const CROP_FRAME_SIZE = 240; // size of the active crop outline on screen

  // 1. Read file as Data URL
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImgSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [file]);

  // 2. Initialize dimensions when image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // We want the image to fully cover the crop frame (240x240)
    const fitRatio = Math.max(CROP_FRAME_SIZE / naturalWidth, CROP_FRAME_SIZE / naturalHeight);
    
    setImageSize({
      width: naturalWidth,
      height: naturalHeight,
      fitRatio
    });
    setZoom(1);
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  // 3. Mouse & Touch Drag Event Handlers
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = {
      x: clientX - panX,
      y: clientY - panY
    };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPanX(clientX - dragStart.current.x);
    setPanY(clientY - dragStart.current.y);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Mouse Handlers
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  // Touch Handlers for Mobile Phones
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // 4. Draw Canvas and Export cropped image
  const handleSave = () => {
    if (!imageRef.current || imageSize.width === 0) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background
    ctx.fillStyle = '#030303';
    ctx.fillRect(0, 0, 800, 800);

    // Set origin to center
    ctx.translate(400, 400);

    // Apply scaling factor from screen crop box to 800px output canvas
    const screenToCanvasRatio = 800 / CROP_FRAME_SIZE;

    // Apply panning
    ctx.translate(panX * screenToCanvasRatio, panY * screenToCanvasRatio);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw the image centered
    const drawWidth = imageSize.width * imageSize.fitRatio * zoom * screenToCanvasRatio;
    const drawHeight = imageSize.height * imageSize.fitRatio * zoom * screenToCanvasRatio;

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    // Export to file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          onCrop(croppedFile);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const renderedWidth = imageSize.width * imageSize.fitRatio;
  const renderedHeight = imageSize.height * imageSize.fitRatio;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] overflow-y-auto flex justify-center items-start sm:items-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-sm bg-[#030303] border border-white/5 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-slate-950/40">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Adjust Photo
          </h3>
          <button 
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropping Canvas Frame Area */}
        <div className="p-6 flex justify-center bg-slate-950/20">
          <div 
            className="w-[280px] h-[280px] relative overflow-hidden bg-[#0a0a0c] border border-white/[0.04] rounded-2xl cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handleEnd}
          >
            {imgSrc && (
              <img
                ref={imageRef}
                src={imgSrc}
                alt="Crop Target"
                onLoad={handleImageLoad}
                className="absolute top-1/2 left-1/2 max-w-none max-h-none pointer-events-none origin-center"
                style={{
                  width: renderedWidth || 'auto',
                  height: renderedHeight || 'auto',
                  transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom}) rotate(${rotation}deg)`
                }}
              />
            )}

            {/* Circular or Square Crop Frame Overlay using huge box-shadow */}
            <div 
              className={`absolute w-[240px] h-[240px] border border-white/40 shadow-[0_0_0_9999px_rgba(3,3,3,0.75)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 ${
                isAvatar ? 'rounded-full' : 'rounded-lg'
              }`}
            />
          </div>
        </div>

        {/* Sliders and Controls */}
        <div className="px-6 pb-6 space-y-5">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5" /> Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>

          {/* Rotate Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1"><RotateCw className="w-3.5 h-3.5" /> Rotation</span>
              <span>{rotation}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>

          {/* Preset Rotate Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="flex-1 py-1.5 bg-slate-950 border border-slate-900 hover:border-white/10 hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider"
            >
              Rotate 90°
            </button>
            <button
              onClick={() => { setZoom(1); setRotation(0); setPanX(0); setPanY(0); }}
              className="flex-1 py-1.5 bg-slate-950 border border-slate-900 hover:border-white/10 hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider"
            >
              Reset
            </button>
          </div>

          {/* Save Action */}
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
          >
            <Check className="w-4 h-4" />
            Apply & Save
          </button>
        </div>

      </div>
    </div>
  );
};
