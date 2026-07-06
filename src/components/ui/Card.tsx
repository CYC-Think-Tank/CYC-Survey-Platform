import { cn } from '@/lib/utils';
import React from 'react';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-3xl border border-border bg-card shadow-cute-sm p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
