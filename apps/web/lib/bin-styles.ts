import 'server-only';
import { binStyles, eq, getDb } from '@recycleiq/db';
import { type BinKey, type BinStyle, isBinKey, isHexColor, mergeBins } from '@recycleiq/engine';
import type { L10n } from '@recycleiq/engine';

/** The municipality's bin names and colours (defaults where nothing is set). Never fails a decision. */
export async function getBinStyles(): Promise<Record<BinKey, BinStyle>> {
  try {
    const rows = await getDb().select().from(binStyles);
    return mergeBins(rows.filter((r) => isBinKey(r.key)).map((r) => ({ key: r.key as BinKey, name: r.name, color: r.color })));
  } catch {
    return mergeBins();
  }
}

export async function saveBinStyle(key: string, name: L10n, color: string, by: string) {
  if (!isBinKey(key)) throw new Error('Unknown bin');
  if (!isHexColor(color)) throw new Error('Colour must be #RRGGBB');
  const clean = { el: name.el.trim().slice(0, 60), en: name.en.trim().slice(0, 60) };
  if (!clean.el || !clean.en) throw new Error('Name is required');
  await getDb()
    .insert(binStyles)
    .values({ key, name: clean, color, updatedBy: by })
    .onConflictDoUpdate({ target: binStyles.key, set: { name: clean, color, updatedBy: by, updatedAt: new Date() } });
}

export async function resetBinStyle(key: string) {
  if (!isBinKey(key)) throw new Error('Unknown bin');
  await getDb().delete(binStyles).where(eq(binStyles.key, key));
}
