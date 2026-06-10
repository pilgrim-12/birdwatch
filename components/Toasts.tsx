'use client';

import { useToastStore } from '@/store/useToastStore';

export default function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            t.type === 'error'
              ? 'bg-red-900/90 text-red-200 border border-red-700/50'
              : 'bg-gray-800/90 text-gray-200 border border-gray-700/50'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-400 hover:text-white shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
