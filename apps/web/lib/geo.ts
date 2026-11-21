/** Same projection as the prototype map: lng/lat -> its 1209x1199 SVG space. */
export function project(lng: number, lat: number) {
  const lngMin = 23.669089999999997;
  const latMax = 38.04465;
  return { x: ((lng - lngMin) * 87642.27166200998) / 10, y: ((latMax - lat) * 111195.08023353292) / 10 };
}
