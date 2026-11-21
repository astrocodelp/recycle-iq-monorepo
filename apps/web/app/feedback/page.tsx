import type { Metadata, Viewport } from 'next';
import { SurveyForm } from '@/components/survey-form';

export const metadata: Metadata = {
  title: 'Πες μας τη γνώμη σου',
  description: 'RecycleIQ: 3 λεπτά για να γίνει η ανακύκλωση πιο εύκολη για όλους στην Αθήνα. Προσβασιμότητα και ανταμοιβές. Ανώνυμο.',
  openGraph: {
    title: 'RecycleIQ: Πώς να γίνει η ανακύκλωση πιο εύκολη για όλους;',
    description: '3 λεπτά, ανώνυμα. Πες μας τι σε δυσκολεύει και τι θα σε έκανε να ανακυκλώνεις συχνότερα.',
    type: 'website',
    locale: 'el_GR',
  },
};
export const viewport: Viewport = { themeColor: '#0F1915' };

/** Public resident survey, Typeform-style (shared on LinkedIn and elsewhere). Answers go to the dashboard's "Έρευνα κατοίκων". */
export default async function Feedback({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  return (
    <main>
      <SurveyForm source={src ?? null} />
    </main>
  );
}
