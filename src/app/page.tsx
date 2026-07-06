'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { FlipWords } from '@/components/ui/flip-words';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { EventRaffleBanner } from '@/components/EventRaffleBanner';
import Reveal from '@/components/Reveal';
import Button from '@/components/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
import SampleSurveyDemo from '@/components/SampleSurveyDemo';
import { ClipboardList, MousePointerClick, Gift, ArrowRight } from 'lucide-react';

/**
 * Background slideshow images. Drop files into public/hero/ and list them
 * here — missing files are skipped gracefully until they're added.
 */
const HERO_IMAGES = [
  '/hero/hero1.jpg',
  '/hero/hero2.jpg',
  '/hero/hero3.jpg',
  '/hero/hero4.jpg',
  '/hero/hero5.jpg',
  '/hero/hero6.jpg',
];
const SLIDE_MS = 6000;

const CAROUSEL_ITEM_HEIGHT = 460;
const CAROUSEL_GAP = 28;
const CAROUSEL_SPEED = 42; // px of track travel per second

/** Full-height, continuously-scrolling vertical filmstrip — no discrete
 *  steps, no rotation. A CSS mask fades the top and bottom of the container
 *  so only photos near the vertical center read as fully visible; the fade
 *  is purely positional (via the mask), so it applies to whichever photo is
 *  passing through that band as the strip drifts, not any specific one. */
function HeroPhotoCarousel() {
  const reduce = useReducedMotion();
  const [images, setImages] = useState<string[]>([]);

  // Preload; only keep images that actually exist.
  useEffect(() => {
    let alive = true;
    HERO_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.onload = () => {
        if (!alive) return;
        setImages((prev) =>
          prev.includes(src)
            ? prev
            : [...prev, src].sort((a, b) => HERO_IMAGES.indexOf(a) - HERO_IMAGES.indexOf(b))
        );
      };
      img.src = src;
    });
    return () => {
      alive = false;
    };
  }, []);

  const progress = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if (reduce || images.length === 0) return;
    progress.set(progress.get() + (delta / 1000) * CAROUSEL_SPEED);
  });

  const unit = CAROUSEL_ITEM_HEIGHT + CAROUSEL_GAP;
  const loopDistance = Math.max(images.length, 1) * unit;
  const y = useTransform(progress, (v) => -(((v % loopDistance) + loopDistance) % loopDistance));

  if (images.length === 0) return null;

  // Two copies keep the strip filled through the wrap — one set's total
  // height already dwarfs the viewport, so no gap is ever visible.
  const track = [...images, ...images];

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
      }}
      aria-hidden
    >
      <motion.div
        className="mx-auto flex w-full max-w-md flex-col items-center"
        style={{ y, gap: CAROUSEL_GAP }}
      >
        {track.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="w-full shrink-0 overflow-hidden rounded-2xl shadow-cute"
            style={{ height: CAROUSEL_ITEM_HEIGHT }}
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** Full-bleed crossfading photo backdrop with a dark scrim for text contrast. */
function HeroSlideshow() {
  const reduce = useReducedMotion();
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  // Preload; only keep images that actually exist.
  useEffect(() => {
    let alive = true;
    HERO_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.onload = () => {
        if (!alive) return;
        setImages((prev) =>
          prev.includes(src)
            ? prev
            : [...prev, src].sort((a, b) => HERO_IMAGES.indexOf(a) - HERO_IMAGES.indexOf(b))
        );
      };
      img.src = src;
    });
    return () => {
      alive = false;
    };
  }, []);

  // Advance the slideshow.
  useEffect(() => {
    if (reduce || images.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [images.length, reduce]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#101014]" aria-hidden>
      {images.map((src, i) => (
        <img key={src} src={src} alt="" className={cnFade(i === index % images.length)} />
      ))}
      {/* scrim: base darken + bottom-weighted gradient + center vignette so the
          hero copy stays legible no matter which photo is showing */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/55" />
      <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/50" />
    </div>
  );
}

function cnFade(active: boolean) {
  return [
    'absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out',
    active ? 'opacity-100' : 'opacity-0',
  ].join(' ');
}

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Pick a survey',
    body: 'Browse active research surveys from partner organizations across Canada.',
  },
  {
    icon: MousePointerClick,
    title: 'Share your perspective',
    body: 'Answer a few quick questions — most surveys take under 10 minutes.',
  },
  {
    icon: Gift,
    title: 'Get entered to win',
    body: 'Every completed survey is one entry into our $100 raffle, with 5 winners each round.',
  },
];

