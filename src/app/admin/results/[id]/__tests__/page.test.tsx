import { render, screen, waitFor, within } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsPage from '../page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'survey-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<{ default: React.ComponentType<{ dots: Array<{ fsa: string }> }> }>
  ) => {
    const DynamicMap = ({ dots }: { dots: Array<{ fsa: string }> }) => (
      <div data-testid="fsa-dot-map">
        {dots.map((dot) => (
          <span key={dot.fsa}>{dot.fsa}</span>
        ))}
      </div>
    );
    DynamicMap.preload = loader;
    return DynamicMap;
  },
}));

global.fetch = vi.fn();

const resultsPayload = {
  survey: { title: 'Community Survey' },
  total_responses: 8,
  questions: [
    {
      id: 'postal-question',
      question_text: 'First 3 postal code symbols',
      type: 'short_answer',
      order_index: 1,
      options: {
        validation: { type: 'postal_code_prefix' },
      },
    },
  ],
};

const renderWithPostalGeoDots = (dots: Array<Record<string, string | number>>) => {
  vi.mocked(fetch)
    .mockResolvedValueOnce({ json: async () => resultsPayload } as Response)
    .mockResolvedValueOnce({
      json: async () => ({
        'postal-question': {
          sample_size: 120,
          texts: [],
          postal_geo: {
            type: 'fsa_dot_map',
            question_id: 'postal-question',
            total_usable: 120,
            matched_count: 120,
            unmatched_count: 3,
            suppressed_count: 52,
            suppressed_fsa_count: 35,
            min_display_count: 5,
            dots,
          },
        },
      }),
    } as Response);

  render(<ResultsPage />);
};

describe('ResultsPage geography summary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders an FSA dot map when postal geography summary data is available', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ json: async () => resultsPayload } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          'postal-question': {
            sample_size: 8,
            texts: ['M5V'],
            postal_geo: {
              type: 'fsa_dot_map',
              question_id: 'postal-question',
              total_usable: 8,
              matched_count: 8,
              unmatched_count: 1,
              suppressed_count: 0,
              suppressed_fsa_count: 0,
              min_display_count: 5,
              dots: [
                {
                  fsa: 'M5V',
                  province: 'Ontario',
                  lat: 43.64,
                  lng: -79.39,
                  count: 8,
                  percentage: 100,
                },
              ],
            },
          },
        }),
      } as Response);

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Response Geography')).toBeInTheDocument();
    });

    expect(screen.getByText(/Approximate postal prefix areas from:/)).toBeInTheDocument();
    const map = screen.getByTestId('fsa-dot-map');
    expect(map).toBeInTheDocument();
    expect(within(map).getByText('M5V')).toBeInTheDocument();
    expect(screen.getAllByText('Ontario').length).toBeGreaterThan(0);
    expect(screen.getByText('Unmatched')).toBeInTheDocument();
  });

  it('renders a no-data state when postal dots are suppressed for privacy', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ json: async () => resultsPayload } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          'postal-question': {
            sample_size: 2,
            texts: ['V6B'],
            postal_geo: {
              type: 'fsa_dot_map',
              question_id: 'postal-question',
              total_usable: 2,
              matched_count: 2,
              unmatched_count: 0,
              suppressed_count: 2,
              suppressed_fsa_count: 1,
              min_display_count: 5,
              dots: [],
            },
          },
        }),
      } as Response);

    render(<ResultsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Not enough matched postal prefix responses to display a privacy-safe map yet/
        )
      ).toBeInTheDocument();
    });
  });

  it('passes nearby GTA FSA dots to the real map component', async () => {
    renderWithPostalGeoDots([
      {
        fsa: 'L6J',
        province: 'Ontario',
        lat: 43.47455,
        lng: -79.6596,
        count: 21,
        percentage: 18.6,
      },
      {
        fsa: 'L6K',
        province: 'Ontario',
        lat: 43.4359,
        lng: -79.68965,
        count: 13,
        percentage: 11.5,
      },
      {
        fsa: 'M5V',
        province: 'Ontario',
        lat: 43.63505,
        lng: -79.40995,
        count: 9,
        percentage: 8,
      },
      {
        fsa: 'L3P',
        province: 'Ontario',
        lat: 43.9054,
        lng: -79.2544,
        count: 7,
        percentage: 6.2,
      },
      {
        fsa: 'L4S',
        province: 'Ontario',
        lat: 43.9269,
        lng: -79.42465,
        count: 6,
        percentage: 5.3,
      },
      {
        fsa: 'L6M',
        province: 'Ontario',
        lat: 43.4373,
        lng: -79.7431,
        count: 5,
        percentage: 4.4,
      },
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('fsa-dot-map')).toBeInTheDocument();
    });

    const map = screen.getByTestId('fsa-dot-map');
    expect(within(map).getByText('L6J')).toBeInTheDocument();
    expect(within(map).getByText('L6K')).toBeInTheDocument();
    expect(within(map).getByText('M5V')).toBeInTheDocument();
    expect(within(map).getByText('L3P')).toBeInTheDocument();
    expect(within(map).getByText('L4S')).toBeInTheDocument();
    expect(within(map).getByText('L6M')).toBeInTheDocument();
  });

  it('passes national FSA dots to the real map component', async () => {
    renderWithPostalGeoDots([
      {
        fsa: 'V6B',
        province: 'British Columbia',
        lat: 49.2829,
        lng: -123.1163,
        count: 20,
        percentage: 40,
      },
      {
        fsa: 'M5V',
        province: 'Ontario',
        lat: 43.63505,
        lng: -79.40995,
        count: 15,
        percentage: 30,
      },
      {
        fsa: 'B3J',
        province: 'Nova Scotia',
        lat: 44.6439,
        lng: -63.56925,
        count: 15,
        percentage: 30,
      },
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('fsa-dot-map')).toBeInTheDocument();
    });

    const map = screen.getByTestId('fsa-dot-map');
    expect(within(map).getByText('V6B')).toBeInTheDocument();
    expect(within(map).getByText('M5V')).toBeInTheDocument();
    expect(within(map).getByText('B3J')).toBeInTheDocument();
  });
});
