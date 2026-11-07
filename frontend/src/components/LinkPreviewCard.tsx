import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface LinkPreviewData {
  url: string;
  domain: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string;
}

const previewCache = new Map<string, LinkPreviewData>();

export const LinkPreviewCard: React.FC<{ url: string }> = ({ url }) => {
  const [data, setData] = useState<LinkPreviewData | null>(() => previewCache.get(url) || null);
  const [loading, setLoading] = useState<boolean>(!previewCache.has(url));

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url)!);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/media/link-preview?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && json.title) {
            previewCache.set(url, json);
            setData(json);
          }
        }
      } catch (err) {
        console.error('Failed to load link preview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreview();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) {
    return (
      <div className="w-full max-w-md my-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--input)]/60 animate-pulse flex items-center gap-3 select-none">
        <div className="w-12 h-12 rounded-lg bg-[var(--hover)] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 bg-[var(--hover)] rounded" />
          <div className="h-2 w-1/2 bg-[var(--hover)] rounded" />
        </div>
      </div>
    );
  }

  if (!data || !data.title) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md my-2 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--accent-2)]/60 transition-all overflow-hidden shadow-sm group select-none cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      {data.image && (
        <div className="w-full h-36 bg-black/40 overflow-hidden relative">
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent-2)] mb-1 uppercase tracking-wider">
          <Globe className="w-3 h-3" />
          <span className="truncate">{data.domain}</span>
          <ExternalLink className="w-2.5 h-2.5 ml-auto opacity-70 group-hover:opacity-100" />
        </div>
        <h4 className="text-xs font-semibold text-[var(--text)] line-clamp-1 group-hover:text-[var(--accent-2)] transition-colors">
          {data.title}
        </h4>
        {data.description && (
          <p className="text-[11px] text-[var(--muted)] line-clamp-2 mt-0.5 leading-relaxed">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
};

