import { categoryColors } from '@recycleiq/tokens';
import { ArrowRight, Info, Keyboard, MapPin, Mic, ScanLine, Sparkles, Trash2 } from 'lucide-react';
import { Container, SectionHead, TextLink, type T } from './ui';

/** «Δεν ξέρω τι πάει πού»: the problem, with the first survey numbers stated as what they are. */
export function Problem({ t }: { t: T }) {
  const bins = [
    { color: categoryColors.packaging.solid, label: t('Μπλε κάδος', 'Blue bin') },
    { color: categoryColors.organic.solid, label: t('Καφέ κάδος', 'Brown bin') },
    { color: categoryColors.general.solid, label: t('Πράσινος κάδος', 'Green bin') },
    { color: categoryColors.special.solid, label: t('Ειδική συλλογή', 'Special collection') },
    { color: categoryColors.bulky.solid, label: t('Ογκώδη', 'Bulky waste') },
  ];
  return (
    <section aria-labelledby="problem" className="border-y border-line bg-surface py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <SectionHead
            id="problem"
            eyebrow={t('Το πρόβλημα', 'The problem')}
            title={t('«Δεν ξέρω τι πάει πού.»', '“I don’t know what goes where.”')}
            lead={t(
              'Μπλε, καφέ, πράσινος, καμπάνα γυαλιού, ειδικά σημεία. Οι κανόνες αλλάζουν από γειτονιά σε γειτονιά και κανείς δεν τους θυμάται όλους. Έτσι πολλά καταλήγουν στον λάθος κάδο.',
              'Blue, brown, green, glass bells, special drop-off points. The rules change from one neighbourhood to the next and nobody remembers them all, so a lot ends up in the wrong bin.',
            )}
          />
          <ul className="lp-reveal mt-8 flex flex-wrap gap-2" aria-label={t('Οι κάδοι της Αθήνας', 'Bins in Athens')}>
            {bins.map((b) => (
              <li key={b.label} className="flex items-center gap-2 rounded-pill bg-paper py-1.5 pr-3.5 pl-1.5 text-[14px] font-semibold text-ink ring-1 ring-line">
                <span className="grid size-6 place-items-center rounded-full" style={{ background: b.color }} aria-hidden>
                  <Trash2 size={13} className="text-white" />
                </span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
        <figure className="lp-reveal rounded-card-lg bg-canvas p-7 text-white shadow-lift">
          <p className="num text-[64px] leading-none font-bold tracking-[-0.04em]">
            4<span className="text-white/40">/7</span>
          </p>
          <figcaption className="mt-4 text-[16px] leading-snug font-semibold text-white/90">
            {t(
              'από τις πρώτες απαντήσεις στην έρευνά μας λένε ότι αυτό είναι το μεγαλύτερο εμπόδιο.',
              'of the first answers to our survey name this as the biggest barrier.',
            )}
          </figcaption>
          <p className="mt-3 text-[13px] font-medium text-white/65">
            {t('Μικρό δείγμα, η έρευνα συνεχίζεται.', 'A small sample; the survey is still open.')}
          </p>
          <div className="mt-5">
            <TextLink href="/feedback?src=landing" tone="dark">
              {t('Απάντησε κι εσύ', 'Add your answer')}
            </TextLink>
          </div>
        </figure>
      </Container>
    </section>
  );
}

export function HowItWorks({ t }: { t: T }) {
  const inputs = [
    {
      Icon: ScanLine,
      title: t('Σκάναρε', 'Scan'),
      body: t(
        'Φωτογράφισε το αντικείμενο. Ένα μοντέλο όρασης το αναγνωρίζει και εσύ επιβεβαιώνεις με ένα πάτημα. Χωρίς δίκτυο, η εφαρμογή κινητού το αναγνωρίζει μόνη της.',
        'Take a photo. A vision model recognises the item and you confirm with one tap. Offline, the phone app recognises it on its own.',
      ),
    },
    {
      Icon: Keyboard,
      title: t('Γράψε', 'Type'),
      body: t('«Κουτί πίτσας», «μπαταρία», «καναπές». Όπως το λες.', '“Pizza box”, “battery”, “sofa”. Just as you’d say it.'),
    },
    {
      Icon: Mic,
      title: t('Ρώτα με τη φωνή', 'Ask out loud'),
      body: t('Πάτα το μικρόφωνο και ρώτα στα ελληνικά.', 'Tap the mic and ask in Greek.'),
    },
  ];
  const outputs = [
    { Icon: Trash2, title: t('Ποιος κάδος', 'Which bin'), body: t('Με χρώμα και όνομα, ποτέ μόνο με χρώμα.', 'Colour and name, never colour alone.') },
    { Icon: Info, title: t('Γιατί', 'Why'), body: t('Ο κανόνας του Δήμου, σε απλά λόγια.', 'The city’s rule, in plain words.') },
    { Icon: MapPin, title: t('Πού', 'Where'), body: t('Ο πιο κοντινός κάδος ή σημείο στον χάρτη.', 'The nearest bin or drop-off point on the map.') },
  ];
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <SectionHead
          id="how-title"
          eyebrow={t('Πώς δουλεύει', 'How it works')}
          title={t('Τρεις τρόποι να ρωτήσεις. Μία καθαρή απάντηση.', 'Three ways to ask. One clear answer.')}
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <ol className="grid gap-3">
            {inputs.map(({ Icon, title, body }) => (
              <li key={title} className="lp-reveal card flex gap-4 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-control bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                  <Icon size={22} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed font-medium text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-center py-1 lg:px-2" aria-hidden>
            <span className="grid size-12 place-items-center rounded-full bg-canvas text-lime shadow-lift">
              <ArrowRight size={22} className="rotate-90 lg:rotate-0" />
            </span>
          </div>
          <div className="lp-reveal flex flex-col rounded-card-lg bg-canvas p-6 text-white sm:p-7">
            <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.14em] text-lime uppercase">
              <Sparkles size={15} aria-hidden />
              {t('Η απάντηση', 'The answer')}
            </p>
            <ul className="mt-5 grid flex-1 gap-5">
              {outputs.map(({ Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-control bg-white/10 text-lime ring-1 ring-white/15">
                    <Icon size={22} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[17px] font-bold tracking-[-0.02em]">{title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed font-medium text-white/75">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-5 text-[14px] leading-relaxed font-medium text-white/70">
              {t(
                'Η εφαρμογή δείχνει και πώς αποφάσισε, βήμα βήμα. Το μοντέλο προτείνει, εσύ επιβεβαιώνεις.',
                'The app also shows how it decided, step by step. The model suggests; you confirm.',
              )}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
