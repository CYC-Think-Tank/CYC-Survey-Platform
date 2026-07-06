'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'teal';

const styles: Record<Variant, string> = {
  primary: 'bg-gold text-[#1a1a1a] shadow-cute hover:bg-gold-deep',
  ghost: 'bg-card text-ink ring-2 ring-border hover:ring-teal',
  teal: 'bg-teal text-white shadow-cute-sm hover:shadow-cute hover:-translate-y-1',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: Variant;
}

export default function Button({
  href,
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const combinedClassName = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-base font-bold transition-transform hover:-translate-y-0.5 active:scale-[0.97] transition-colors duration-200 ${styles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}
