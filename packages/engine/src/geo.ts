// Privacy-preserving location: turn a GPS fix into a neighbourhood ON THE DEVICE.
// Only the district id ever leaves the phone; coordinates are never sent or stored (GDPR data minimisation).
//
// District outlines use the prototype's stylised Athens projection (1209x1199 units, 10 m per unit),
// which is a linear transform of longitude/latitude, so point-in-polygon can run in that space.

const PROJ = { lngMin: 23.669089999999997, latMax: 38.04465, kx: 87642.27166200998, ky: 111195.08023353292, unitM: 10 };

export function projectLngLat(lng: number, lat: number): { x: number; y: number } {
  return { x: ((lng - PROJ.lngMin) * PROJ.kx) / PROJ.unitM, y: ((PROJ.latMax - lat) * PROJ.ky) / PROJ.unitM };
}

export function unprojectXY(x: number, y: number): { lng: number; lat: number } {
  return { lng: PROJ.lngMin + (x * PROJ.unitM) / PROJ.kx, lat: PROJ.latMax - (y * PROJ.unitM) / PROJ.ky };
}

type Ring = [number, number][];

/** Parse an SVG path made of M (absolute move), l (relative line) and z (close). */
export function parsePath(d: string): Ring[] {
  const rings: Ring[] = [];
  const tokens = d.match(/[MmLlZz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let ring: Ring = [];
  let cmd = 'M';
  let x = 0;
  let y = 0;
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (/[MmLlZz]/.test(tok)) {
      cmd = tok;
      i++;
      if (cmd === 'z' || cmd === 'Z') {
        if (ring.length > 2) rings.push(ring);
        ring = [];
      }
      continue;
    }
    const a = num();
    const b = num();
    if (cmd === 'M' || cmd === 'm') {
      if (ring.length > 2) rings.push(ring);
      x = cmd === 'M' ? a : x + a;
      y = cmd === 'M' ? b : y + b;
      ring = [[x, y]];
      cmd = cmd === 'M' ? 'L' : 'l';
    } else {
      x = cmd === 'L' ? a : x + a;
      y = cmd === 'L' ? b : y + b;
      ring.push([x, y]);
    }
  }
  if (ring.length > 2) rings.push(ring);
  return rings;
}

/** Even-odd rule across all rings (handles holes and multi-part districts). */
export function pointInRings(x: number, y: number, rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
}

export interface DistrictShape {
  id: string;
  svgPath: string;
}

/** Which district contains this GPS fix? null if outside the Municipality of Athens. */
export function locateDistrict(lng: number, lat: number, districts: readonly DistrictShape[]): string | null {
  const { x, y } = projectLngLat(lng, lat);
  for (const d of districts) if (pointInRings(x, y, parsePath(d.svgPath))) return d.id;
  return null;
}
