import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ ...props }: any) => <img {...props} />,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  useMotionValue: () => ({ set: vi.fn() }),
  useTransform: () => ({ get: () => '0deg' }),
}));

global.fetch = vi.fn();

describe('HomePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => '[]'),
        setItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<HomePage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders hero section after loading', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => [] } as Response);
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText(/Make Your Voice/)).toBeInTheDocument();
      expect(screen.getByText(/Heard/)).toBeInTheDocument();
    });
  });

  it('renders CTA button linking to /surveys', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => [] } as Response);
    render(<HomePage />);
    await waitFor(() => {
      const cta = screen.getByText('START NOW');
      expect(cta).toBeInTheDocument();
      expect(cta.closest('a')).toHaveAttribute('href', '/surveys');
    });
  });

  it('renders survey cards when surveys are available', async () => {
    const mockSurveys = [
      { id: 'survey-1', title: 'Test Survey', description: 'A test survey', estimated_minutes: 5, is_active: true },
    ];
    vi.mocked(fetch).mockResolvedValue({ json: async () => mockSurveys } as Response);
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('Test Survey')).toBeInTheDocument();
    });
  });
});