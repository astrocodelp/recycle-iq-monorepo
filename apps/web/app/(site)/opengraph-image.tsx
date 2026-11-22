import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'RecycleIQ: Τι πάει πού; Σκάναρε, γράψε ή ρώτα. Κάδος, γιατί, και ο πιο κοντινός.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C7A44"/><stop offset="1" stop-color="#0F4A27"/></linearGradient></defs><rect width="32" height="32" rx="9.5" fill="url(#g)"/><path d="M22.2 11.6A8 8 0 1 0 24 16.4" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/><path d="M23.4 6.9 23.2 12.6 17.6 11.7Z" fill="#fff"/><path d="M17.2 17.2C19.6 15.6 24.4 15.8 25.4 21.6 19.6 22.6 16.6 20.4 17.2 17.2Z" fill="#C7F36B"/><path d="M18.4 18.6 22.6 20.4" stroke="#166534" stroke-width="1" stroke-linecap="round" opacity=".55"/></svg>`;

/** Social card for the landing page, drawn at build time in the brand font (Commissioner has the Greek glyphs). */
export default async function Image() {
  const dir = join(process.cwd(), 'app/(site)/_og');
  const [extra, semi] = await Promise.all([
    readFile(join(dir, 'Commissioner-ExtraBold.ttf')),
    readFile(join(dir, 'Commissioner-SemiBold.ttf')),
  ]);
  const bins = [
    ['#2563EB', 'Μπλε'],
    ['#8A5A2B', 'Καφέ'],
    ['#4D6B57', 'Πράσινος'],
    ['#E0772A', 'Ειδικά'],
    ['#6D5BD0', 'Ογκώδη'],
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#F8F9F6',
          fontFamily: 'Commissioner',
          color: '#17211D',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -160,
            top: -120,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: 'radial-gradient(circle at center, #D4F58A 0%, #E6F7BE 22%, #F8F9F6 48%)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(mark)}`} width={72} height={72} alt="" />
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, letterSpacing: -1.5 }}>
              Recycle<span style={{ color: '#2A9757' }}>IQ</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', fontSize: 132, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>
              Τι πάει&nbsp;
              <span style={{ display: 'flex', background: 'linear-gradient(transparent 58%, #C7F36B 58%, #C7F36B 92%, transparent 92%)' }}>πού;</span>
            </div>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: '#5E6B64', maxWidth: 820, lineHeight: 1.3 }}>
              Σκάναρε, γράψε ή ρώτα. Σε ποιον κάδο, γιατί, και πού είναι ο πιο κοντινός.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {bins.map(([c, l]) => (
                <div
                  key={l}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 18px 10px 12px',
                    borderRadius: 999,
                    background: '#FFFFFF',
                    border: '2px solid #E4E8E1',
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 999, background: c }} />
                  {l}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, color: '#5E6B64' }}>Apps4Athens 2026</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Commissioner', data: extra, weight: 800, style: 'normal' },
        { name: 'Commissioner', data: semi, weight: 600, style: 'normal' },
      ],
    },
  );
}
