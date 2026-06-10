'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center bg-gray-950 text-gray-100">
      <div className="max-w-md text-center space-y-4 p-6">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-gray-400">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
