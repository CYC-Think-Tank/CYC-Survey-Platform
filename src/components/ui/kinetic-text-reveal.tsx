'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * KineticTextReveal — word-by-word mask reveal that plays as the text scrolls
 * into view. Each word rises out of a clipped line for a kinetic feel.
 */
export function KineticTextReveal({
  text,
  className,
  delay = 0,
  once = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(' ');

  if (reduce) {
    return <span className={className}>{text}</span>;
  }

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: delay } },
  };
  const word: Variants = {
    hidden: { y: '115%' },
    visible: {
      y: '0%',
      transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.35 }}
      className={cn('inline-block', className)}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span variants={word} className="inline-block">
            {w}
          </motion.span>
          {i < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </motion.span>
  );
}

export default KineticTextReveal;
