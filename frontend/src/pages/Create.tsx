import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../utils/compress';
import { Image as ImageIcon, X, Loader2, Check } from 'lucide-react';
import { ImageCropper } from '../components/ImageCropper';

interface CreateProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Create: React.FC<CreateProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  
  const [caption, setCaption] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  
  // UI states
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Only image uploads are supported.');
        return;
      }
      setFileToCrop(file);
      setError(null);
      setSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !token || !user) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Compress image client-side to keep files small
      const compressedBlob = await compressImage(selectedFile, 1080, 0.85);

      // 2. Generate a unique key for the post media
      const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
      const r2Key = `posts/${user.id}-${Date.now()}.${fileExtension}`;

      // 3. Upload directly to the Worker's R2 proxy endpoint
      const uploadRes = await fetch(`/api/media/upload?key=${encodeURIComponent(r2Key)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/jpeg'
        },
        body: compressedBlob
      });

      if (!uploadRes.ok) {
        const uploadErrData = await uploadRes.json();
        throw new Error(uploadErrData.error || 'Failed to upload image to storage');
      }

      // 4. Register post metadata in D1
      const postMetadataRes = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caption: caption.trim(),
          media: [{ r2_key: r2Key, media_type: 'image/jpeg' }]
        })
      });

      if (!postMetadataRes.ok) {
        const metadataErrData = await postMetadataRes.json();
        throw new Error(metadataErrData.error || 'Failed to save post metadata');
      }

      // Success Reset
      setCaption('');
      setSelectedFile(null);
      setImagePreview(null);
      setSuccess(true);
      
      // Navigate to Feed after short delay
      setTimeout(() => {
        onNavigate('feed_redirect');
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to publish post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto self-center px-4 py-8 animate-fade-in select-none">
      <div className="glass-card rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Left Column: Drag & Drop upload */}
          <div className="p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-900/60 bg-slate-950/20">
            <div className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl aspect-square flex flex-col items-center justify-center relative overflow-hidden transition-all bg-slate-950/40">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setImagePreview(null); setSuccess(false); }}
                    className="absolute top-3 right-3 p-1.5 bg-black/80 hover:bg-black text-white rounded-full transition-colors border border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-brand-500/5 transition-all p-6 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                  <span className="text-sm font-bold text-slate-300">Select a photo from device</span>
                  <span className="text-[10px] text-slate-655 mt-1.5 font-medium">Supports high-res PNG, JPG</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>
          </div>

          {/* Right Column: Post info */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white">New post</h3>
                  <p className="text-xs text-slate-500 mt-1">Compose and publish updates directly to your feed.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Post published successfully! Redirecting...
                  </div>
                )}

                {/* Caption Textarea */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caption</label>
                  <textarea
                    rows={8}
                    placeholder="Say something about this photo..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-900 focus:border-brand-500 rounded-2xl p-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-colors resize-none"
                  />
                </div>

              </div>

              {/* Submit share button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile || success}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compressing & Sharing...
                    </>
                  ) : (
                    'Share'
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
            setSelectedFile(croppedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
              setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(croppedFile);
            setFileToCrop(null);
          }}
          onCancel={() => setFileToCrop(null)}
        />
      )}

    </div>
  );
};

export default Create;
