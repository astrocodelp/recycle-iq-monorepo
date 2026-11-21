import { Card } from '@/components/ui';
import { getLang, tr } from '@/lib/lang';

export const metadata = { title: 'API' };

const ENDPOINTS = [
  ['GET', '/api/health', 'Database connectivity check'],
  ['GET', '/api/v1/catalog', 'Objects, clarifying questions, categories (static)'],
  ['GET', '/api/v1/search?q=πίτσα', 'Accent-insensitive Greek/English item search'],
  ['GET', '/api/v1/districts', 'The 38 districts: brown-bin coverage, centre, outline (for on-device neighbourhood lookup)'],
  ['GET', '/api/v1/points?category=special&near=koukaki', 'Collection points, nearest to a neighbourhood first (no coordinates accepted)'],
  ['POST', '/api/v1/decisions', '{ objectId, answers?, districtId?, deviceId?, via? } → explained decision, nearby points, and any neighbourhood story it unlocked. Neighbourhood only, never coordinates.'],
  ['GET', '/api/v1/decisions/:id', 'A stored decision'],
  ['GET', '/api/v1/rules', 'Municipal rule registry and on/off state'],
  ['GET', '/api/v1/leaderboard?period=week&district=…&deviceId=…', 'Top 20 scanners (nicknames only), your rank, top neighbourhoods. Max 20 scans a day count.'],
  ['GET', '/api/v1/stories?district=…&deviceId=…', 'Neighbourhood stories: unlocked after 1, 5, 15, 30, 50 scans there (the reward)'],
  ['GET/POST', '/api/v1/profile', '{ deviceId, nickname } → leaderboard nickname (empty clears it)'],
  ['POST', '/api/v1/bin-reports', '{ pointId, kind: full | overflowing | damaged, deviceId } → alert on the dashboard'],
  ['POST', '/api/v1/service-requests', '{ districtId, deviceId? } → request a brown bin'],
] as const;

export default async function Developers() {
  const t = tr(await getLang());
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <p className="eyebrow">{t('Για προγραμματιστές', 'For developers')}</p>
        <h1 className="mt-1 text-h1">{t('Το API της εφαρμογής', 'The app API')}</h1>
        <p className="mt-1 text-body text-muted">
          {t(
            'Η κινητή εφαρμογή των πολιτών χρησιμοποιεί αυτά τα endpoints. Κάθε σύσταση περνά από τη μηχανή με τους τρέχοντες κανόνες του Δήμου και καταγράφεται ανώνυμα.',
            'The citizen mobile app calls these endpoints. Every recommendation runs through the engine with the current municipal rules and is logged anonymously.',
          )}
        </p>
      </header>
      <Card>
        <table className="w-full text-body">
          <tbody>
            {ENDPOINTS.map(([m, path, desc]) => (
              <tr key={path} className="border-t border-line align-top first:border-0">
                <td className="py-2 pr-3">
                  <code className={`num rounded-pill px-2 py-0.5 text-[11px] ${m === 'GET' ? 'bg-info-soft text-info' : 'bg-forest-50 text-forest-700'}`}>{m}</code>
                </td>
                <td className="num py-2 pr-3 text-[13px] break-all">{path}</td>
                <td className="py-2 text-muted">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
