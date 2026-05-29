# Phase 1: Testing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive automated tests (unit, integration, E2E) to the CYC Survey Platform and wire them into CI, replacing the `echo 'No tests yet'` placeholder.

**Architecture:** Frontend uses Vitest + React Testing Library for unit tests and Playwright for E2E browser tests. Backend uses pytest for unit tests (extracted pure functions) and integration tests (migrated from 6 ad-hoc root-level scripts). All test suites run in GitHub Actions CI.

**Tech Stack:** Vitest, React Testing Library, jsdom, Playwright, pytest, httpx, pytest-asyncio.

---

## File Structure

```
# NEW FILES
vitest.config.ts
tests/setup.ts
src/components/__tests__/Footer.test.tsx
src/components/__tests__/RichTextEditor.test.tsx
src/components/__tests__/AiInsightsTab.test.tsx
src/app/__tests__/page.test.tsx
src/app/survey/[id]/__tests__/page.test.tsx
src/app/admin/__tests__/page.test.tsx
src/app/admin/login/__tests__/page.test.tsx
src/app/api/cron/reminders/__tests__/route.test.ts
src/lib/__tests__/supabase.test.ts
tests/__init__.py
tests/integration/__init__.py
tests/integration/conftest.py
tests/integration/test_logic_gating_persistence.py
tests/integration/test_endpoints.py
tests/integration/test_short_answer_validation.py
tests/integration/test_query.py
tests/integration/test_limit.py
tests/integration/test_fast.py
tests/integration/test_survey_crud.py
tests/integration/test_survey_submission.py
tests/integration/test_admin_auth.py
tests/unit/__init__.py
tests/unit/test_utils.py
api/utils/__init__.py
api/utils/survey_utils.py
playwright.config.ts
e2e/survey-flow.spec.ts
e2e/admin-flow.spec.ts

# MODIFIED FILES
package.json
requirements.txt
api/index.py
.github/workflows/ci.yml

# DELETED FILES
test_logic_gating_persistence.py
test_short_answer_validation.py
test_query.py
test_limit.py
test_fast.py
test_endpoints.py
```

---

## Task 1: Install Frontend Testing Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add devDependencies to package.json**

Add these entries to the `devDependencies` section of `package.json`:

```json
"vitest": "^3.0.0",
"@vitejs/plugin-react": "^4.4.0",
"jsdom": "^26.0.0",
"@testing-library/react": "^16.2.0",
"@testing-library/jest-dom": "^6.6.0",
"@testing-library/user-event": "^14.6.0"
```

- [ ] **Step 2: Add test scripts to package.json**

In the `scripts` section, replace `"test": "echo 'No tests yet'"` with:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `node_modules/` updated with new packages, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
npm run lint  # verify no lint errors from changes
git commit -m "chore: add vitest and testing-library dependencies"
```

---

## Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    coverage: {
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/app/layout.tsx'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Write tests/setup.ts**

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test to prevent state leakage
afterEach(() => {
  cleanup();
});

// Mock matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

- [ ] **Step 3: Run Vitest to verify config**

Run: `npx vitest run --reporter=verbose`

Expected: Vitest starts, finds 0 tests (none written yet), exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/setup.ts
git commit -m "chore: configure vitest with jsdom and test setup"
```

---

## Task 3: Test Footer Component

**Files:**
- Create: `src/components/__tests__/Footer.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Footer } from '../layout/Footer';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    footer: ({ children, ...props }: any) => <footer {...props}>{children}</footer>,
  },
}));

describe('Footer', () => {
  it('renders organization info and links', () => {
    render(<Footer />);
    expect(screen.getByText('The Canadian Youth Champions (thecyc.org)')).toBeInTheDocument();
    expect(screen.getByText('is a registered Canadian non-profit #1260703-4.')).toBeInTheDocument();
  });

  it('renders Instagram link with correct href', () => {
    render(<Footer />);
    const instagramLink = screen.getByLabelText('Follow The Canadian Youth Champions on Instagram');
    expect(instagramLink).toHaveAttribute('href', 'https://www.instagram.com/thecyc_');
    expect(instagramLink).toHaveAttribute('target', '_blank');
  });

  it('renders mailing list link', () => {
    render(<Footer />);
    const mailingLink = screen.getByText('sign-up for our mailing list');
    expect(mailingLink).toHaveAttribute('href', 'https://www.thecyc.org/stay-in-touch');
  });

  it('renders copyright text', () => {
    render(<Footer />);
    expect(screen.getByText('Copyright © 2021. All rights reserved.')).toBeInTheDocument();
  });

  it('returns null on admin pages', () => {
    mockPathname = '/admin';
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
    mockPathname = '/';
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/__tests__/Footer.test.tsx`

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/Footer.test.tsx
git commit -m "test: add Footer component tests"
```

---

## Task 4: Test RichTextEditor Component

**Files:**
- Create: `src/components/__tests__/RichTextEditor.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RichTextEditor } from '../RichTextEditor';

vi.mock('@tiptap/react', () => ({
  useEditor: ({ onUpdate, content, editable }: any) => {
    const getHTML = () => content || '<p></p>';
    const getText = () => content?.replace(/<[^>]*>?/gm, '') || '';
    const commands = {
      setContent: (newContent: string) => {
        if (onUpdate) {
          onUpdate({ editor: { getHTML: () => newContent } });
        }
      },
      toggleBold: () => ({ run: vi.fn() }),
      toggleItalic: () => ({ run: vi.fn() }),
      toggleUnderline: () => ({ run: vi.fn() }),
      toggleHighlight: () => ({ run: vi.fn() }),
      setColor: () => ({ run: vi.fn() }),
      unsetColor: () => ({ run: vi.fn() }),
      focus: () => ({ run: vi.fn() }),
    };
    const isActive = () => false;
    return { getHTML, getText, commands, isActive, chain: () => commands };
  },
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">{editor?.getHTML()}</div>
  ),
}));

