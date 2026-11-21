import { CATEGORIES, DEFAULT_ANSWERS, PICKABLE_OBJECTS, getObject } from '@recycleiq/engine';

/** Static catalog: objects with their clarifying question, categories. Cached at the edge. */
export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    objects: PICKABLE_OBJECTS,
    unknown: getObject('unknown'),
    categories: CATEGORIES,
    defaultAnswers: DEFAULT_ANSWERS,
  });
}
