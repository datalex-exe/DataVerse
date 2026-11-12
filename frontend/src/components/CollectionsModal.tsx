import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Bookmark, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Collection {
  id: string;
  name: string;
  item_count: number;
}

interface CollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const CollectionsModal: React.FC<CollectionsModalProps> = ({
  isOpen,
  onClose,
  postId
}) => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [savingCollectionId, setSavingCollectionId] = useState<string | null>(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/collections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setCollections(json.collections || []);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchCollections();

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const res = await fetch('/api/users/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCollectionName.trim() })
      });
      if (res.ok) {
        const json = await res.json();
        setCollections(prev => [json.collection, ...prev]);
        setNewCollectionName('');
        toast.success(`Collection "${json.collection.name}" created!`);
        // Immediately add post to newly created collection
        handleAddToCollection(json.collection.id, json.collection.name);
      } else {
        toast.error('Failed to create collection');
      }
    } catch {
      toast.error('Network error creating collection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddToCollection = async (collectionId: string, collectionName: string) => {
    try {
      setSavingCollectionId(collectionId);
      const res = await fetch(`/api/users/collections/${collectionId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId })
      });
      if (res.ok) {
        toast.success(`Saved to "${collectionName}"!`);
        onClose();
      } else {
        toast.error('Failed to save to collection');
      }
    } catch {
      toast.error('Network error saving to collection');
    } finally {
      setSavingCollectionId(null);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none overscroll-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-sm rounded-3xl bg-[var(--card)] border border-[var(--line)] shadow-2xl p-6 relative flex flex-col animate-zoom overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
            <Bookmark className="w-4 h-4 text-[var(--accent-2)]" />
            <span>Save to Collection</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--hover)] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create New Collection Input */}
        <form onSubmit={handleCreateCollection} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="New collection name..."
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            className="flex-1 min-w-0 bg-[var(--input)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent-2)] transition-colors"
          />
          <button
            type="submit"
            disabled={!newCollectionName.trim() || isCreating}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] text-xs font-bold shadow disabled:opacity-40 flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>New</span>
          </button>
        </form>

        {/* Existing Collections List */}
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 flex justify-center text-[var(--muted)]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-center py-6 text-xs text-[var(--muted)]">
              No custom collections yet. Create your first one above!
            </p>
          ) : (
            collections.map(col => (
              <button
                key={col.id}
                type="button"
                onClick={() => handleAddToCollection(col.id, col.name)}
                disabled={savingCollectionId === col.id}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--input)] hover:bg-[var(--hover)] border border-[var(--line)] text-left transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderPlus className="w-4 h-4 text-[var(--accent-2)] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text)] truncate">{col.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-[var(--muted)] font-mono">{col.item_count} items</span>
                  {savingCollectionId === col.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-2)]" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
