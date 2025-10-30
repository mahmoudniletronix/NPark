export interface Station {
  id: string; // P1 / S12 ...
  x: number; // SVG px
  y: number; // SVG px
  tag?: string; // text/rect/...
  type?: 'Sensor' | 'ParkingSensor' | 'Gate' | 'Unknown';
  floor?: string; // B1/B2
  data?: Record<string, any>;  
}

export interface Lane {
  id: string; // L1 / Lane-12
  points: Array<{ x: number; y: number }>;
  direction?: 'IN' | 'OUT' | 'BOTH';
}

export interface ExtractResult {
  floor: string;
  stations: Station[];
  lanes: Lane[];
  viewBox?: string;
}