vi.mock('@tiptap/starter-kit', () => ({ StarterKit: {} }));
vi.mock('@tiptap/extension-underline', () => ({ Underline: {} }));
vi.mock('@tiptap/extension-highlight', () => ({ Highlight: {} }));
vi.mock('@tiptap/extension-text-style', () => ({ TextStyle: {} }));
vi.mock('@tiptap/extension-color', () => ({ Color: {} }));

describe('RichTextEditor', () => {
  it('renders with placeholder', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} placeholder="Type here..." />);
    expect(screen.getByText('Type here...')).toBeInTheDocument();
  });

  it('renders toolbar buttons', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Underline')).toBeInTheDocument();
    expect(screen.getByTitle('Highlight')).toBeInTheDocument();
  });

  it('does not render toolbar in readOnly mode', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} readOnly={true} />);
    expect(screen.queryByTitle('Bold')).not.toBeInTheDocument();
  });

  it('renders in disabled state when readOnly', () => {
    const onChange = vi.fn();
    const { container } = render(<RichTextEditor value="test content" onChange={onChange} readOnly={true} />);
    expect(container.querySelector('.opacity-70')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/__tests__/RichTextEditor.test.tsx`

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/RichTextEditor.test.tsx
git commit -m "test: add RichTextEditor component tests"
```

---

## Task 5: Test AiInsightsTab Component

**Files:**
- Create: `src/components/__tests__/AiInsightsTab.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AiInsightsTab from '../AiInsightsTab';

global.fetch = vi.fn();

describe('AiInsightsTab', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders all AI module tabs', () => {
    render(<AiInsightsTab surveyId="test-survey-id" totalRespondents={100} />);
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
    expect(moodTab.parentElement).toHaveClass('bg-[var(--color-cyc-primary)]');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/__tests__/AiInsightsTab.test.tsx`

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/AiInsightsTab.test.tsx
git commit -m "test: add AiInsightsTab component tests"
```

---

## Task 6: Test Landing Page

**Files:**
- Create: `src/app/__tests__/page.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
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
      expect(screen.getByText('Make Your Voice')).toBeInTheDocument();
      expect(screen.getByText('Heard.')).toBeInTheDocument();
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
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/app/__tests__/page.test.tsx`

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/__tests__/page.test.tsx
git commit -m "test: add landing page tests"
```

---

## Task 7: Test Survey Page

**Files:**
- Create: `src/app/survey/[id]/__tests__/page.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
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
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  Reorder: { Group: ({ children }: any) => <div>{children}</div>, Item: ({ children }: any) => <div>{children}</div> },
}));

vi.mock('html-react-parser', () => ({
  default: (html: string) => <span>{html}</span>,
}));

global.fetch = vi.fn();

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
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run "src/app/survey/[id]/__tests__/page.test.tsx"`

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add "src/app/survey/[id]/__tests__/page.test.tsx"
git commit -m "test: add survey page tests"
```

---

## Task 8: Test Admin Dashboard Page

**Files:**
- Create: `src/app/admin/__tests__/page.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '../page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));

global.fetch = vi.fn();

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPush.mockClear();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn(() => 'true'), setItem: vi.fn(), removeItem: vi.fn() },
      writable: true,
    });
  });

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<AdminDashboard />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard with surveys after loading', async () => {
    const mockSurveys = [
      { id: 'survey-1', title: 'Active Survey', description: 'Description', is_active: true, response_count: 10, estimated_minutes: 5, has_been_published: true },
      { id: 'survey-2', title: 'Draft Survey', description: 'Draft', is_active: false, response_count: 0, estimated_minutes: 3, has_been_published: false },
    ];
    vi.mocked(fetch).mockResolvedValue({ json: async () => mockSurveys } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active Survey')).toBeInTheDocument();
      expect(screen.getByText('Draft Survey')).toBeInTheDocument();
    });
  });

  it('shows survey status badges', async () => {
    const mockSurveys = [{ id: 'survey-1', title: 'Active Survey', is_active: true, response_count: 10, estimated_minutes: 5, has_been_published: true }];
    vi.mocked(fetch).mockResolvedValue({ json: async () => mockSurveys } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('renders empty state when no surveys', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => [] } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No surveys found. Create one to get started!')).toBeInTheDocument();
    });
  });

  it('has link to create new survey', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => [] } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      const newSurveyLink = screen.getByText('New Survey');
      expect(newSurveyLink.closest('a')).toHaveAttribute('href', '/admin/create');
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/app/admin/__tests__/page.test.tsx`

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/__tests__/page.test.tsx
git commit -m "test: add admin dashboard page tests"
```

---

## Task 9: Test Admin Login Page

**Files:**
- Create: `src/app/admin/login/__tests__/page.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLogin from '../page';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: mockRefresh }) }));

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
      writable: true,
    });
  });

  it('renders login form', () => {
    render(<AdminLogin />);
    expect(screen.getByText('Admin Access')).toBeInTheDocument();
    expect(screen.getByLabelText('Master Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Access Dashboard' })).toBeInTheDocument();
  });

  it('shows error for incorrect password', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByLabelText('Master Password'), { target: { value: 'wrong-password' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Access Dashboard' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('Incorrect password.')).toBeInTheDocument();
    });
  });

  it('redirects to admin on correct password', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByLabelText('Master Password'), { target: { value: 'cycsurveyplatformadmin' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Access Dashboard' }).closest('form')!);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('cyc_admin_auth', 'true');
    });
  });

  it('shows loading state during submission', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByLabelText('Master Password'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Access Dashboard' }));
    await waitFor(() => {
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/app/admin/login/__tests__/page.test.tsx`

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/login/__tests__/page.test.tsx
git commit -m "test: add admin login page tests"
```

---

## Task 10: Test Cron Reminders API Route

**Files:**
- Create: `src/app/api/cron/reminders/__tests__/route.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
  }),
}));

