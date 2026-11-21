import { Fragment, type ReactNode } from 'react';

/** Inline **bold**, *italic* and `code`, built as React nodes (no HTML injection). */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={`${key}-${i++}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={`${key}-${i++}`} className="rounded bg-surface-2 px-1 text-[12px]">{tok.slice(1, -1)}</code>);
    else out.push(<em key={`${key}-${i++}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A small Markdown subset for assistant replies: paragraphs, bullet and numbered lists, tables, headings. */
export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) {
        const cells = lines[i]!.trim().slice(1, -1).split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={`t${i}`} className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            {head && (
              <thead>
                <tr>{head.map((c, j) => <th key={j} className="border-b border-line px-2 py-1 font-semibold">{inline(c, `h${i}${j}`)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {body.map((r, k) => (
                <tr key={k}>{r.map((c, j) => <td key={j} className="border-b border-line px-2 py-1">{inline(c, `c${i}${k}${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
        i++;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={`l${i}`} className={`${ordered ? 'list-decimal' : 'list-disc'} flex flex-col gap-0.5 pl-5`}>
          {items.map((it, k) => <li key={k}>{inline(it, `li${i}${k}`)}</li>)}
        </List>,
      );
      continue;
    }
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    if (h) {
      blocks.push(<p key={`h${i}`} className="font-bold">{inline(h[1]!, `hh${i}`)}</p>);
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]!) && !/^\s*\|/.test(lines[i]!)) {
      para.push(lines[i]!);
      i++;
    }
    blocks.push(
      <p key={`p${i}`}>
        {para.map((p, k) => (
          <Fragment key={k}>
            {k > 0 && <br />}
            {inline(p, `p${i}${k}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="flex flex-col gap-2">{blocks}</div>;
}
