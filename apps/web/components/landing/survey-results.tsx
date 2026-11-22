import type { Share, SurveyHighlights } from '@/lib/survey-stats';
import { Container, Label, SectionHead, type T } from './ui';

const pct = (s: Share) => Math.round((s.k / Math.max(s.of, 1)) * 100);

/** What residents told us in the anonymous survey: three results, with the counts and the sample size in view. */
export function SurveyResults({ t, stats }: { t: T; stats: SurveyHighlights }) {
  const items = [
    {
      share: stats.unknown,
      tag: t('Δυσκολία', 'Difficulty'),
      text: t('δεν ξέρουν τι πάει πού', "don't know what goes where"),
    },
    {
      share: stats.simple,
      tag: t('Τι θα βοηθούσε', 'What would help'),
      text: t('θέλουν πολύ απλά ελληνικά, με εικόνες', 'want very simple Greek, with pictures'),
    },
    {
      share: stats.trees,
      tag: t('Τι παρακινεί', 'What motivates'),
      text: t('θα παρακινούνταν πολύ αν ο Δήμος φύτευε δέντρα στη γειτονιά τους', 'would be strongly motivated if the city planted trees in their neighbourhood'),
    },
  ].filter((i): i is typeof i & { share: Share } => i.share !== null && i.share.of > 0);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="results-title" className="py-20 sm:py-28">
      <Container className="flex flex-col gap-10">
        <SectionHead
          id="results-title"
          eyebrow={t('Ρωτήσαμε τους κατοίκους', 'We asked residents')}
          title={t('Τι μας είπαν οι κάτοικοι.', 'What residents told us.')}
          lead={t(
            `Ανώνυμη έρευνα, ${stats.n} απαντήσεις. Σχεδιάζουμε το RecycleIQ γύρω από αυτά.`,
            `An anonymous survey, ${stats.n} answers. We are designing RecycleIQ around them.`,
          )}
        />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {items.map((i) => (
            <li key={i.tag} className="lp-reveal flex flex-col gap-3 rounded-card bg-surface p-6 ring-1 ring-line">
              <p className="text-[12px] font-bold tracking-[0.14em] text-forest-700 uppercase">{i.tag}</p>
              <p className="num text-[56px] leading-none font-extrabold tracking-[-0.04em] text-forest-700">{pct(i.share)}%</p>
              <p className="text-[17px] leading-snug font-semibold text-ink">{i.text}</p>
              <p className="num text-[13px] font-medium text-muted">{t(`${i.share.k} από ${i.share.of} που απάντησαν`, `${i.share.k} of ${i.share.of} who answered`)}</p>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-muted">
          <Label>{t('Μικρό δείγμα · ενδεικτικό', 'Small sample · indicative')}</Label>
          {t(
            'Δημόσια φόρμα, κυρίως μέσω LinkedIn, όχι αντιπροσωπευτικό δείγμα. Το πιλοτικό θα μετρήσει πραγματικούς κατοίκους.',
            'Public form, mostly shared on LinkedIn, not a representative sample. The pilot will measure real residents.',
          )}
        </p>
      </Container>
    </section>
  );
}
