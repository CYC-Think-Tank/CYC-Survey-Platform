'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ReferralSection() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('cyc_global_email') : null;
    if (savedEmail) {
      setEmail(savedEmail);
      fetchReferral(savedEmail);
    }
  }, []);

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

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 z-20 relative px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="bg-gradient-to-r from-[#0CA7A1] to-[#0A8A85] p-8 md:p-10 rounded-3xl shadow-2xl text-center text-white relative overflow-hidden border border-teal-400/30"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
          <Gift className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 mb-6 border border-white/30">
            <Gift className="w-4 h-4 mr-2" />
            <span className="text-sm font-bold uppercase tracking-wider">{t('Share & Win')}</span>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-black mb-4 tracking-tight drop-shadow-sm">
            {t('Get Your Personal Referral Link')}
          </h2>
          
          <p className="text-lg md:text-xl text-teal-50 mb-8 max-w-2xl mx-auto leading-relaxed">
            {t(
              'Share your personal link to earn extra raffle entries. For every survey completed using your link, you get an extra chance to win $100!'
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
                className="max-w-md mx-auto relative"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder={t('Enter your email address')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-5 py-4 rounded-xl text-gray-900 bg-white shadow-inner focus:outline-none focus:ring-4 focus:ring-teal-300 font-medium placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center px-6 py-4 bg-[#F5C518] hover:bg-yellow-400 text-gray-900 font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 whitespace-nowrap"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {t('Get Link')}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                </div>
                {error && <p className="text-red-200 mt-3 text-sm font-medium bg-red-900/20 py-2 rounded-lg">{error}</p>}
              </motion.form>
            ) : (
              <motion.div 
                key="code"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-black/10 p-6 rounded-2xl border border-white/20 backdrop-blur-sm"
              >
                <div className="flex-1 overflow-hidden w-full bg-white/10 px-5 py-4 rounded-xl border border-white/30 text-left">
                  <p className="text-xs text-teal-100 font-semibold uppercase tracking-wider mb-1">{t('Your unique link:')}</p>
                  <code className="text-base sm:text-lg font-mono tracking-wide text-white block truncate">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${referralCode}`}
                  </code>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center px-8 py-4 bg-white text-[#0CA7A1] font-extrabold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all w-full sm:w-auto justify-center"
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
      </motion.div>
    </div>
  );
}