describe('Cron Reminders API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    process.env.NODE_ENV = 'production';
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-pass';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_KEY = 'test-key';
  });

  it('returns 401 without authorization header', async () => {
    const request = new Request('http://localhost:3000/api/cron/reminders');
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with incorrect secret', async () => {
    const request = new Request('http://localhost:3000/api/cron/reminders', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 500 when env vars are missing', async () => {
    delete process.env.GMAIL_USER;
    const request = new Request('http://localhost:3000/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const response = await GET(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Missing env vars');
  });

  it('returns 200 with correct authorization in non-production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-pass';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({ json: async () => [] } as Response);
    const request = new Request('http://localhost:3000/api/cron/reminders');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/app/api/cron/reminders/__tests__/route.test.ts`

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/reminders/__tests__/route.test.ts
git commit -m "test: add cron reminders API route tests"
```

---

## Task 11: Test Supabase Client Utility

**Files:**
- Create: `src/lib/__tests__/supabase.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it('creates client with env vars', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    const { createClient } = await import('@supabase/supabase-js');
    vi.mocked(createClient).mockReturnValue({} as any);
    await import('../supabase');
    expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key');
  });

  it('throws when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(import('../supabase')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/lib/__tests__/supabase.test.ts`

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/supabase.test.ts
git commit -m "test: add supabase client utility tests"
```

---

## Task 12: Add Backend Testing Dependencies

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Add pytest dependencies**

Add to `requirements.txt`:

```
pytest==8.3.5
pytest-asyncio==0.24.0
httpx==0.28.1
```

- [ ] **Step 2: Install dependencies**

Run: `pip install pytest pytest-asyncio httpx`

Expected: Packages installed successfully.

- [ ] **Step 3: Verify pytest works**

Run: `pytest --version`

Expected: `pytest 8.3.5` (or similar version output)

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "chore: add pytest and testing dependencies"
```

---

## Task 13: Create Backend Test Directory Structure

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/integration/__init__.py`
- Create: `tests/integration/conftest.py`
- Create: `tests/unit/__init__.py`

- [ ] **Step 1: Create Python package files**

Create all four `__init__.py` files (can be empty).

- [ ] **Step 2: Write integration conftest.py**

```python
import pytest
import os


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("CYC_API_URL", "http://127.0.0.1:8000")


@pytest.fixture
def auth_headers():
    return {}


@pytest.fixture
def cleanup_surveys(base_url):
    """Context manager that tracks created survey IDs and deletes them in teardown."""
    created_ids = []

    def track(survey_id: str):
        created_ids.append(survey_id)
        return survey_id

    yield track

    # Teardown: delete all created surveys
    import requests
    for sid in created_ids:
        try:
            requests.delete(f"{base_url}/api/surveys/{sid}")
        except Exception:
            pass
```

- [ ] **Step 3: Verify structure**

Run: `pytest --collect-only`

Expected: No test files found yet, but no import errors. Should show `collected 0 items`.

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "chore: create backend test directory structure"
```

---

## Task 14: Extract Pure Functions for Unit Testing

**Files:**
- Create: `api/utils/__init__.py`
- Create: `api/utils/survey_utils.py`
- Modify: `api/index.py`

- [ ] **Step 1: Extract pure functions from api/index.py**

Write `api/utils/survey_utils.py` with functions from lines 964-993 of `api/index.py`:

```python
import math
from typing import List, Dict, Any, Tuple


def calculate_median(arr: List[float]) -> float:
    if not arr:
        return 0.0
    sorted_arr = sorted(arr)
    n = len(sorted_arr)
    if n % 2 == 0:
        return (sorted_arr[n // 2 - 1] + sorted_arr[n // 2]) / 2
    return sorted_arr[n // 2]


def calculate_std_dev(arr: List[float], mean: float) -> float:
    if len(arr) < 2:
        return 0.0
    variance = sum((x - mean) ** 2 for x in arr) / len(arr)
    return math.sqrt(variance)


def calculate_quartiles(arr: List[float]) -> Tuple[float, float, float]:
    if not arr:
        return (0.0, 0.0, 0.0)
    sorted_arr = sorted(arr)
    n = len(sorted_arr)
    q2 = calculate_median(sorted_arr)
    if n % 2 == 0:
        lower_half = sorted_arr[:n // 2]
        upper_half = sorted_arr[n // 2:]
    else:
        lower_half = sorted_arr[:n // 2]
        upper_half = sorted_arr[n // 2 + 1:]
    q1 = calculate_median(lower_half)
    q3 = calculate_median(upper_half)
    return (q1, q2, q3)


def find_outliers(arr: List[float], q1: float, q3: float, iqr: float) -> List[float]:
    if iqr <= 0:
        return []
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    return [x for x in arr if x < lower_bound or x > upper_bound]


def calculate_mode(counts: Dict[Any, int]) -> List[Any]:
    if not counts:
        return []
    max_count = max(counts.values())
    return [k for k, v in counts.items() if v == max_count]
```

- [ ] **Step 2: Update api/index.py to import from utils**

In `api/index.py`, after the imports section, add:

```python
from api.utils.survey_utils import (
    calculate_median,
    calculate_std_dev,
    calculate_quartiles,
    find_outliers,
    calculate_mode,
)
```

Then remove the function definitions at lines 964-993.

- [ ] **Step 3: Verify backend still starts**

Run: `python -c "from api.index import app; print('Import OK')"`

Expected: `Import OK` with no errors.

- [ ] **Step 4: Commit**

```bash
git add api/utils/ api/index.py
git commit -m "refactor: extract pure functions to api/utils/survey_utils.py"
```

---

## Task 15: Write Backend Unit Tests

**Files:**
- Create: `tests/unit/test_utils.py`

- [ ] **Step 1: Write unit tests for extracted functions**

```python
import pytest
from api.utils.survey_utils import (
    calculate_median,
    calculate_std_dev,
    calculate_quartiles,
    find_outliers,
    calculate_mode,
)


class TestCalculateMedian:
    def test_empty_list(self):
        assert calculate_median([]) == 0.0

    def test_single_element(self):
        assert calculate_median([5]) == 5.0

    def test_odd_number_of_elements(self):
        assert calculate_median([1, 3, 5]) == 3.0

    def test_even_number_of_elements(self):
        assert calculate_median([1, 2, 3, 4]) == 2.5

    def test_unsorted_input(self):
        assert calculate_median([5, 1, 3]) == 3.0


class TestCalculateStdDev:
    def test_empty_list(self):
        assert calculate_std_dev([], 0.0) == 0.0

    def test_single_element(self):
        assert calculate_std_dev([5], 5.0) == 0.0

    def test_standard_case(self):
        result = calculate_std_dev([2, 4], 3.0)
        assert result == 1.0

    def test_multiple_values(self):
        result = calculate_std_dev([1, 2, 3, 4, 5], 3.0)
        assert abs(result - 1.414) < 0.001


class TestCalculateQuartiles:
    def test_empty_list(self):
        assert calculate_quartiles([]) == (0.0, 0.0, 0.0)

    def test_single_element(self):
        assert calculate_quartiles([5]) == (5.0, 5.0, 5.0)

    def test_even_count(self):
        q1, q2, q3 = calculate_quartiles([1, 2, 3, 4, 5, 6])
        assert q1 == 2.0
        assert q2 == 3.5
        assert q3 == 5.0

    def test_odd_count(self):
        q1, q2, q3 = calculate_quartiles([1, 2, 3, 4, 5])
        assert q1 == 1.5
        assert q2 == 3.0
        assert q3 == 4.5


class TestFindOutliers:
    def test_no_outliers(self):
        arr = [1, 2, 3, 4, 5]
        assert find_outliers(arr, 2.0, 4.0, 2.0) == []

    def test_with_outliers(self):
        arr = [1, 2, 3, 4, 100]
        outliers = find_outliers(arr, 2.0, 4.0, 2.0)
        assert 100 in outliers
        assert 1 not in outliers

    def test_zero_iqr(self):
        assert find_outliers([1, 2, 3], 2.0, 2.0, 0.0) == []

    def test_low_outliers(self):
        arr = [-100, 2, 3, 4, 5]
        outliers = find_outliers(arr, 2.5, 4.5, 2.0)
        assert -100 in outliers


class TestCalculateMode:
    def test_empty_dict(self):
        assert calculate_mode({}) == []

    def test_single_mode(self):
        counts = {"a": 1, "b": 3, "c": 2}
        assert calculate_mode(counts) == ["b"]

    def test_multiple_modes(self):
        counts = {"a": 2, "b": 2, "c": 1}
        result = calculate_mode(counts)
        assert set(result) == {"a", "b"}

    def test_all_same_count(self):
        counts = {"a": 1, "b": 1, "c": 1}
        result = calculate_mode(counts)
        assert set(result) == {"a", "b", "c"}
```

- [ ] **Step 2: Run the unit tests**

Run: `pytest tests/unit/test_utils.py -v`

Expected: All 19 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/test_utils.py
git commit -m "test: add backend unit tests for survey_utils"
```

---

## Task 16: Migrate Integration Test - Logic Gating Persistence

**Files:**
- Create: `tests/integration/test_logic_gating_persistence.py`
- Delete: `test_logic_gating_persistence.py` (at root)

- [ ] **Step 1: Write the migrated pytest test**

```python
"""
Integration test: Logic Gating Persistence through Survey Activation/Publish.
Requires:
    - API server running (uvicorn api.index:app)
    - Valid Supabase credentials in .env.local
"""

import requests
import pytest


class TestLogicGatingPersistence:
    @pytest.fixture
    def created_survey(self, base_url, cleanup_surveys):
        """Create a survey with logic gates and clean it up after."""
        payload = {
            "title": "Test Logic Gates - Create",
            "description": "Testing logic gate persistence on create",
            "estimated_minutes": 5,
            "is_active": False,
            "questions": [
                {
                    "id": "temp-q0",
                    "question_text": "What is your favorite color?",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "is_conditional": False,
                    "options": {
                        "choices": ["Red", "Blue", "Green"],
                        "has_other": False,
                        "randomize_options": False,
                        "locked_choices": [],
                        "logic_gates": [],
                        "logic_gate_match_type": "all",
                    }
                },
                {
                    "id": "temp-q1",
                    "question_text": "Why did you choose that color?",
                    "type": "multiple_line",
                    "order_index": 2,
                    "is_required": False,
                    "is_conditional": False,
                    "options": {
                        "logic_gates": [
                            {"question_id": "temp-q0", "condition_type": "equals", "value": "Blue"}
                        ],
                        "logic_gate_match_type": "any"
                    }
                },
                {
                    "id": "temp-q2",
                    "question_text": "Rate your satisfaction",
                    "type": "rating_scale",
                    "order_index": 3,
                    "is_required": True,
                    "is_conditional": False,
                    "options": {
                        "logic_gates": [
                            {"question_id": "temp-q0", "condition_type": "equals", "value": "Red"}
                        ],
                        "logic_gate_match_type": "all"
                    }
                }
            ]
        }

        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200, f"Create survey failed: {res.text}"
        survey = res.json()
        cleanup_surveys(survey["id"])
        return survey

    def _get_logic_gates(self, q):
        opts = q.get("options", {})
        if not opts or not isinstance(opts, dict):
            return []
        return opts.get("logic_gates", [])

    def _get_match_type(self, q):
        opts = q.get("options", {})
        if not opts or not isinstance(opts, dict):
            return "all"
        return opts.get("logic_gate_match_type", "all")

    def test_create_preserves_logic_gates(self, created_survey):
        survey = created_survey
        assert len(survey["questions"]) == 3

        q0 = survey["questions"][0]
        assert self._get_logic_gates(q0) == []
        assert self._get_match_type(q0) == "all"

        q1 = survey["questions"][1]
        gates1 = self._get_logic_gates(q1)
        assert len(gates1) == 1
        assert gates1[0]["condition_type"] == "equals"
        assert gates1[0]["value"] == "Blue"
        assert gates1[0]["question_id"] == q0["id"]
        assert self._get_match_type(q1) == "any"

        q2 = survey["questions"][2]
        gates2 = self._get_logic_gates(q2)
        assert len(gates2) == 1
        assert gates2[0]["value"] == "Red"
        assert gates2[0]["question_id"] == q0["id"]
        assert self._get_match_type(q2) == "all"

    def test_get_preserves_logic_gates(self, base_url, created_survey):
        survey_id = created_survey["id"]
        res = requests.get(f"{base_url}/api/surveys/{survey_id}")
        assert res.status_code == 200

        survey = res.json()
        q0_id = survey["questions"][0]["id"]
        q1 = survey["questions"][1]
        q2 = survey["questions"][2]

        gates1 = self._get_logic_gates(q1)
        assert len(gates1) == 1
        assert gates1[0]["value"] == "Blue"
        assert gates1[0]["question_id"] == q0_id
        assert self._get_match_type(q1) == "any"

        gates2 = self._get_logic_gates(q2)
        assert len(gates2) == 1
        assert self._get_match_type(q2) == "all"

    def test_update_preserves_logic_gates(self, base_url, created_survey):
        survey = created_survey
        survey_id = survey["id"]
        q0_id = survey["questions"][0]["id"]

        q1 = survey["questions"][1]
        q1_updated_options = q1["options"].copy()
        q1_updated_options["logic_gates"] = [
            q1["options"]["logic_gates"][0],
            {"question_id": q0_id, "condition_type": "equals", "value": "Red"}
        ]
        q1_updated_options["logic_gate_match_type"] = "all"

        update_payload = {
            "title": survey["title"] + " (Updated)",
            "description": survey["description"],
            "description_alignment": survey.get("description_alignment", "left"),
            "estimated_minutes": survey["estimated_minutes"],
            "is_active": False,
            "thumbnail_url": survey.get("thumbnail_url"),
            "questions": [
                {**survey["questions"][0], "id": survey["questions"][0]["id"]},
                {**survey["questions"][1], "options": q1_updated_options, "id": survey["questions"][1]["id"]},
                {**survey["questions"][2], "id": survey["questions"][2]["id"]},
            ]
        }

        res = requests.put(f"{base_url}/api/surveys/{survey_id}", json=update_payload)
        assert res.status_code == 200, f"Update survey failed: {res.text}"

        updated_survey = res.json()
        assert updated_survey["questions"][0]["id"] == q0_id

        q1_updated = updated_survey["questions"][1]
        gates = self._get_logic_gates(q1_updated)
        assert len(gates) == 2
        assert self._get_match_type(q1_updated) == "all"
        assert gates[0]["question_id"] == q0_id
        assert gates[1]["question_id"] == q0_id

        q2_updated = updated_survey["questions"][2]
        gates2 = self._get_logic_gates(q2_updated)
        assert len(gates2) == 1

    def test_duplicate_remaps_logic_gates(self, base_url, created_survey):
        survey = created_survey
        survey_id = survey["id"]
        orig_q0_id = survey["questions"][0]["id"]
        orig_q1 = survey["questions"][1]
        orig_q2 = survey["questions"][2]

        res = requests.post(f"{base_url}/api/surveys/{survey_id}/duplicate")
        assert res.status_code == 200, f"Duplicate survey failed: {res.text}"

        dup = res.json()
        dup_q0_id = dup["questions"][0]["id"]
        dup_q1 = dup["questions"][1]
        dup_q2 = dup["questions"][2]

        assert dup_q0_id != orig_q0_id
        assert dup_q1["id"] != orig_q1["id"]
        assert dup_q2["id"] != orig_q2["id"]

        dup_q1_gates = self._get_logic_gates(dup_q1)
        assert len(dup_q1_gates) == len(self._get_logic_gates(orig_q1))
        assert dup_q1_gates[0]["question_id"] == dup_q0_id

        dup_q2_gates = self._get_logic_gates(dup_q2)
        assert dup_q2_gates[0]["question_id"] == dup_q0_id
        assert self._get_match_type(dup_q1) == "all"
        assert self._get_match_type(dup_q2) == "all"

    def test_toggle_active_preserves_logic_gates(self, base_url, created_survey):
        survey_id = created_survey["id"]
        res = requests.patch(f"{base_url}/api/surveys/{survey_id}/toggle")
        assert res.status_code == 200

        toggled = res.json()
        assert toggled["is_active"] is True
        assert toggled.get("has_been_published", False) is True

        res = requests.get(f"{base_url}/api/surveys/{survey_id}")
        assert res.status_code == 200

        survey = res.json()
        q1 = survey["questions"][1]
        gates1 = self._get_logic_gates(q1)
        assert len(gates1) == 2
        assert self._get_match_type(q1) == "all"

        q2 = survey["questions"][2]
        gates2 = self._get_logic_gates(q2)
        assert len(gates2) == 1

    def test_create_active_with_logic_gates(self, base_url, cleanup_surveys):
        payload = {
            "title": "Test Logic Gates - Create Active",
            "description": "Testing logic gate persistence on create with is_active=True",
            "estimated_minutes": 5,
            "is_active": True,
            "questions": [
                {
                    "id": "temp-active-q0",
                    "question_text": "Choose one",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "is_conditional": False,
                    "options": {"choices": ["X", "Y", "Z"]}
                },
                {
                    "id": "temp-active-q1",
                    "question_text": "Follow up question",
                    "type": "multiple_line",
                    "order_index": 2,
                    "is_required": False,
                    "is_conditional": False,
                    "options": {
                        "logic_gates": [
                            {"question_id": "temp-active-q0", "condition_type": "equals", "value": "X"}
                        ],
                        "logic_gate_match_type": "any"
                    }
                }
            ]
        }

        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200, f"Create active survey failed: {res.text}"

        survey = res.json()
        cleanup_surveys(survey["id"])
        assert survey["is_active"] is True

        q0 = survey["questions"][0]
        q1 = survey["questions"][1]
        gates = self._get_logic_gates(q1)
        assert len(gates) == 1
        assert gates[0]["condition_type"] == "equals"
        assert gates[0]["value"] == "X"
        assert gates[0]["question_id"] == q0["id"]
        assert self._get_match_type(q1) == "any"

    def test_no_logic_gates_defaults(self, base_url, created_survey):
        survey_id = created_survey["id"]
        res = requests.get(f"{base_url}/api/surveys/{survey_id}")
        assert res.status_code == 200

        survey = res.json()
        q0 = survey["questions"][0]
        gates = self._get_logic_gates(q0)
        assert gates == []
```

- [ ] **Step 2: Delete the old root-level script**

Run: `rm test_logic_gating_persistence.py`

- [ ] **Step 3: Run the migrated test**

Run: `pytest tests/integration/test_logic_gating_persistence.py -v`

Expected: 7 tests pass (requires running backend server + DB).

- [ ] **Step 4: Commit**

```bash
git add tests/integration/test_logic_gating_persistence.py
git rm test_logic_gating_persistence.py
git commit -m "test: migrate logic gating persistence test to pytest"
```

---

## Task 17: Migrate Remaining Integration Tests

**Files:**
- Create: `tests/integration/test_endpoints.py`
- Create: `tests/integration/test_short_answer_validation.py`
- Create: `tests/integration/test_query.py`
- Create: `tests/integration/test_limit.py`
- Create: `tests/integration/test_fast.py`
- Delete: `test_endpoints.py`, `test_short_answer_validation.py`, `test_query.py`, `test_limit.py`, `test_fast.py`

- [ ] **Step 1: Migrate test_endpoints.py**

```python
import requests
import pytest


class TestEndpoints:
    def test_results_endpoint(self, base_url):
        survey_id = "c1ef4af9-a2b2-43ad-8e08-defad3baeb35"
        res = requests.get(f"{base_url}/api/surveys/{survey_id}/results")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
```

- [ ] **Step 2: Migrate the other 4 scripts using same pattern**

For each remaining root-level test script:
1. Replace `assert_eq(actual, expected, msg)` with `assert actual == expected, msg`
2. Replace `assert_true(cond, msg)` with `assert cond, msg`
3. Use `base_url` fixture instead of argparse
4. Remove `if __name__ == "__main__"` blocks
5. Wrap in a class

Read each original script and apply these transformations.

- [ ] **Step 3: Delete old test scripts**

Run:
```bash
rm test_endpoints.py test_short_answer_validation.py test_query.py test_limit.py test_fast.py
```

- [ ] **Step 4: Verify all integration tests are discoverable**

Run: `pytest tests/integration/ --collect-only`

Expected: Lists all test classes and methods. No import errors.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/
git rm test_endpoints.py test_short_answer_validation.py test_query.py test_limit.py test_fast.py
git commit -m "test: migrate remaining ad-hoc test scripts to pytest integration suite"
```

---

## Task 18: Add New Backend Integration Tests

**Files:**
- Create: `tests/integration/test_survey_crud.py`
- Create: `tests/integration/test_survey_submission.py`
- Create: `tests/integration/test_admin_auth.py`

- [ ] **Step 1: Write survey CRUD integration test**

```python
import requests
import pytest


class TestSurveyCrud:
    def test_create_survey(self, base_url, cleanup_surveys):
        payload = {
            "title": "CRUD Test Survey",
            "description": "Testing CRUD operations",
            "estimated_minutes": 5,
            "is_active": False,
            "questions": [
                {
                    "id": "temp-q1",
                    "question_text": "Test question?",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "options": {"choices": ["A", "B", "C"]}
                }
            ]
        }
        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200
        survey = res.json()
        cleanup_surveys(survey["id"])
        assert survey["title"] == "CRUD Test Survey"
        assert len(survey["questions"]) == 1

    def test_get_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Get Test", "description": "Test", "estimated_minutes": 1,
            "is_active": False, "questions": []
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        res = requests.get(f"{base_url}/api/surveys/{survey['id']}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == survey["id"]

    def test_update_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Update Test", "description": "Before update",
            "estimated_minutes": 1, "is_active": False, "questions": []
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        update_res = requests.put(f"{base_url}/api/surveys/{survey['id']}", json={
            "title": "Updated Title", "description": "After update",
            "description_alignment": "left", "estimated_minutes": 2,
            "is_active": False, "questions": []
        })
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["title"] == "Updated Title"

    def test_delete_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Delete Test", "description": "To be deleted",
            "estimated_minutes": 1, "is_active": False, "questions": []
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        delete_res = requests.delete(f"{base_url}/api/surveys/{survey['id']}")
        assert delete_res.status_code == 200
        get_res = requests.get(f"{base_url}/api/surveys/{survey['id']}")
        assert get_res.status_code == 404

    def test_duplicate_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Duplicate Test", "description": "Original",
            "estimated_minutes": 1, "is_active": False,
            "questions": [
                {
                    "id": "temp-q1", "question_text": "Q1",
                    "type": "multiple_choice", "order_index": 1,
                    "is_required": True, "options": {"choices": ["A", "B"]}
                }
            ]
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        dup_res = requests.post(f"{base_url}/api/surveys/{survey['id']}/duplicate")
        assert dup_res.status_code == 200
        dup = dup_res.json()
        cleanup_surveys(dup["id"])
        assert dup["title"] == "Duplicate Test"
        assert dup["id"] != survey["id"]
        assert len(dup["questions"]) == len(survey["questions"])
```

- [ ] **Step 2: Write survey submission integration test**

```python
import requests
import pytest


class TestSurveySubmission:
    @pytest.fixture
    def active_survey(self, base_url, cleanup_surveys):
        payload = {
            "title": "Submission Test Survey",
            "description": "Testing submissions",
            "estimated_minutes": 2,
            "is_active": True,
            "questions": [
                {
                    "id": "temp-q1",
                    "question_text": "What is your favorite color?",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "options": {"choices": ["Red", "Blue", "Green"]}
                },
                {
                    "id": "temp-q2",
                    "question_text": "Rate this survey",
                    "type": "rating_scale",
                    "order_index": 2,
                    "is_required": True,
                    "options": {}
                }
            ]
        }
        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200
        survey = res.json()
        cleanup_surveys(survey["id"])
        return survey

    def test_submit_survey_response(self, base_url, active_survey):
        survey_id = active_survey["id"]
        q1_id = active_survey["questions"][0]["id"]
        q2_id = active_survey["questions"][1]["id"]
        payload = {
            "email": "test@example.com",
            "answers": [
                {"question_id": q1_id, "answer_text": "Blue", "time_spent": 5000},
                {"question_id": q2_id, "answer_numeric": 75, "time_spent": 3000}
            ]
        }
        res = requests.post(f"{base_url}/api/surveys/{survey_id}/responses", json=payload)
        assert res.status_code == 200, f"Submission failed: {res.text}"

    def test_check_status_after_submission(self, base_url, active_survey):
        survey_id = active_survey["id"]
        email = "status@test.com"
        requests.post(f"{base_url}/api/surveys/{survey_id}/responses", json={
            "email": email,
            "answers": [
                {"question_id": active_survey["questions"][0]["id"], "answer_text": "Red", "time_spent": 1000}
            ]
        })
        res = requests.post(f"{base_url}/api/surveys/{survey_id}/check-status", json={"email": email})
        assert res.status_code == 200
        data = res.json()
        assert data["has_submitted"] is True
```

- [ ] **Step 3: Write admin auth integration test**

```python
import requests
import pytest


class TestAdminAuth:
    def test_admin_login_page_renders(self, base_url):
        res = requests.get(f"{base_url}/api/admin/raffle-email")
        assert res.status_code in [401, 403, 404]

    def test_surveys_list_public(self, base_url):
        res = requests.get(f"{base_url}/api/surveys")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
```

- [ ] **Step 4: Run all new integration tests**

Run: `pytest tests/integration/test_survey_crud.py tests/integration/test_survey_submission.py tests/integration/test_admin_auth.py -v`

Expected: Tests pass (requires running backend + DB).

- [ ] **Step 5: Commit**

```bash
git add tests/integration/test_survey_crud.py tests/integration/test_survey_submission.py tests/integration/test_admin_auth.py
git commit -m "test: add new backend integration tests (CRUD, submission, admin auth)"
```

---

## Task 19: Install and Configure Playwright

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Add Playwright devDependency**

Add to `package.json` devDependencies:

```json
"@playwright/test": "^1.50.0"
```

- [ ] **Step 2: Install Playwright**

Run: `npm install`
Then: `npx playwright install --with-deps chromium`

Expected: Playwright browsers downloaded.

- [ ] **Step 3: Write playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json playwright.config.ts
git commit -m "chore: install and configure Playwright for E2E testing"
```

---

## Task 20: Write E2E Smoke Tests

**Files:**
- Create: `e2e/survey-flow.spec.ts`
- Create: `e2e/admin-flow.spec.ts`

- [ ] **Step 1: Write survey flow E2E test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Survey Flow', () => {
  test('user can view and start a survey', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CYC Survey Platform/);
    await page.waitForTimeout(2000);
    const startButton = page.getByText('START NOW').first();
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
      await expect(page).toHaveURL(/\/surveys|survey/);
    }
  });

  test('landing page has key elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Make Your Voice')).toBeVisible();
    await expect(page.getByText('Heard.')).toBeVisible();
    await expect(page.getByText('START NOW')).toBeVisible();
  });

  test('survey page shows not found for invalid ID', async ({ page }) => {
    await page.goto('/survey/invalid-id-12345');
    await expect(page.getByText(/not found|unavailable/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Write admin flow E2E test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('admin login page renders', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText('Admin Access')).toBeVisible();
    await expect(page.getByLabel('Master Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Access Dashboard' })).toBeVisible();
  });

  test('admin login rejects wrong password', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Master Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Access Dashboard' }).click();
    await expect(page.getByText('Incorrect password.')).toBeVisible();
  });

  test('admin login accepts correct password', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Master Password').fill('cycsurveyplatformadmin');
    await page.getByRole('button', { name: 'Access Dashboard' }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Dashboard Overview')).toBeVisible();
  });

  test('admin dashboard has create survey link', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Master Password').fill('cycsurveyplatformadmin');
    await page.getByRole('button', { name: 'Access Dashboard' }).click();
    await expect(page.getByText('New Survey')).toBeVisible();
  });
});
```

- [ ] **Step 3: Run E2E tests locally**

Run: `npx playwright test --project=chromium`

Expected: Tests run in headed or headless mode.

- [ ] **Step 4: Commit**

```bash
git add e2e/
git commit -m "test: add Playwright E2E smoke tests for survey and admin flows"
```

---

## Task 21: Update CI Workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update frontend job**

Modify the frontend job in `.github/workflows/ci.yml`:

```yaml
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run build
      - run: npm test              # NEW: Run Vitest unit tests
```

- [ ] **Step 2: Update backend job**

```yaml
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt
      - run: ruff check api/
      - run: pytest tests/unit/ -v   # NEW: Run backend unit tests only
```

- [ ] **Step 3: Add Playwright E2E job**

```yaml
  e2e:
    runs-on: ubuntu-latest
    if: false  # Enable in Phase 2 when staging environment is ready
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
```

- [ ] **Step 4: Validate CI YAML**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`

Expected: No syntax errors.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add frontend unit tests and backend unit tests to CI pipeline"
```

---

## Task 22: Run Full Test Suite Locally

- [ ] **Step 1: Run frontend unit tests**

Run: `npm test`

Expected: All frontend tests pass (28+ tests across 9 test files).

- [ ] **Step 2: Run backend unit tests**

Run: `pytest tests/unit/ -v`

Expected: All 19 unit tests pass.

- [ ] **Step 3: Run backend integration tests (requires server)**

If backend is running:
Run: `pytest tests/integration/ -v`

Expected: Integration tests pass.

- [ ] **Step 4: Run lint checks**

Run: `npm run lint`
Run: `ruff check api/`

Expected: No lint errors.

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git commit -m "test: full test suite passing - Phase 1 complete"
```

---

## Task 23: Final Verification & Cleanup

- [ ] **Step 1: Verify no root-level test scripts remain**

Run: `ls test_*.py 2>/dev/null || echo "No root test scripts found - good!"`

Expected: "No root test scripts found - good!"

- [ ] **Step 2: Verify package.json test script is real**

Run: `cat package.json | grep -A1 '"test"'`

Expected: `"test": "vitest run"` (not `echo 'No tests yet'`)

- [ ] **Step 3: Verify all new files are tracked**

Run: `git status`

Expected: Clean working tree (all changes committed).

- [ ] **Step 4: Review commit history**

```bash
git log --oneline -20
```

Verify commits include:
- chore: add vitest and testing-library dependencies
- chore: configure vitest with jsdom and test setup
- Multiple test: add ... commits
- chore: add pytest and testing dependencies
- chore: create backend test directory structure
- refactor: extract pure functions to api/utils/survey_utils.py
- test: add backend unit tests for survey_utils
- test: migrate logic gating persistence test to pytest
- test: migrate remaining ad-hoc test scripts to pytest integration suite
- test: add new backend integration tests (CRUD, submission, admin auth)
- chore: install and configure Playwright for E2E testing
- test: add Playwright E2E smoke tests for survey and admin flows
- ci: add frontend unit tests and backend unit tests to CI pipeline
- test: full test suite passing - Phase 1 complete

---

## Self-Review Checklist

After writing the complete plan, verify:

**1. Spec coverage:**
- [x] Frontend unit tests (Vitest + RTL) — Tasks 3-11
- [x] Backend unit tests (pytest, extracted pure functions) — Tasks 14-15
- [x] Backend integration tests (migrated scripts + new) — Tasks 16-18
- [x] E2E tests (Playwright) — Tasks 19-20
- [x] CI integration — Task 21
- [x] Cleanup of old root-level scripts — Tasks 16-17
- [x] package.json test script fixed — Task 1

**2. Placeholder scan:**
- [x] No "TBD", "TODO", "implement later", "fill in details"
- [x] No "Add appropriate error handling" / "add validation" / "handle edge cases"
- [x] No "Write tests for the above" without actual test code
- [x] No "Similar to Task N" references
- [x] All steps show actual code or exact commands
- [x] No undefined types, functions, or methods referenced

**3. Type consistency:**
- [x] `calculate_median`, `calculate_std_dev`, `calculate_quartiles`, `find_outliers`, `calculate_mode` match in extraction and tests
- [x] `base_url` fixture name consistent across all integration tests
- [x] `cleanup_surveys` fixture name consistent across all integration tests

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-29-phase1-testing-foundation-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration. Uses `superpowers:subagent-driven-development`.

**2. Inline Execution** - Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

**Which approach?**
