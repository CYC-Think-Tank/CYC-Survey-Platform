'use client';
import React, { useRef } from 'react';
import { useScroll, useSpring, useTransform, motion, MotionValue } from 'framer-motion';

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'center center'],
  });
  // Smooth the raw scroll progress so the transforms glide instead of
  // snapping frame-to-frame with the scroll wheel/trackpad.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 32,
    restDelta: 0.001,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [1, 1] : [1.05, 1];
  };

  const rotate = useTransform(smoothProgress, [0, 0.95], [30, 0]);
  const scale = useTransform(smoothProgress, [0, 1], scaleDimensions());
  const translate = useTransform(smoothProgress, [0, 1], [0, -100]);

  return (
    <div
      className="relative flex items-center justify-center p-2 py-10 md:h-[64rem] md:p-20"
      ref={containerRef}
    >
      <div
        className="relative w-full md:py-32"
        style={{
          perspective: isMobile ? 'none' : '1000px',
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} isMobile={isMobile} />
        <Card rotate={rotate} scale={scale} isMobile={isMobile}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
  isMobile,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
  isMobile: boolean;
}) => {
  return (
    <motion.div
      style={isMobile ? {} : { translateY: translate, willChange: 'transform' }}
      className="div mx-auto max-w-5xl text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  isMobile,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  isMobile: boolean;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={
        isMobile
          ? {}
          : {
              rotateX: rotate,
              scale,
              willChange: 'transform',
            }
      }
      className={`mx-auto w-full max-w-5xl rounded-[28px] border border-ink/10 bg-[#1e1e26] p-2 shadow-2xl md:-mt-12 md:h-[38rem] md:p-3 ${
        isMobile ? 'mt-8 h-[24rem]' : 'h-[28rem]'
      }`}
    >
      <div className="h-full w-full overflow-hidden rounded-[20px] bg-[#1e1e26]">{children}</div>
    </motion.div>
  );
};
