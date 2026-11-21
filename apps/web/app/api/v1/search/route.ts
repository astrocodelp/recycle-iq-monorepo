import { searchObjects } from '@recycleiq/engine';

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  return Response.json({
    query: q,
    results: searchObjects(q)
      .slice(0, 8)
      .map((h) => ({ id: h.object.id, name: h.object.name, icon: h.object.icon, score: h.score })),
  });
}
