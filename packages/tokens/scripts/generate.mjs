// Generates src/theme.css (Tailwind v4 @theme) and src/tokens.ts from tokens.json.
// Run `pnpm tokens` after editing tokens.json. `--check` fails if the outputs are stale (used in CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const check = process.argv.includes('--check');

const rawColors = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value.light]));
const resolve = (v) => {
  const m = /^\{(.+)\}$/.exec(v);
  return m ? resolve(rawColors[m[1]]) : v;
};
const colors = Object.fromEntries(Object.entries(rawColors).map(([k, v]) => [k, resolve(v)]));
const strip = (name, prefix) => (name.startsWith(prefix) ? name.slice(prefix.length) : name);
const radius = Object.fromEntries(tokens.radius.tokens.map((t) => [strip(t.name, 'radius-'), t.value]));
const shadow = Object.fromEntries(tokens.shadow.tokens.map((t) => [strip(t.name, 'shadow-'), t.value]));
const spacing = Object.fromEntries(tokens.spacing.tokens.map((t) => [t.name, t.value]));
const fonts = tokens.type.families;
const typeStyles = tokens.type.groups.flatMap((g) =>
  g.styles.map((s) => ({ ...s, family: g.family })),
);

const header = '/* Generated from tokens.json by scripts/generate.mjs. Do not edit by hand. */\n';

let css = header + '@theme {\n';
css += `  --font-sans: ${fonts.sans};\n  --font-mono: ${fonts.mono};\n\n`;
for (const [k, v] of Object.entries(colors)) css += `  --color-${k}: ${v};\n`;
css += '\n';
for (const [k, v] of Object.entries(radius)) css += `  --radius-${k}: ${v};\n`;
css += '\n';
for (const [k, v] of Object.entries(shadow)) css += `  --shadow-${k}: ${v};\n`;
css += '\n';
for (const s of typeStyles) {
  css += `  --text-${s.name}: ${s.fontSize};\n`;
  css += `  --text-${s.name}--line-height: ${s.lineHeight};\n`;
  if (s.fontWeight) css += `  --text-${s.name}--font-weight: ${s.fontWeight};\n`;
  if (s.letterSpacing) css += `  --text-${s.name}--letter-spacing: ${s.letterSpacing};\n`;
}
css += '}\n';

const ts =
  header.replace('/*', '//').replace(' */', '') +
  `export const colors = ${JSON.stringify(colors, null, 2)} as const;\n\n` +
  `export const radius = ${JSON.stringify(radius, null, 2)} as const;\n\n` +
  `export const shadow = ${JSON.stringify(shadow, null, 2)} as const;\n\n` +
  `export const spacing = ${JSON.stringify(spacing, null, 2)} as const;\n\n` +
  `export const fontFamily = ${JSON.stringify(fonts, null, 2)} as const;\n\n` +
  `export const typeScale = ${JSON.stringify(
    Object.fromEntries(
      typeStyles.map((s) => [
        s.name,
        {
          family: s.family,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          fontWeight: s.fontWeight,
          letterSpacing: s.letterSpacing,
        },
      ]),
    ),
    null,
    2,
  )} as const;\n\n` +
  `export type ColorToken = keyof typeof colors;\n` +
  `export type CategoryId = 'packaging' | 'organic' | 'general' | 'special' | 'bulky';\n\n` +
  `/** Solid and soft fill per disposal category. A closed system of five. */\n` +
  `export const categoryColors: Record<CategoryId, { solid: string; soft: string }> = {\n` +
  ['packaging', 'organic', 'general', 'special', 'bulky']
    .map((c) => `  ${c}: { solid: colors['cat-${c}'], soft: colors['cat-${c}-soft'] },\n`)
    .join('') +
  `};\n`;

const outputs = [
  [join(root, 'src/theme.css'), css],
  [join(root, 'src/tokens.ts'), ts],
];
let stale = false;
for (const [file, content] of outputs) {
  if (check) {
    let current = '';
    try {
      current = readFileSync(file, 'utf8');
    } catch {}
    if (current !== content) {
      console.error(`stale: ${file} (run pnpm tokens)`);
      stale = true;
    }
  } else {
    writeFileSync(file, content);
    console.log(`wrote ${file}`);
  }
}
if (stale) process.exit(1);
