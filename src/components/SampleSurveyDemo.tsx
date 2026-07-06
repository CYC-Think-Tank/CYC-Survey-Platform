'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, MousePointerClick } from 'lucide-react';

interface DemoQuestion {
  question: string;
  options: string[];
  pick: number;
}

const QUESTIONS: DemoQuestion[] = [
  {
    question: 'How connected do you feel to your local community?',
    options: ['Very connected', 'Somewhat connected', 'Not very connected', 'Not at all'],
    pick: 1,
  },
  {
    question: 'Which issue matters most to you right now?',
    options: ['Climate action', 'Mental health', 'Affordable housing', 'Education access'],
    pick: 1,
  },
  {
    question: 'Would you recommend this survey to a friend?',
    options: ['Yes, definitely', 'Maybe', 'No'],
    pick: 0,
  },
];

type Phase = 'idle' | 'moving' | 'selected' | 'done';

/**
 * Silent, autoplaying walkthrough of a fake survey: a cursor glides to an
 * option, clicks it, the progress bar advances, and it loops. Positions are
 * measured off the real rendered buttons so it stays correct if copy wraps.
 */
export default function SampleSurveyDemo() {
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [cursor, setCursor] = useState({ x: 40, y: 40 });
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const q = QUESTIONS[qIndex];

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timeouts.current.push(id);
    };

    setPhase('idle');

    schedule(() => {
      const btn = optionRefs.current[q.pick];
      const container = containerRef.current;
      if (btn && container) {
        const c = container.getBoundingClientRect();
        const b = btn.getBoundingClientRect();
        setCursor({ x: b.right - c.left - 28, y: b.top - c.top + b.height / 2 - 12 });
      }
      setPhase('moving');
    }, 900);

    schedule(() => setPhase('selected'), 1900);

    schedule(() => {
      if (qIndex < QUESTIONS.length - 1) {
        setQIndex((i) => i + 1);
      } else {
        setPhase('done');
        schedule(() => setQIndex(0), 2600);
      }
    }, 3000);

    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  const progress =
    phase === 'done' ? 100 : ((qIndex + (phase === 'selected' ? 1 : 0.4)) / QUESTIONS.length) * 100;

  return (
    <div className="flex h-full w-full flex-col bg-cream text-ink">
      {/* fake browser chrome */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="ml-3 flex-1 truncate rounded-md bg-cream-deep px-3 py-1 text-[11px] text-ink-soft">
          cyc-survey.org/survey/youth-voices
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden px-8 py-7 sm:px-12 sm:py-9"
      >
        {/* progress bar */}
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-teal"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <AnimatePresence mode="wait">
          {phase !== 'done' ? (
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-teal">
                Question {qIndex + 1} of {QUESTIONS.length}
              </span>
              <h3 className="mt-3 font-display text-xl font-medium leading-snug tracking-tight text-ink sm:text-2xl">
                {q.question}
              </h3>

              <div className="mt-6 flex flex-col gap-3">
                {q.options.map((opt, i) => {
                  const active = phase === 'selected' && i === q.pick;
                  return (
                    <button
                      key={opt}
                      type="button"
                      tabIndex={-1}
                      ref={(el) => {
                        optionRefs.current[i] = el;
                      }}
                      className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors duration-300 sm:text-base ${
                        active
                          ? 'border-teal bg-teal-soft text-teal-deep'
                          : 'border-border bg-card text-ink'
                      }`}
                    >
                      {opt}
                      <span
                        className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                          active ? 'border-teal bg-teal' : 'border-border'
                        }`}
                      >
                        {active && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-soft">
                <CheckCircle2 className="h-8 w-8 text-teal" />
              </div>
              <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
                Thanks for your voice!
              </h3>
              <p className="mt-1 text-sm text-ink-soft">Your response has been recorded.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* autoplaying cursor */}
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-10"
          animate={{
            x: cursor.x,
            y: cursor.y,
            opacity: phase === 'idle' ? 0 : 1,
            scale: phase === 'selected' ? 0.85 : 1,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          <MousePointerClick className="h-6 w-6 text-navy drop-shadow-md" fill="white" />
        </motion.div>
      </div>
    </div>
  );
}
