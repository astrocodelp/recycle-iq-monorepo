import { describe, expect, it } from 'vitest';
import districts from '../../db/seed/districts.json';
import { locateDistrict, parsePath, projectLngLat, unprojectXY } from '../src';

const shapes = (districts as { id: string; path: string; lnglat: [number, number] }[]).map((d) => ({
  id: d.id,
  svgPath: d.path,
  lnglat: d.lnglat,
}));

describe('locateDistrict', () => {
  it('round-trips the projection', () => {
    const p = projectLngLat(23.7336, 37.97503);
    const back = unprojectXY(p.x, p.y);
    expect(back.lng).toBeCloseTo(23.7336, 6);
    expect(back.lat).toBeCloseTo(37.97503, 6);
  });
  it('parses every outline', () => {
    for (const s of shapes) expect(parsePath(s.svgPath).length).toBeGreaterThan(0);
  });
  it('places most district reference points in their own district', () => {
    const hits = shapes.filter((s) => locateDistrict(s.lnglat[0], s.lnglat[1], shapes) === s.id).length;
    expect(hits / shapes.length).toBeGreaterThan(0.9);
  });
  it('returns null outside Athens', () => {
    expect(locateDistrict(22.0, 40.0, shapes)).toBeNull();
  });
});
