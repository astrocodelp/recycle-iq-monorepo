// Ported from github.com/Mike17K/recycleiq-delta-sort (ops/web/sankey.js); see NOTICE.
/** Three-column Sankey drawn as SVG: sorter input → materials → destinations. Labels are always drawn (never colour alone). */
export interface SankeyFlow {
  material: string;
  materialLabel: string;
  color: string;
  destination: string;
  kg: number;
}

export function Sankey({ flows: raw, inputLabel, title, width = 720, height: minHeight = 340 }: { flows: SankeyFlow[]; inputLabel: string; title: string; width?: number; height?: number }) {
  // Several plants send the same material to the same destination: draw one band per pair.
  const merged = new Map<string, SankeyFlow>();
  for (const f of raw) {
    const key = `${f.material}\u0000${f.destination}`;
    const m = merged.get(key);
    if (m) m.kg += f.kg;
    else merged.set(key, { ...f });
  }
  const flows = [...merged.values()];
  const total = flows.reduce((s, f) => s + f.kg, 0);
  if (total <= 0) return null;
  const pad = 12;
  const gap = 5;
  /** Each node gets at least this much vertical room so its label never collides with the next one. */
  const minSlot = 16;
  const usable = minHeight - 2 * pad;
  const mats = new Map<string, { label: string; color: string; kg: number }>();
  const dests = new Map<string, number>();
  for (const f of flows) {
    const m = mats.get(f.material) ?? { label: f.materialLabel, color: f.color, kg: 0 };
    m.kg += f.kg;
    mats.set(f.material, m);
    dests.set(f.destination, (dests.get(f.destination) ?? 0) + f.kg);
  }
  // One scale for every column (band thickness must match on both ends); slots grow to fit labels.
  const sc = (usable - gap * Math.max(mats.size, dests.size)) / total;
  const column = <T,>(entries: [string, T, number][]) => {
    let y = pad;
    return entries.map(([k, v, kg]) => {
      const n = { k, v, kg, y, h: Math.max(kg * sc, 1.5), sc };
      y += Math.max(n.h, minSlot) + gap;
      return n;
    });
  };
  const matCol = column([...mats.entries()].map(([k, v]) => [k, v, v.kg] as [string, typeof v, number]).sort((a, b) => b[2] - a[2]));
  const destCol = column([...dests.entries()].map(([k, kg]) => [k, k, kg] as [string, string, number]).sort((a, b) => b[2] - a[2]));
  const last = (c: { y: number; h: number }[]) => (c.length ? c[c.length - 1]!.y + Math.max(c[c.length - 1]!.h, minSlot) : 0);
  const height = Math.max(minHeight, Math.ceil(Math.max(last(matCol), last(destCol)) + pad));
  const inputH = total * sc;
  const x0 = 120;
  const x1 = 330;
  const x2 = 520;
  const bw = 12;
  const band = (xa: number, ya: number, xb: number, yb: number, th: number) => {
    const mx = (xa + xb) / 2;
    return `M${xa},${ya + th / 2} C${mx},${ya + th / 2} ${mx},${yb + th / 2} ${xb},${yb + th / 2}`;
  };
  const destY = new Map(destCol.map((d) => [d.k, d.y]));
  const paths: { d: string; color: string; w: number; key: string }[] = [];
  let iy = pad;
  for (const n of matCol) {
    paths.push({ key: `in-${n.k}`, d: band(x0 + bw, iy, x1, n.y, n.h), color: n.v.color, w: n.h });
    iy += n.h;
    let my = n.y;
    for (const f of flows.filter((x) => x.material === n.k)) {
      const th = f.kg * n.sc;
      const dy = destY.get(f.destination) ?? pad;
      paths.push({ key: `out-${n.k}-${f.destination}`, d: band(x1 + bw, my, x2, dy, th), color: n.v.color, w: th });
      destY.set(f.destination, dy + th);
      my += th;
    }
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={title}>
      {paths.map((p) => (
        <path key={p.key} d={p.d} stroke={p.color} strokeOpacity={0.45} strokeWidth={Math.max(p.w, 1)} fill="none" />
      ))}
      <rect x={x0} y={pad} width={bw} height={inputH} rx={3} fill="var(--color-forest-700)" />
      <text x={x0 - 8} y={pad + inputH / 2 + 4} textAnchor="end" className="fill-ink text-[13px] font-semibold">
        {inputLabel}
      </text>
      {matCol.map((n) => (
        <g key={n.k}>
          <rect x={x1} y={n.y} width={bw} height={n.h} rx={2} fill={n.v.color} />
          <text x={x1 - 6} y={n.y + Math.max(n.h, 10) / 2 + 4} textAnchor="end" className="fill-ink text-[12px]">
            {n.v.label}
          </text>
        </g>
      ))}
      {destCol.map((n) => (
        <g key={n.k}>
          <rect x={x2} y={n.y} width={bw} height={n.h} rx={2} fill="var(--color-ink)" opacity={0.75} />
          <text x={x2 + bw + 6} y={n.y + Math.max(n.h, 10) / 2 + 4} className="fill-ink text-[12px]">
            {n.k}
          </text>
        </g>
      ))}
    </svg>
  );
}
