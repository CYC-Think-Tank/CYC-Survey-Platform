import React from 'react';
import Reveal from '@/components/Reveal';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, className }: SectionHeadingProps) {
  return (
    <Reveal className={cn('flex flex-col gap-3', className)}>
      {eyebrow && (
        <span className="uppercase tracking-[0.18em] text-teal font-semibold text-sm">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-normal tracking-tighter text-ink leading-[1.05]">
        {title}
      </h2>
    </Reveal>
  );
}
