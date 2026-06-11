import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface GlobeInstance {
  controls(): OrbitControls;
  camera(): THREE.PerspectiveCamera;
  renderer(): THREE.WebGLRenderer;
  scene(): THREE.Scene;
  pointOfView(pov?: { lat: number; lng: number; altitude: number }, transitionMs?: number): { lat: number; lng: number; altitude: number };
  globeMaterial(): THREE.MeshPhongMaterial & { map?: THREE.Texture };
  lights(lights: THREE.Light[]): void;
  __freeCamFlyTo?: (toPos: THREE.Vector3, toTarget: THREE.Vector3, duration?: number) => void;
}

export type GlobeRef = React.MutableRefObject<GlobeInstance | null>;
