'use client';

import { useEffect, useState } from 'react';
import { Ticket, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Shown on the landing page only when the visitor arrived through an event QR
 * code (carrying ?event=<code>). New visitors just complete a survey to enter;
 * this banner lets people who ALREADY completed a survey join the same raffle
 * by entering their email (the server verifies they completed something).
 */
export function EventRaffleBanner() {
  const { t } = useLanguage();
  const [eventCode, setEventCode] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'entered' | 'needsurvey' | 'error'>('idle');

  useEffect(() => {
    const fromUrl =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('event')
        : null;
    const code = fromUrl || localStorage.getItem('cyc_event_code');
    if (code) {
      setEventCode(code);
      localStorage.setItem('cyc_event_code', code);
    }
    const storedEmail = localStorage.getItem('cyc_global_email');
    if (storedEmail) setEmail(storedEmail);
  }, []);

  if (!eventCode) return null;

  const handleEnter = async () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/event-raffle/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, event_code: eventCode }),
      });
      if (res.ok) {
        localStorage.setItem('cyc_global_email', value);
        setStatus('entered');
      } else if (res.status === 403) {
        setStatus('needsurvey');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto z-50 mt-3 mb-1 px-2">
      <div className="bg-gradient-to-r from-[#04377E] to-[#0CB7C4] rounded-2xl shadow-lg p-4 sm:p-5 text-white">
        {status === 'entered' ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <CheckCircle2 className="w-6 h-6 text-[#F5C518]" />
            <span className="font-extrabold text-lg">
              {t("You're entered into the raffle — good luck!")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Ticket className="w-6 h-6 text-[#F5C518]" />
              <div>
                <p className="font-extrabold leading-tight">{t('Event Raffle is live!')}</p>
                <p className="text-xs text-white/80 leading-tight">
                  {t('Complete a survey below to enter — or, if you already did:')}
                </p>
              </div>
            </div>
            <div className="flex flex-1 gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEnter();
                }}
                placeholder={t('Your email')}
                className="flex-grow min-w-0 px-3 py-2 rounded-lg text-[#1a1a1a] text-sm focus:outline-none"
              />
              <button
                onClick={handleEnter}
                disabled={submitting}
                className="bg-[#F5C518] hover:bg-yellow-400 text-[#1a1a1a] font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors disabled:opacity-60"
              >
                {submitting ? '…' : t('Enter raffle')}
              </button>
            </div>
          </div>
        )}
        {status === 'needsurvey' && (
          <p className="text-xs text-[#F5C518] mt-2 text-center sm:text-left">
            {t('Please complete a survey first to enter the raffle.')}
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs text-[#F5C518] mt-2 text-center sm:text-left">
            {t('Please enter a valid email address.')}
          </p>
        )}
      </div>
    </div>
  );
}
