'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, CheckCircle2, ArrowRight, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ReferralSection({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReferral = async (targetEmail: string) => {
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
  };

  useEffect(() => {
    const savedEmail =
      typeof window !== 'undefined' ? localStorage.getItem('cyc_global_email') : null;
    if (savedEmail) {
      setEmail(savedEmail);
      fetchReferral(savedEmail);
    }
  }, []);

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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-black text-[#04377E] tracking-tight flex items-center">
            <Gift className="w-4 h-4 mr-1.5 text-[#0CA7A1]" />
            {t('Share & Win')}
          </h3>
        </div>

        <p className="text-[11px] text-gray-500 mb-4 leading-relaxed font-medium">
          {t(
            'Share your personal link. For every survey completed using your link, you get an extra chance to win $100!'
          )}
        </p>

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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full bg-[#0CA7A1] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(12,167,161,0.4)] hover:shadow-[0_12px_25px_rgba(12,167,161,0.5)] transition-all duration-200"
        >
          <Share2 className="w-5 h-5" />
        </motion.button>
      ) : (
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-5 py-2.5 rounded-full bg-[#0CA7A1] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:bg-[#0A8A85] transition-all duration-200 text-sm font-extrabold uppercase tracking-wide"
        >
          <Gift className="w-4 h-4 mr-2" />
          {t('Share & Win')}
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
