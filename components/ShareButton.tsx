'use client';

import { useCallback, useState } from 'react';
import { buildShareQuery } from '@/hooks/useUrlState';
import { useToastStore } from '@/store/useToastStore';

interface ShareButtonProps {
  /** Full-width button styling for the mobile menu */
  variant?: 'header' | 'menu';
  onShared?: () => void;
}

/** Copies (or shares) a link that restores the current view for someone else. */
export default function ShareButton({ variant = 'header', onShared }: ShareButtonProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const query = buildShareQuery();
    const url = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'BirdWatches', url });
        onShared?.();
        return;
      } catch {
        // user dismissed the share sheet, or it is unavailable — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('Link copied — it restores this exact view', 'info');
      onShared?.();
    } catch {
      addToast('Could not copy the link');
    }
  }, [addToast, onShared]);

  if (variant === 'menu') {
    return (
      <button
        onClick={handleShare}
        className="min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors bg-gray-800 text-gray-500 border border-gray-700 active:text-gray-300"
      >
        {copied ? 'Copied' : 'Share view'}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="px-2 py-1 rounded text-[11px] font-medium transition-colors bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300 flex items-center gap-1"
      title="Copy a link that restores this view — satellites, groups, location and time"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474l6.733-3.367A2.52 2.52 0 0 1 13 4.5Z" />
      </svg>
      {copied ? 'Copied' : 'Share'}
    </button>
  );
}
