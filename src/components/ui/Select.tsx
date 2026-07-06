import { cn } from '@/lib/utils';
import React from 'react';

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
        className
      )}
      {...props}
    >
      {props.children}
    </select>
  );
}
