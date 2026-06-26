export interface Location {
  id: number;
  name: string;
  kind?: 'internal' | 'external';
  building?: string;
  room?: string;
  cabinet?: string;
  shelf?: string;
  mapX?: number;
  mapY?: number;
}
