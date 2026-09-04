import GlobeLoader from '@/components/GlobeLoader';

/**
 * Route-level fallback. It shows the same overlay the globe uses for its own
 * warm-up, so the streamed placeholder and the real first paint are one
 * continuous screen instead of two different spinners.
 */
export default function Loading() {
  return (
    <div className="relative flex-1 bg-gray-950">
      <GlobeLoader stage="engine" done={false} />
    </div>
  );
}
