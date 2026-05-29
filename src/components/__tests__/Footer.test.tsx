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
    expect(screen.getByText(/The Canadian Youth Champions \(thecyc\.org\)/)).toBeInTheDocument();
    expect(screen.getByText(/is a registered Canadian non-profit #1260703-4\./)).toBeInTheDocument();
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
