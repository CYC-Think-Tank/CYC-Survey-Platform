"use client";
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, BarChart3, Globe, Users, Star } from 'lucide-react';

function TiltCard({ item, isCompleted, t, isFront, children, className }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = x;
  const mouseYSpring = y;

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFront) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isFront ? rotateX : 0,
        rotateY: isFront ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t, language } = useLanguage();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [angle, setAngle] = useState(0);
  const [targetAngle, setTargetAngle] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(0);

  const [carouselConfig, setCarouselConfig] = useState({
    radius: 320,
    yOffsetMax: -50,
    rotZMax: 14,
    rotXMax: 8,
    scaleMin: 0.5
  });

  useEffect(() => {
    // Hold the intro state for 2 seconds (allows logo to fade in and hold before moving)
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setCarouselConfig({
          radius: 80,
          yOffsetMax: -15,
          rotZMax: 5,
          rotXMax: 4,
          scaleMin: 0.65
        });
      } else if (window.innerWidth < 768) {
        setCarouselConfig({
          radius: 160,
          yOffsetMax: -30,
          rotZMax: 8,
          rotXMax: 6,
          scaleMin: 0.55
        });
      } else if (window.innerWidth < 1024) {
        setCarouselConfig({
          radius: 240,
          yOffsetMax: -40,
          rotZMax: 12,
          rotXMax: 7,
          scaleMin: 0.5
        });
      } else {
        setCarouselConfig({
          radius: 320,
          yOffsetMax: -50,
          rotZMax: 14,
          rotXMax: 8,
          scaleMin: 0.5
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem('cyc_completed_surveys') || '[]');
    setCompletedIds(c);
    fetch('/api/surveys')
      .then(r => r.json())
      .then(async (d) => {
        const withTranslations = await Promise.all(
          d.map(async (survey: any) => {
            try {
              const tr = await fetch(`/api/surveys/${survey.id}/translation`).then(res => res.json());
              return {
                ...survey,
                title_fr: tr?.title_fr,
                description_fr: tr?.description_fr
              };
            } catch {
              return survey;
            }
          })
        );
        setSurveys(withTranslations);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isSingleActiveSurvey = surveys.length === 1;

  useEffect(() => {
    if (isSingleActiveSurvey) return;

    const SPEED = 0.012;
    const tick = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = t - lastRef.current;
      lastRef.current = t;
      setAngle(prev => {
        if (targetAngle !== null) {
          const diff = ((targetAngle - prev + 180) % 360 + 360) % 360 - 180;
          if (Math.abs(diff) < 0.3) return targetAngle;
          return prev + diff * 0.08;
        }
        if (isPaused) return prev;
        return prev + SPEED * dt;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, targetAngle, isSingleActiveSurvey]);

  const handleHover = (idx: number, stepLength: number) => {
    setIsPaused(true);
    const raw = -idx * stepLength;
    const rev = Math.round((angle - raw) / 360);
    setTargetAngle(raw + rev * 360);
  };
  const handleLeave = () => { setIsPaused(false); setTargetAngle(null); lastRef.current = 0; };

  if (loading) return (
    <div className="flex-1 flex justify-center items-center h-full bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5C518]" />
    </div>
  );

  const baseItems = surveys.slice(0, 3).map((item) => {
    const displayTitle = (language === 'fr' && item.title_fr ? item.title_fr : item.title) || item.title;
    const displayDescription = (language === 'fr' && item.description_fr ? item.description_fr : item.description) || item.description;
    return { ...item, displayTitle, displayDescription };
  });
  const items = [...baseItems];
  if (!isSingleActiveSurvey) {
    while (items.length < 3) {
      items.push({
        id: `coming-soon-${items.length}`,
        title: t('More Surveys Coming Soon'),
        description: t('We are preparing new surveys to gather your feedback. Please check back later to share your perspective!'),
        displayTitle: t('More Surveys Coming Soon'),
        displayDescription: t('We are preparing new surveys to gather your feedback. Please check back later to share your perspective!'),
        estimated_minutes: '--',
        isComingSoon: true
      });
    }
  }

  const STEP = 360 / Math.max(items.length, 1);
  const RX = 260;

  // Floating decoration data with varying depth (blur, scale, opacity, z-index)
  const decos = [
    // Far Background (Small, blurry, low opacity)
    { icon: <Globe className="w-5 h-5 text-white" />, cls: "top-[25%] left-[8%] rotate-[-15deg] scale-75 opacity-30 blur-[2px] z-0", bg: "bg-[#04377E]", delay: 0 },
    { icon: <Users className="w-5 h-5 text-white" />, cls: "bottom-[35%] right-[10%] rotate-[10deg] scale-50 opacity-20 blur-[3px] z-0", bg: "bg-[#0CB7C4]", delay: 1.2 },
    
    // Midground (Normal size, sharp, medium opacity)
    { icon: <BarChart3 className="w-6 h-6 text-white" />, cls: "top-[50%] left-[5%] rotate-[25deg] scale-100 opacity-60 z-0", bg: "bg-[#0CB7C4]", delay: 0.5 },
    { icon: <Star className="w-5 h-5 text-[#04377E]" />, cls: "top-[15%] right-[15%] rotate-[-20deg] scale-90 opacity-50 z-0", bg: "bg-white border border-gray-200 shadow-md", delay: 1.8 },
    
    // Foreground (Large, sharp, high opacity, pulled slightly inward to prevent clipping)
    { icon: <Globe className="w-8 h-8 text-[#1a1a1a]" />, cls: "bottom-[12%] left-[6%] rotate-[-18deg] scale-125 opacity-90 z-20", bg: "bg-[#F5C518] shadow-xl", delay: 0.8 },
    { icon: <BarChart3 className="w-6 h-6 text-white" />, cls: "top-[70%] right-[6%] rotate-[30deg] scale-150 opacity-80 z-20", bg: "bg-[#04377E] shadow-xl", delay: 2.5 },
  ];

  return (
    <div className={`flex-1 w-full flex flex-col items-center px-6 relative bg-slate-50 overflow-x-hidden -mb-10 pb-10 ${showIntro ? 'overflow-hidden' : ''}`}>

      {/* Background decorations */}
      {decos.map((d, i) => (
        <motion.div
          key={i}
          className={`absolute ${d.cls} ${d.bg} rounded-2xl p-3 hidden md:flex items-center justify-center`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: showIntro ? 0 : 1, scale: showIntro ? 0 : 1, y: [0, -15, 0] }}
          transition={{ 
            opacity: { duration: 1.0, delay: 0.4 + i * 0.15 },
            scale: { duration: 1.0, delay: 0.4 + i * 0.15, ease: "easeOut" },
            y: { duration: 4, repeat: Infinity, delay: d.delay, ease: "easeInOut" }
          }}
        >{d.icon}</motion.div>
      ))}

      {/* Small circles - Background */}
      <motion.div className="absolute top-[22%] right-[16%] w-4 h-4 rounded-full bg-[#04377E] opacity-20 blur-[2px] hidden md:block z-0" initial={{ opacity: 0 }} animate={{ opacity: showIntro ? 0 : 0.2 }} transition={{ duration: 1.2, delay: 0.5 }} />
      <motion.div className="absolute bottom-[30%] left-[8%] w-6 h-6 rounded-full bg-[#0CB7C4] opacity-30 blur-[1.5px] hidden md:block z-0" initial={{ opacity: 0 }} animate={{ opacity: showIntro ? 0 : 0.3 }} transition={{ duration: 1.2, delay: 0.6 }} />
      <motion.div className="absolute top-[65%] left-[22%] w-8 h-8 rounded-full border-[3px] border-[#F5C518] opacity-25 blur-[2px] hidden md:block z-0 scale-75" initial={{ opacity: 0 }} animate={{ opacity: showIntro ? 0 : 0.25 }} transition={{ duration: 1.2, delay: 0.7 }} />

      {/* Raffle Info Floating Box */}
      <motion.div
        className="absolute top-[38%] right-[5%] lg:right-[8%] z-30 hidden md:flex flex-col items-center bg-white border border-gray-100 shadow-[0_15px_40px_rgba(4,55,126,0.12)] rounded-2xl py-3 px-5 rotate-[4deg]"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: showIntro ? 0 : 1, scale: showIntro ? 0 : 1, y: [0, -8, 0] }}
        transition={{ 
          opacity: { duration: 1.0, delay: 0.9 },
          scale: { duration: 1.0, delay: 0.9, ease: "easeOut" },
          y: { duration: 4, repeat: Infinity, delay: 0, ease: "easeInOut" }
        }}
      >
        <div className="flex items-center justify-center bg-[#e6f8f9] rounded-full px-3 py-1 mb-1 border border-[#0CB7C4]/20">
          <span className="text-[10px] font-black uppercase text-[#0CB7C4] tracking-widest">
            {t('1 Survey = 1 Entry')}
          </span>
        </div>
        <span className="text-sm font-extrabold text-[#04377E]">
          {t('Win $100 (5 Winners!)')}
        </span>
      </motion.div>

      {/* Hero Section */}
      <motion.div
        className="w-full max-w-4xl mx-auto flex flex-col items-center text-center z-40 mt-3 sm:mt-6 md:mt-10"
      >
        <motion.img 
          src="/CYC_Logo.png" 
          alt="CYC Logo" 
          className="w-16 sm:w-20 md:w-28 h-auto mb-1 md:mb-2 opacity-90 origin-center relative z-50"
          initial={{ y: "35vh", scale: 2.0, opacity: 0 }}
          animate={{ 
            y: showIntro ? "35vh" : 0, 
            scale: showIntro ? 2.0 : 1,
            opacity: 1
          }}
          transition={{ 
            opacity: { duration: 1.2, ease: "easeOut" },
            y: { duration: 1.2, ease: [0.25, 1, 0.5, 1] },
            scale: { duration: 1.2, ease: [0.25, 1, 0.5, 1] }
          }}
        />
        <motion.h1 
          className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#04377E] tracking-tight leading-[1.0] mb-2 sm:mb-4 font-inter uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showIntro ? 0 : 1, y: showIntro ? 20 : 0 }}
          transition={{ duration: 1.0, delay: 0.3 }}
        >
          {t('Make Your Voice')}<br />{t('Heard.')}
        </motion.h1>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showIntro ? 0 : 1, y: showIntro ? 20 : 0 }}
          transition={{ duration: 1.0, delay: 0.5 }}
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.97 }}
        >
          <Link
            href="/surveys"
            className="inline-flex items-center bg-[#F5C518] hover:bg-yellow-400 text-[#1a1a1a] font-extrabold py-2 px-6 sm:py-3.5 sm:px-10 rounded-full text-xs sm:text-base md:text-lg shadow-[0_4px_20px_rgba(245,197,24,0.4)] hover:shadow-[0_6px_25px_rgba(245,197,24,0.6)] transition-all duration-300 uppercase tracking-wider"
          >{t('START NOW')}</Link>
        </motion.div>
      </motion.div>

      {/* 3D Spinning Carousel */}
      {items.length > 0 && (
        <motion.div 
          className="w-full max-w-5xl mx-auto z-10 mt-4 sm:mt-8 md:mt-12 relative flex-1 min-h-0 flex items-start justify-center pt-2 md:pt-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: showIntro ? 0 : 1, y: showIntro ? 40 : 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
        >
          {items.map((item, idx) => {
            const cardAngle = angle + idx * STEP;
            const rad = (cardAngle * Math.PI) / 180;
            const x = Math.sin(rad) * carouselConfig.radius;
            const zF = Math.cos(rad); // -1 back, 1 front
            const sc = carouselConfig.scaleMin + (1 - carouselConfig.scaleMin) * ((zF + 1) / 2);
            const zI = Math.round((zF + 1) * 10);
            
            // Tilted and different Ys for the "slightly above view" fan effect
            const rotZ = Math.sin(rad) * carouselConfig.rotZMax;
            const yOff = (1 - zF) * carouselConfig.yOffsetMax;
            const rotX = (1 - zF) * carouselConfig.rotXMax;

            const isCompleted = completedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="absolute w-[260px] sm:w-[320px] md:w-[420px] lg:w-[500px] cursor-pointer perspective-[1000px]"
                style={{ transform: `translateX(${x}px) translateY(${yOff}px) scale(${sc}) rotateZ(${rotZ}deg) rotateX(${rotX}deg)`, zIndex: zI }}
                onMouseEnter={() => !isSingleActiveSurvey && handleHover(idx, STEP)}
                onMouseLeave={!isSingleActiveSurvey ? handleLeave : undefined}
              >
                <motion.div
                  animate={isSingleActiveSurvey ? {
                    y: [0, -10, 0],
                  } : {}}
                  transition={isSingleActiveSurvey ? {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : undefined}
                  className="w-full h-full"
                >
                  <TiltCard
                    item={item}
                    isCompleted={isCompleted}
                    t={t}
                    isFront={zI >= 15}
                    className={`rounded-2xl border flex flex-col justify-between overflow-hidden transition-colors duration-200 bg-white h-[200px] sm:h-[240px] md:h-[280px] lg:h-[340px] relative ${
                      zI >= 15
                        ? 'border-[#F5C518]/30 shadow-[0_15px_40px_rgba(0,0,0,0.2)]'
                        : 'border-gray-200/60 shadow-lg'
                    }`}
                  >
                  {item.thumbnail_url && (
                    <div className="absolute inset-0 z-0 pointer-events-none" style={{ transform: "translateZ(-10px)" }}>
                      <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover scale-110" />
                      <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px]" />
                    </div>
                  )}
                  <div className="relative z-10 p-4 sm:p-5 md:p-8 flex flex-col h-full justify-between" style={{ transform: "translateZ(30px)" }}>
                  <div>
                    <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                      {isCompleted && (
                        <div className="flex items-center text-green-600 text-[10px] font-bold bg-green-50 px-2.5 py-1 rounded-full shadow-sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" />{t('Completed')}
                        </div>
                      )}
                      <span className="flex items-center text-[10px] text-gray-400 font-bold tracking-wide ml-auto">
                        <Clock className="w-3.5 h-3.5 mr-1" />{item.estimated_minutes === '--' ? '--' : `${item.estimated_minutes} ${t('MIN')}`}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl md:text-4xl font-extrabold mb-1.5 sm:mb-3 leading-tight line-clamp-2 md:line-clamp-3 text-[#1a1a1a] drop-shadow-sm">{item.displayTitle || item.title}</h2>
                    <p className="text-[11px] sm:text-sm md:text-base leading-relaxed line-clamp-2 sm:line-clamp-3 md:line-clamp-4 text-gray-500">
                      {(item.displayDescription || item.description)?.replace(/<[^>]*>?/gm, '') || t('Share your perspective on issues that matter.')}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-end">
                    {item.isComingSoon ? (
                      <button disabled className="flex items-center px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-base font-bold bg-gray-100 text-gray-400 cursor-not-allowed">
                        {t('Coming Soon')}
                      </button>
                    ) : isCompleted ? (
                      <span className="text-xs text-green-500 font-bold flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{t('Done')}
                      </span>
                    ) : (
                      <Link href={`/survey/${item.id}`}
                        className="flex items-center px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-base font-bold bg-[#F5C518] text-[#1a1a1a] hover:bg-yellow-400 shadow-md hover:shadow-lg transition-all duration-200"
                      >{t('Start Survey')}<ArrowRight className="w-3 h-3 ml-1 sm:w-4 sm:h-4 sm:ml-2" /></Link>
                    )}
                  </div>
                </div>
                </TiltCard>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
