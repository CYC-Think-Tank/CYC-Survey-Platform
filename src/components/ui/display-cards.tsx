'use client';

import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
}

/**
 * Stacked, skewed "display cards" that sit grayscale and bloom into brand
 * colour on hover. Adapted from the shadcn community component to the
 * CodeCats palette (headband red + cream + charcoal).
 */
function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-white" />,
  title = 'Featured',
  description = 'Discover amazing content',
  date = 'Just now',
  titleClassName = 'text-teal',
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[20rem] -skew-y-[8deg] select-none flex-col justify-between rounded-2xl border-2 border-teal-soft bg-card/70 px-4 py-3 backdrop-blur-sm transition-all duration-700 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[18rem] after:bg-gradient-to-l after:from-cream after:to-transparent after:content-[''] hover:border-teal/40 hover:bg-card sm:w-[22rem] [&>*]:flex [&>*]:items-center [&>*]:gap-2",
        className
      )}
    >
      <div>
        <span className="relative inline-block rounded-full bg-teal p-1.5">{icon}</span>
        <p className={cn('font-display text-lg font-bold', titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-lg text-ink">{description}</p>
      <p className="text-sm text-ink-soft">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-2xl before:outline-teal-soft before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-cream/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className:
        "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-2xl before:outline-teal-soft before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-cream/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className: '[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10',
    },
  ];

  const displayCards = cards || defaultCards;

  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.28 } },
  };
  // Each card pops in: fades up and scales from slightly small into place.
  const item: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.85 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 120, damping: 20 },
    },
  };

  return (
    <motion.div
      className="grid place-items-center opacity-100 [grid-template-areas:'stack']"
      variants={reduce ? undefined : container}
      initial={reduce ? undefined : 'hidden'}
      whileInView={reduce ? undefined : 'visible'}
      viewport={{ once: true, amount: 0.4 }}
    >
      {displayCards.map((cardProps, index) => (
        <motion.div key={index} className="[grid-area:stack]" variants={reduce ? undefined : item}>
          <DisplayCard {...cardProps} />
        </motion.div>
      ))}
    </motion.div>
  );
}
