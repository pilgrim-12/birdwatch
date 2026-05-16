import 'react-globe.gl';

declare module 'react-globe.gl' {
  interface GlobeProps {
    /** Accessor for unique point identifier, used for object constancy in data binds */
    pointId?: string | ((d: object) => string | number);
    /** Accessor for unique path identifier, used for object constancy in data binds */
    pathId?: string | ((d: object) => string | number);
    /** Whether to animate the globe on initial load */
    animateIn?: boolean;
  }
}
