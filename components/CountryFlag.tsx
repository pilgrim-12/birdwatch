import { getCountryIsoCodes } from '@/lib/countryFlags';
import { GROUP_INFO, type SatelliteGroup } from '@/lib/constants';

interface CountryFlagProps {
  group: string;
  size?: 'sm' | 'md';
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className ?? 'w-3 h-3 text-gray-500'}
    >
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="8" cy="8" rx="3" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

export function CountryFlag({ group, size = 'sm' }: CountryFlagProps) {
  const info = GROUP_INFO[group as SatelliteGroup];
  if (!info) return null;

  const codes = getCountryIsoCodes(info.country);
  if (codes.length === 0) return null;

  const sizeStyle =
    size === 'sm'
      ? { width: 14, height: 10 }
      : { width: 16, height: 12 };
  const globeClass =
    size === 'sm' ? 'w-3 h-3 text-gray-500' : 'w-4 h-4 text-gray-500';

  // If all codes are null (pure "International"), show globe
  if (codes.every((c) => c === null)) {
    return <GlobeIcon className={globeClass} />;
  }

  // Show primary (first valid) flag
  const primaryCode = codes.find((c) => c !== null);
  if (!primaryCode) return <GlobeIcon className={globeClass} />;

  return (
    <span
      className={`fi fi-${primaryCode} shrink-0`}
      style={{ ...sizeStyle, display: 'inline-block', backgroundSize: 'cover' }}
      title={info.country}
    />
  );
}
