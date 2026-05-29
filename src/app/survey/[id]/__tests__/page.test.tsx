import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SurveyPage from '../page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-survey-id' }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
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
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  Reorder: { Group: ({ children }: any) => <div>{children}</div>, Item: ({ children }: any) => <div>{children}</div> },
}));

vi.mock('lucide-react', () => ({
  ArrowRight: ({ className }: any) => <span className={className}>→</span>,
  CheckCircle2: ({ className }: any) => <span className={className}>✓</span>,
  FileText: ({ className }: any) => <span className={className}>📄</span>,
  Download: ({ className }: any) => <span className={className}>⬇</span>,
}));

vi.mock('html-react-parser', () => ({
  default: (html: string) => <span>{html}</span>,
  domToReact: (nodes: any[]) => <>{nodes.map((n, i) => <span key={i}>{n.data}</span>)}</>,
  Element: () => null,
  Text: () => null,
}));

global.fetch = vi.fn();
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

describe('SurveyPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPush.mockClear();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() },
      writable: true,
    });
  });

  it('shows loading spinner initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<SurveyPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error when survey not found', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Not found'));
    render(<SurveyPage />);
    await waitFor(() => {
      expect(screen.getByText('Survey not found or unavailable.')).toBeInTheDocument();
    });
  });

  it('renders survey welcome screen when loaded', async () => {
    const mockSurvey = {
      id: 'test-survey-id', title: 'Test Survey', description: 'Test description',
      estimated_minutes: 5,
      questions: [{ id: 'q1', question_text: 'What is your favorite color?', type: 'multiple_choice', options: { choices: ['Red', 'Blue', 'Green'] }, is_required: true }],
    };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => mockSurvey } as Response);
    render(<SurveyPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Survey')).toBeInTheDocument();
      expect(screen.getByText('Start Survey')).toBeInTheDocument();
    });
  });

  it('shows already completed message for completed surveys', async () => {
    const mockSurvey = { id: 'test-survey-id', title: 'Test Survey', questions: [] };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => mockSurvey } as Response);
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn(() => JSON.stringify(['test-survey-id'])), setItem: vi.fn() },
      writable: true,
    });
    render(<SurveyPage />);
    await waitFor(() => {
      expect(screen.getByText('Already Completed')).toBeInTheDocument();
    });
  });
});
