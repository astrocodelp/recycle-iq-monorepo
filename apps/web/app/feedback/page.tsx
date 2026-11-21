import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
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

/** Public resident survey (shared on LinkedIn and elsewhere). Answers go to the dashboard's "Έρευνα κατοίκων". */
export default async function Feedback({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-5 py-8 sm:py-12">
      <Logo />
      <header className="flex flex-col gap-2">
        <p className="eyebrow">Apps4Athens 2026 · RecycleIQ</p>
        <h1 className="text-[30px] leading-tight font-bold">Πώς να γίνει η ανακύκλωση πιο εύκολη για όλους;</h1>
        <p className="text-body text-muted">
          Φτιάχνουμε το RecycleIQ για τους κατοίκους της Αθήνας: σκανάρεις ένα αντικείμενο και μαθαίνεις σε ποιον κάδο πάει, πού είναι ο πιο κοντινός και
          τι κερδίζει η γειτονιά σου. Θέλουμε τη γνώμη σου για δύο πράγματα: πώς να τη χρησιμοποιεί ο καθένας, και τι θα σε έκανε να ανακυκλώνεις συχνότερα.
        </p>
        <p className="text-caption text-muted">
          Περίπου 3 λεπτά. Ανώνυμο: δεν κρατάμε όνομα ή τοποθεσία. Το email στο τέλος είναι προαιρετικό, μόνο για το πιλοτικό.{' '}
          <a href="/app" className="underline underline-offset-4">
            Δοκίμασε την εφαρμογή
          </a>
          .
        </p>
      </header>
      <SurveyForm source={src ?? null} />
    </main>
  );
}
