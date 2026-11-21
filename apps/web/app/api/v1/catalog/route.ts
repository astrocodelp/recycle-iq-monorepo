import { CATEGORIES, DEFAULT_ANSWERS, PICKABLE_OBJECTS, getObject } from '@recycleiq/engine';
import { getBinStyles } from '@/lib/bin-styles';

/** Catalog: objects with their clarifying question, categories, and the municipality's bin names and colours. */
export const revalidate = 60;

export async function GET() {
  return Response.json({
    objects: PICKABLE_OBJECTS,
    unknown: getObject('unknown'),
    categories: CATEGORIES,
    defaultAnswers: DEFAULT_ANSWERS,
    bins: await getBinStyles(),
  });
}
