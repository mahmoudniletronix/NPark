export interface Station {
  id: string;
  x: number;
  y: number;
  tag?: string;
  type?: 'Sensor' | 'ParkingSensor' | 'Gate' | 'Unknown';
  floor?: string;
  data?: Record<string, any>;
}

export interface Lane {
  id: string;
  points: Array<{ x: number; y: number }>;
  direction?: 'IN' | 'OUT' | 'BOTH';
}

export interface ExtractResult {
  floor: string;
  stations: Station[];
  lanes: Lane[];
  viewBox?: string;
}
