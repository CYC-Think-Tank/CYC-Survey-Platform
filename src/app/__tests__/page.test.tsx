import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '../page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LayoutGroup: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => true,
  useScroll: () => ({ scrollYProgress: { get: () => 0, on: () => () => {} } }),
  useTransform: () => ({ get: () => 0, on: () => () => {} }),
  useSpring: (v: unknown) => v,
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: () => {},
    on: () => () => {},
  }),
  useAnimationFrame: () => {},
}));

vi.mock('@/components/EventRaffleBanner', () => ({
  EventRaffleBanner: () => null,
}));

// The macbook showcase and its demo are a visual flourish with no
// user-facing assertions of their own — keep the landing test focused on
// the hero/CTA and avoid dragging in the scroll-linked animation machinery.
vi.mock('@/components/ui/macbook-scroll', () => ({
  MacbookScroll: ({ children }: any) => <div>{children}</div>,
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders hero heading', () => {
    render(<HomePage />);
    expect(screen.getByText(/Make Your Voice/)).toBeInTheDocument();
    // FlipWords renders the word letter-by-letter, so match on combined text.
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent?.replace(/\s+/g, '')).toContain('Heard.');
  });

  it('renders CTA button linking to /surveys', () => {
    render(<HomePage />);
    // "Browse surveys" appears in both the hero and the closing CTA band.
    const ctas = screen.getAllByText('Browse surveys');
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta.closest('a')).toHaveAttribute('href', '/surveys');
    }
  });

  it('renders the raffle incentive line', () => {
    render(<HomePage />);
    expect(screen.getByText(/1 Survey = 1 Entry/)).toBeInTheDocument();
  });
});
