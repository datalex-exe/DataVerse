import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../utils/compress';
import { uploadMediaFile, MAX_FILE_SIZE } from '../utils/upload';
import { Image as ImageIcon, X, Loader2, Check, Video, Plus, Camera } from 'lucide-react';
import { ImageCropper } from '../components/ImageCropper';

const SocialCameraModal = React.lazy(() => import('../camera/SocialCameraModal'));

interface CreateProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Create: React.FC<CreateProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  
  const [caption, setCaption] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: string; file: File }[]>([]);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  
  // UI states
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  /* UI UPDATE START - Drag & Drop State */
  const [isDragging, setIsDragging] = useState<boolean>(false);
  /* UI UPDATE END */

  // Preload SocialCameraModal chunk so opening camera is instantaneous
  useEffect(() => {
    import('../camera/SocialCameraModal');
  }, []);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      filePreviews.forEach(item => {
        if (item.url.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [filePreviews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = ''; // Reset input

    for (const file of fileList) {
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(`File "${file.name}" (${sizeMB} MB) exceeds the 2 GB maximum limit.`);
        return;
      }

      if (file.type.startsWith('image/')) {
        setFileToCrop(file);
        setError(null);
        setSuccess(false);
        break; // Process cropper for image
      } else if (file.type.startsWith('video/')) {
        setSelectedFiles(prev => [...prev, file]);
        setFilePreviews(prev => [...prev, { url: URL.createObjectURL(file), type: 'video', file }]);
        setError(null);
        setSuccess(false);
      } else {
        setError('Only image and video uploads are supported.');
      }
    }
  };

  /* UI UPDATE START - Drag-over and drop handlers */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(`File "${file.name}" (${sizeMB} MB) exceeds the 2 GB maximum limit.`);
        return;
      }

      if (file.type.startsWith('image/')) {
        setFileToCrop(file);
        setError(null);
        setSuccess(false);
        break;
      } else if (file.type.startsWith('video/')) {
        setSelectedFiles(prev => [...prev, file]);
        setFilePreviews(prev => [...prev, { url: URL.createObjectURL(file), type: 'video', file }]);
        setError(null);
        setSuccess(false);
      } else {
        setError('Only image and video uploads are supported.');
      }
    }
  };
  /* UI UPDATE END */

  const removeFileAt = (index: number) => {
    const target = filePreviews[index];
    if (target && target.url.startsWith('blob:')) {
      URL.revokeObjectURL(target.url);
    }
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCameraCapture = (blob: Blob, mode: 'photo' | 'video') => {
    setShowCameraModal(false);
    const extension = mode === 'photo' ? 'jpg' : 'webm';
    const mimeType = blob.type.split(';')[0].trim() || (mode === 'photo' ? 'image/jpeg' : 'video/webm');
    const filename = `camera_${Date.now()}.${extension}`;
    const file = new File([blob], filename, { type: mimeType });
    const previewUrl = URL.createObjectURL(file);

    setSelectedFiles(prev => [...prev, file]);
    setFilePreviews(prev => [...prev, { url: previewUrl, type: mode === 'photo' ? 'image' : 'video', file }]);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !token || !user) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const uploadedMediaItems: { r2_key: string; media_type: string }[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        let uploadBody: Blob | File = file;
        let contentType = file.type || (file.type.startsWith('video/') ? 'video/mp4' : 'image/jpeg');

        // Compress images client-side if smaller than 20MB
        if (file.type.startsWith('image/') && file.size < 20 * 1024 * 1024) {
          try {
            const compressedBlob = await compressImage(file, 1080, 0.85);
            uploadBody = compressedBlob;
            contentType = 'image/jpeg';
          } catch {
            uploadBody = file;
          }
        }

        const fileExtension = file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
        const r2Key = `posts/${user.id}-${Date.now()}-${i}.${fileExtension}`;

        await uploadMediaFile(uploadBody, r2Key, token, contentType, (pct) => {
          setUploadProgressText(`Uploading ${i + 1} of ${selectedFiles.length} (${pct}%)`);
        });

        uploadedMediaItems.push({ r2_key: r2Key, media_type: contentType });
      }

      // Register post metadata in D1
      const postMetadataRes = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caption: caption.trim(),
          media: uploadedMediaItems
        })
      });

      if (!postMetadataRes.ok) {
        const metadataErrData = await postMetadataRes.json();
        throw new Error(metadataErrData.error || 'Failed to save post metadata');
      }

      // Success Reset
      setCaption('');
      setSelectedFiles([]);
      setFilePreviews([]);
      setSuccess(true);
      
      // Navigate to Feed after short delay
      setTimeout(() => {
        onNavigate('feed_redirect');
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to publish post');
    } finally {
      setUploading(false);
      setUploadProgressText(null);
    }
  };

  /* UI UPDATE START - Create Post Page UI Redesign (Desktop & Phone responsive) */
  return (
    <div className="w-full max-w-[1080px] mx-auto self-center px-4 sm:px-6 pt-3 sm:pt-8 animate-fade-in select-none relative z-10 pb-28 md:pb-12">
      
      {/* THEME START */}
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,var(--glow),transparent)] blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] backdrop-blur-2xl shadow-2xl shadow-[var(--shadow-card)] overflow-hidden">
      {/* THEME END */}
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
          
          {/* Left Column: Drag & Drop / Multiple selection preview */}
          <div className="p-5 sm:p-7 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/[0.06] bg-black/20">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-[20px] aspect-[4/3] md:aspect-square flex flex-col items-center justify-center relative overflow-hidden transition-all p-2.5 ${
                isDragging 
                  ? 'border-brand-500 bg-brand-500/[0.08] shadow-lg shadow-brand-500/10' 
                  : 'border-[#2c2c4a] hover:border-brand-500 bg-[#050509]/60 hover:bg-brand-500/[0.03]'
              }`}
            >
              {filePreviews.length > 0 ? (
                <div className="w-full h-full flex flex-col gap-2 relative">
                  {/* Grid or preview list */}
                  <div className="w-full h-full flex-1 relative overflow-hidden rounded-[16px] bg-black flex items-center justify-center border border-white/5">
                    {filePreviews[filePreviews.length - 1].type === 'video' ? (
                      <video 
                        src={filePreviews[filePreviews.length - 1].url} 
                        controls 
                        className="w-full h-full object-contain bg-black" 
                      />
                    ) : (
                      <img 
                        src={filePreviews[filePreviews.length - 1].url} 
                        alt="Selected media preview" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>

                  {/* Thumbnail bar for multiple files */}
                  {filePreviews.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto p-1.5 max-h-16 bg-[#050509]/80 rounded-xl border border-white/5 backdrop-blur-sm">
                      {filePreviews.map((item, idx) => (
                        <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0 border border-white/10 bg-black">
                          {item.type === 'video' ? (
                            <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
                          ) : (
                            <img src={item.url} alt={`Preview thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFileAt(idx)}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 hover:bg-red-600 text-white rounded-full transition-colors flex items-center justify-center"
                            aria-label={`Remove media file ${idx + 1}`}
                          >
                            <X className="w-2.5 h-2.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add more files button, Camera button & Reset */}
                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => setShowCameraModal(true)}
                      className="min-w-[44px] min-h-[44px] p-2 bg-black/80 hover:bg-black text-amber-300 rounded-full transition-all border border-amber-300/30 flex items-center justify-center shadow-lg active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400"
                      aria-label="Open Camera"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <label 
                      className="min-w-[44px] min-h-[44px] p-2 bg-black/80 hover:bg-black text-white rounded-full transition-all border border-white/10 flex items-center justify-center cursor-pointer shadow-lg active:scale-95 focus-within:ring-2 focus-within:ring-[var(--accent-2)]" 
                      aria-label="Add more photos or videos"
                    >
                      <Plus className="w-4 h-4 text-white" aria-hidden="true" />
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        multiple
                        aria-label="Select additional photos or videos"
                        onChange={handleFileChange} 
                        className="sr-only" 
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setSelectedFiles([]); setFilePreviews([]); setSuccess(false); }}
                      className="min-w-[44px] min-h-[44px] p-2 bg-black/80 hover:bg-red-600 text-white rounded-full transition-all border border-white/10 flex items-center justify-center shadow-lg active:scale-95 focus-visible:ring-2 focus-visible:ring-red-400"
                      aria-label="Clear all selected media"
                    >
                      <X className="w-4 h-4 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center">
                  <label className="flex flex-col items-center justify-center cursor-pointer transition-all group mb-3 focus-within:ring-2 focus-within:ring-[var(--accent-2)] rounded-2xl p-2">
                    <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-[var(--accent-2)] flex items-center justify-center mb-3 group-hover:-translate-y-1 transition-transform duration-200 shadow-md shadow-brand-500/5">
                      <ImageIcon className="w-7 h-7" aria-hidden="true" />
                      <Video className="w-7 h-7 -ml-2" aria-hidden="true" />
                    </div>
                    <span className="text-base font-semibold text-[var(--text)] tracking-wide">Select photos or videos</span>
                    <span className="text-xs text-[var(--muted)] mt-1 font-normal">Multiple selection allowed · Max 2 GB per file</span>
                    <input 
                      type="file" 
                      accept="image/*,video/*" 
                      multiple
                      aria-label="Select photos or videos to upload"
                      onChange={handleFileChange} 
                      className="sr-only" 
                    />
                  </label>

                  <div className="flex items-center gap-2 my-2 text-[11px] text-[var(--muted)] font-medium">
                    <span className="w-10 h-px bg-[var(--line)]" />
                    <span>OR</span>
                    <span className="w-10 h-px bg-[var(--line)]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCameraModal(true)}
                    aria-label="Open Camera to capture photo or video"
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    <span>Open Camera</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Post info */}
          <div className="p-5 sm:p-7 md:p-8 flex flex-col justify-between h-full">
            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <h1 className="text-xl font-bold text-[var(--text)] tracking-wide">New Post</h1>
                  <p className="text-xs text-[var(--muted)] mt-1">Compose and publish updates directly to your feed.</p>
                </div>

                {error && (
                  <div 
                    role="alert"
                    aria-live="assertive"
                    className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium animate-fade-in"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div 
                    role="status"
                    aria-live="polite"
                    className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium flex items-center gap-2 animate-fade-in"
                  >
                    <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    Post published successfully! Redirecting...
                  </div>
                )}

                {/* Caption Textarea */}
                <div className="space-y-2">
                  <label htmlFor="create-post-caption" className="block text-sm font-semibold text-[var(--text)]">
                    Caption
                  </label>
                  <textarea
                    id="create-post-caption"
                    rows={7}
                    placeholder="Say something about this photo..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-[var(--input)] border border-[var(--line)] focus:border-[var(--accent-2)] focus:ring-1 focus:ring-[var(--accent-2)]/40 rounded-2xl p-4 text-base md:text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all resize-none min-h-[140px] md:min-h-[180px]"
                  />
                </div>

              </div>

              {/* Submit share button (pinned to bottom, glowing when enabled, clear disabled state) */}
              <div className="mt-auto pt-6">
                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0 || success}
                  className="w-full min-h-[48px] py-3.5 px-6 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm tracking-wide bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-[var(--shadow-accent)] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:bg-[var(--input)] disabled:border disabled:border-[var(--line)] disabled:text-[var(--muted)]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      {uploadProgressText || 'Uploading & Sharing...'}
                    </>
                  ) : (
                    `Share ${selectedFiles.length > 1 ? `(${selectedFiles.length} files)` : ''}`
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {fileToCrop && (
        <ImageCropper
          file={fileToCrop}
          isAvatar={false}
          onCrop={(croppedFile) => {
            setSelectedFiles(prev => [...prev, croppedFile]);
            setFilePreviews(prev => [...prev, { url: URL.createObjectURL(croppedFile), type: 'image', file: croppedFile }]);
            setFileToCrop(null);
          }}
          onCancel={() => setFileToCrop(null)}
        />
      )}

      {/* ─── Social Camera Modal ─────────────────── */}
      {showCameraModal && (
        <React.Suspense fallback={null}>
          <SocialCameraModal
            destination="post"
            initialMode="photo"
            onCapture={handleCameraCapture}
            onClose={() => setShowCameraModal(false)}
          />
        </React.Suspense>
      )}

    </div>
  );
};

export default Create;