const STATS = [
  { value: '12+', label: 'Surveys published' },
  { value: '1,000+', label: 'Youth voices heard' },
  { value: '$100 × 5', label: 'Raffle prizes per survey' },
];

/** Numbered "how it works" steps. */
function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section
      id="how-it-works"
      className="w-full max-w-6xl mx-auto scroll-mt-24 px-6 py-24 sm:px-8 sm:py-32"
    >
      <SectionHeading
        eyebrow={t('How it works')}
        title={t('Three steps to make an impact')}
        className="mb-14 text-center items-center"
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.12}>
            <div className="relative flex h-full flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-cute-sm">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 font-display text-xs font-semibold text-cream shadow-cute-sm">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-soft">
                <step.icon className="h-7 w-7 text-teal" />
              </span>
              <h3 className="mt-5 font-display text-lg font-medium tracking-tight text-ink">
                {t(step.title)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t(step.body)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Live-feeling "watch a survey in action" showcase inside a scroll-tilted laptop. */
function SurveyShowcase() {
  const { t } = useLanguage();
  return (
    <section className="w-full bg-navy-soft/40">
      <div className="mx-auto max-w-6xl px-6 pt-20 sm:px-8">
        <SectionHeading
          eyebrow={t('See it in action')}
          title={t('Take a survey in under 2 minutes')}
          className="text-center items-center"
        />
      </div>
      <MacbookScroll
        showGradient={false}
        title={<span className="sr-only">{t('Take a survey in under 2 minutes')}</span>}
      >
        <SampleSurveyDemo />
      </MacbookScroll>
    </section>
  );
}

/** Bold navy stat band. */
function StatsBand() {
  const { t } = useLanguage();
  return (
    <section className="w-full border-y border-white/10 bg-[#101014] py-20 text-white">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 text-center sm:grid-cols-3 sm:px-8">
        {STATS.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.12}>
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl font-normal tracking-tighter sm:text-5xl">
                {stat.value}
              </span>
              <span className="mt-2 text-sm font-medium uppercase tracking-wide text-white/60">
                {t(stat.label)}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Closing call-to-action. */
function FinalCta() {
  const { t } = useLanguage();
  return (
    <section className="w-full px-6 py-24 sm:px-8 sm:py-32">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center rounded-[2.5rem] bg-gold-soft px-8 py-16 text-center shadow-cute sm:px-16">
        <h2 className="font-display text-3xl font-normal tracking-tighter text-ink sm:text-4xl">
          {t('Ready to make your voice heard?')}
        </h2>
        <p className="mt-4 max-w-xl text-base text-ink-soft sm:text-lg">
          {t('Join thousands of Canadian youth shaping the research and policy that affects them.')}
        </p>
        <Button href="/surveys" variant="primary" className="mt-8">
          {t('Browse surveys')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Reveal>
    </section>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const flipWords = [t('Heard.'), t('Count.'), t('Matter.')];

  return (
    <div className="w-full">
      <div className="relative flex min-h-svh w-full flex-col justify-center overflow-hidden px-6 py-32 sm:px-8">
        <HeroSlideshow />

        {/* diagonal photo carousel, over the hero's right half
            (decorative only — hidden on touch-first sizes) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 right-0 hidden w-[60%] lg:block"
        >
          <HeroPhotoCarousel />
        </motion.div>

        {/* Event raffle banner (only shows when arriving via an event QR code) */}
        <EventRaffleBanner />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          {/* left: copy */}
          <div className="flex max-w-xl flex-col items-start text-left">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start tracking-tighter text-white"
            >
              <span className="font-display text-5xl font-normal sm:text-7xl">
                {t('Make Your Voice')}
              </span>
              <span className="relative flex h-[1.25em] items-center justify-start overflow-visible font-script text-6xl font-normal italic sm:text-8xl">
                <FlipWords words={flipWords} className="px-0! text-white" />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-xl text-base font-normal text-white/70 sm:text-lg"
            >
              {t(
                'Share your perspective on issues that matter. Empower Canadian youth through research and policy advocacy.'
              )}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col items-start gap-5"
            >
              <Link
                href="/surveys"
                className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-white px-7 py-2.5 font-display text-base font-semibold leading-6 text-black transition-all duration-200 hover:bg-white/90 sm:text-lg sm:leading-8"
              >
                {t('Browse surveys')}
              </Link>
              <p className="text-xs text-white/50 sm:text-sm">
                {t('1 Survey = 1 Entry')} — {t('Win $100 (5 Winners!)')}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <HowItWorks />
      <SurveyShowcase />
      <StatsBand />
      <FinalCta />
    </div>
  );
}
