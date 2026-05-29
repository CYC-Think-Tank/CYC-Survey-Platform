import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AiInsightsTab from '../AiInsightsTab';

global.fetch = vi.fn();

describe('AiInsightsTab', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders all AI module tabs', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    render(<AiInsightsTab surveyId="test-survey-id" totalRespondents={100} />);
    await waitFor(() => {});
    expect(screen.getByText('Persuadability')).toBeInTheDocument();
    expect(screen.getByText('Mood')).toBeInTheDocument();
    expect(screen.getByText('Beliefs')).toBeInTheDocument();
    expect(screen.getByText('Minority')).toBeInTheDocument();
    expect(screen.getByText('Archetypes')).toBeInTheDocument();
    expect(screen.getByText('Blind Spots')).toBeInTheDocument();
  });

  it('shows loading state when fetching data', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<AiInsightsTab surveyId="test-survey-id" totalRespondents={100} />);
    await waitFor(() => {
      expect(screen.getByText('Analyzing with AI...')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    render(<AiInsightsTab surveyId="test-survey-id" totalRespondents={100} />);
    await waitFor(() => {
      expect(screen.getByText('Analysis Failed')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders persuadability data when loaded', async () => {
    const mockData = {
      persuadability_score: { overall: 75, label: 'High' },
      overall_summary: 'Test summary',
      meta: { total_respondents: 100, generated_at: new Date().toISOString() },
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);
    render(<AiInsightsTab surveyId="test-survey-id" totalRespondents={100} />);
    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('switches tabs when clicked', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    render(<AiInsightsTab surveyId="test-survey-id" totalRespondents={100} />);
    const moodTab = screen.getByText('Mood');
    fireEvent.click(moodTab);
    await waitFor(() => {
      expect(moodTab).toHaveClass('bg-[var(--color-cyc-primary)]');
    });
  });
});
