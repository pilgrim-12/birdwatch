export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    </div>
  );
}
