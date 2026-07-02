import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SurveyResults from '../SurveyResults';

const { adminFetchMock } = vi.hoisted(() => ({
  adminFetchMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '11111111-1111-4111-8111-111111111111' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="map-placeholder" />,
}));

vi.mock('@/components/AiInsightsTab', () => ({
  default: () => <div>AI insights</div>,
}));

vi.mock('@/lib/adminAuth', () => ({
  adminFetch: adminFetchMock,
  parseJsonResponse: async (response: Response) => response.json(),
}));

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    json: async () => data,
  } as Response;
}

describe('SurveyResults latent trait availability', () => {
  beforeEach(() => {
    adminFetchMock.mockReset();
    adminFetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/results')) {
        return Promise.resolve(
          jsonResponse({
            survey: { title: 'Test survey' },
            questions: [],
            total_responses: 0,
          })
        );
      }
      if (url.endsWith('/summary')) {
        return Promise.resolve(jsonResponse({}));
      }
      if (url.endsWith('/latent-traits')) {
        return Promise.resolve(
          jsonResponse({
            survey_id: '11111111-1111-4111-8111-111111111111',
            status: 'unavailable',
            message:
              'This service is not available because a configuration file has not been set up for this survey yet.',
            dimensions: [],
            fit: {
              status: 'unavailable',
              model: 'Not configured',
              itemTypes: [],
              estimatedItems: 0,
              logLikelihood: null,
              aic: null,
              bic: null,
              lastRun: null,
            },
          })
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it('shows a neutral unavailable state without retry controls', async () => {
    render(<SurveyResults basePath="/student" />);

    await screen.findByText('Test survey');
    fireEvent.click(screen.getByRole('button', { name: 'Traits' }));

    await screen.findByText(
      'This service is not available because a configuration file has not been set up for this survey yet.'
    );

    expect(screen.getByText('Latent trait analysis unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry Fit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate Fit' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        adminFetchMock.mock.calls.filter(([input]) => String(input).includes('/latent-traits'))
      ).toHaveLength(1);
    });
  });
});
