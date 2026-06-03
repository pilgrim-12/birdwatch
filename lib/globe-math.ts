import * as THREE from 'three';

export const GLOBE_RADIUS = 100; // three-globe default internal radius

/** Convert lat/lng/relativeAlt to 3D cartesian (matches three-globe's internal coordinate system) */
export function polar2Cartesian(lat: number, lng: number, relAlt: number, out?: THREE.Vector3): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (90 - lng) * (Math.PI / 180);
  const r = GLOBE_RADIUS * (1 + relAlt);
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  if (out) { out.set(x, y, z); return out; }
  return new THREE.Vector3(x, y, z);
}

/** Sun position in three-globe's 3D coordinate system */
export function sunPosition3D(lat: number, lng: number): THREE.Vector3 {
  return polar2Cartesian(lat, lng, 80); // 80× Earth radius — far away, realistic scale
}

/** Moon position in three-globe's 3D coordinate system */
export function moonPosition3D(lat: number, lng: number): THREE.Vector3 {
  return polar2Cartesian(lat, lng, 20); // 20× Earth radius — proportionally distant
}
