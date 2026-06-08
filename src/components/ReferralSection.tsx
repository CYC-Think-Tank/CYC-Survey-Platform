'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ReferralSection({
  variant = 'floating',
}: {
  variant?: 'floating' | 'inline' | 'block';
}) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReferral = useCallback(
    async (targetEmail: string) => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/user/referral-link?email=${encodeURIComponent(targetEmail)}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.code) {
          setReferralCode(data.code);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cyc_global_email', targetEmail);
          }
        }
      } catch {
        setError(t('Something went wrong. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const savedEmail =
      typeof window !== 'undefined' ? localStorage.getItem('cyc_global_email') : null;
    if (savedEmail) {
      setEmail(savedEmail);
      fetchReferral(savedEmail);
    }
  }, [fetchReferral]);

  useEffect(() => {
    if (variant !== 'inline') return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant]);

  if (variant === 'block') {
    return (
      <div className="w-full max-w-6xl mx-auto bg-gradient-to-r from-[#0CA7A1] to-[#04377E] rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between mt-16 mb-8 border-[6px] border-white/10 backdrop-blur-sm">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Gift className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 w-full md:w-1/2 mb-8 md:mb-0 text-white pr-0 md:pr-8">
          <h2 className="text-4xl md:text-6xl font-black mb-6 flex items-center drop-shadow-lg tracking-tight">
            <Gift className="w-12 h-12 mr-4 text-[#F5C518]" />
            {t('Win $100!')}
          </h2>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl inline-block mb-6 shadow-inner">
            <span className="text-2xl md:text-3xl font-black text-[#F5C518] tracking-wide drop-shadow-md block">
              {t('1 Referral = +1 Entry')}
            </span>
            <span className="text-sm md:text-base text-teal-50 font-medium mt-1 block">
              {t('No limit on entries! Share with everyone.')}
            </span>
          </div>
          <p className="text-teal-50/90 text-lg md:text-xl leading-relaxed font-medium">
            {t(
              'Generate your personal link. The more friends who complete the survey using your link, the higher your chances of winning the $100 prize!'
            )}
          </p>
        </div>

        <div className="relative z-10 w-full md:w-[45%] bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/50">
          <AnimatePresence mode="wait">
            {!referralCode ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleGenerate}
                className="w-full flex flex-col gap-4"
              >
                <div className="text-center mb-2">
                  <h3 className="text-xl font-extrabold text-[#04377E] mb-2">
                    {t('Get Your Link')}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    {t('Enter your email to generate a unique tracking link.')}
                  </p>
                </div>
                <input
                  type="email"
                  required
                  placeholder={t('Your email address')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-base border-2 border-gray-200 text-gray-900 bg-gray-50 focus:outline-none focus:border-[#0CA7A1] focus:ring-4 focus:ring-[#0CA7A1]/20 font-medium placeholder:text-gray-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-4 bg-[#F5C518] hover:bg-yellow-400 text-gray-900 text-lg font-black rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:hover:translate-y-0 uppercase tracking-wider"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {t('Generate Link')}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-red-500 mt-2 text-sm font-bold text-center">{error}</p>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5 text-center"
              >
                <div className="mx-auto bg-green-100 p-3 rounded-full mb-2 text-green-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#04377E] mb-1">
                    {t('Link Generated!')}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    {t('Share this with your friends.')}
                  </p>
                </div>

                <div className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-200 relative group overflow-hidden">
                  <code className="text-sm font-mono tracking-wide text-slate-800 block truncate select-all">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${referralCode}`}
                  </code>
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center px-6 py-4 bg-[#0CA7A1] hover:bg-[#0A8A85] text-white text-lg font-black rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 uppercase tracking-wider"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      {t('Copied!')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      {t('Copy Link')}
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      fetchReferral(email.trim());
    }
  };

  const handleCopy = () => {
    if (!referralCode) return;
    const url = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFloating = variant === 'floating';

  const modalContent = (
    <motion.div
      initial={{
        opacity: 0,
        y: isFloating ? 10 : -10,
        scale: 0.95,
        transformOrigin: isFloating ? 'bottom left' : 'top center',
      }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isFloating ? 10 : -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(4,55,126,0.2)] border border-gray-100 w-[280px] sm:w-[320px] relative overflow-hidden flex flex-col text-left cursor-auto ${isFloating ? 'mb-3' : ''}`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-2 -translate-y-2">
        <Gift className="w-24 h-24 text-[#0CA7A1]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[17px] font-black text-[#04377E] tracking-tight flex items-center">
            <Gift className="w-5 h-5 mr-1.5 text-[#0CA7A1]" />
            {t('Boost Your Chances to Win $100!')}
          </h3>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-teal-100 rounded-full blur-xl opacity-50 transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          <p className="text-[13px] text-teal-900 font-extrabold mb-1 text-center drop-shadow-sm">
            {t('1 Referral = +1 Extra Raffle Entry')}
          </p>
          <p className="text-[11px] text-teal-800 leading-relaxed text-center font-medium">
            {t(
              'Share your link below. The more friends who complete the survey, the higher your chances of winning!'
            )}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!referralCode ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleGenerate}
              className="w-full flex flex-col gap-2"
            >
              <input
                type="email"
                required
                placeholder={t('Your email address')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-gray-200 text-gray-900 bg-gray-50 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#0CA7A1] font-medium placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-[#F5C518] hover:bg-yellow-400 text-gray-900 text-xs font-extrabold rounded-xl shadow-md transition-all disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {t('Get Link')}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </>
                )}
              </button>
              {error && <p className="text-red-500 mt-1 text-[10px] font-bold">{error}</p>}
            </motion.form>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-2.5"
            >
              <div className="overflow-hidden w-full bg-teal-50 px-3 py-2 rounded-xl border border-teal-100 text-left">
                <p className="text-[9px] text-teal-600 font-bold uppercase tracking-wider mb-0.5">
                  {t('Your unique link:')}
                </p>
                <code className="text-[11px] font-mono tracking-wide text-teal-900 block truncate select-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${referralCode}`}
                </code>
              </div>
              <button
                onClick={handleCopy}
                className="w-full flex items-center px-4 py-2 bg-[#0CA7A1] hover:bg-[#0A8A85] text-white text-xs font-bold rounded-xl shadow-md transition-all justify-center"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {t('Copied!')}
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {t('Copy Link')}
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className={
        isFloating
          ? 'fixed bottom-4 left-4 z-50 flex flex-col items-start'
          : 'relative mt-2 flex flex-col items-center'
      }
      onMouseEnter={isFloating ? () => setIsExpanded(true) : undefined}
      onMouseLeave={isFloating ? () => setIsExpanded(false) : undefined}
    >
      {isFloating && <AnimatePresence>{isExpanded && modalContent}</AnimatePresence>}

      {isFloating ? (
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="pr-5 pl-2 py-2 rounded-full bg-gradient-to-r from-[#0CA7A1] to-[#0A8A85] text-white flex items-center shadow-[0_8px_25px_rgba(12,167,161,0.5)] hover:shadow-[0_12px_30px_rgba(12,167,161,0.6)] transition-all duration-300 border border-teal-400/30"
        >
          <div className="flex items-center justify-center bg-white/20 rounded-full p-2.5 mr-3 backdrop-blur-sm">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[13px] font-black leading-tight tracking-wide uppercase drop-shadow-md">
              {t('Win $100!')}
            </span>
            <span className="text-[10px] font-bold text-teal-50 tracking-wide mt-0.5 opacity-95">
              {t('1 Referral = +1 Entry')}
            </span>
          </div>
        </motion.button>
      ) : (
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-5 py-2.5 rounded-full bg-[#0CA7A1] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:bg-[#0A8A85] transition-all duration-200 text-sm font-extrabold uppercase tracking-wide"
        >
          <Gift className="w-4 h-4 mr-2" />
          {t('Boost Win Chances')}
        </motion.button>
      )}

      {!isFloating && (
        <AnimatePresence>
          {isExpanded && <div className="absolute top-full pt-2 z-50">{modalContent}</div>}
        </AnimatePresence>
      )}
    </div>
  );
}
