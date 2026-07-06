'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ArrowLeft,
  QrCode,
  Maximize2,
  X,
  Trophy,
  RotateCw,
  Users,
  RefreshCw,
  EyeOff,
  Eye,
  Sparkles,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminFetch, ensureArray, isAdminFetchError, parseJsonResponse } from '@/lib/adminAuth';

interface Survey {
  id: string;
  title: string;
  is_active: boolean;
}

interface EventCode {
  event_code: string;
  count: number;
  latest: string | null;
}

type RaffleMode = 'general' | 'event';

// Max wedges drawn on the wheel; the winner is chosen first, then placed on the
// wheel, so sampling the display for readability does not affect fairness.
const MAX_WHEEL_SEGMENTS = 24;

const WHEEL_COLORS = [
  '#0cb7c4',
  '#04377e',
  '#f5c518',
  '#ef6c5a',
  '#5b8def',
  '#27ae60',
  '#9b59b6',
  '#e67e22',
];

const EVENT_CODE_KEY = 'cyc_admin_event_code';
const EVENT_SURVEY_KEY = 'cyc_admin_event_survey';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateEventCode(): string {
  return `evt-${Math.random().toString(36).slice(2, 8)}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export default function AdminRafflePage() {
  const [raffleMode, setRaffleMode] = useState<RaffleMode>('general');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [eventCode, setEventCode] = useState<string>('');
  const [knownEvents, setKnownEvents] = useState<EventCode[]>([]);

  const [entries, setEntries] = useState<string[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [winners, setWinners] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<
    { left: number; delay: number; dur: number; color: string; sizePx: number }[]
  >([]);
  const [maskEmails, setMaskEmails] = useState(false);
  const [displaySegments, setDisplaySegments] = useState<string[]>([]);
  const [fullscreenQr, setFullscreenQr] = useState(false);
  const [fullscreenWheel, setFullscreenWheel] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const highlightRef = useRef<number>(-1);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // ---- Init: restore event code + survey, load surveys & known events --
  useEffect(() => {
    const storedCode = localStorage.getItem(EVENT_CODE_KEY);
    setEventCode(storedCode || generateEventCode());
    const storedSurvey = localStorage.getItem(EVENT_SURVEY_KEY);
    if (storedSurvey) setSelectedSurvey(storedSurvey);

    adminFetch('/api/surveys?include_inactive=true')
      .then((res) => parseJsonResponse<unknown>(res, 'Failed to load surveys'))
      .then((data) => setSurveys(ensureArray<Survey>(data, 'Unexpected survey response from API')))
      .catch(() => setSurveys([]));
  }, []);

  const loadKnownEvents = useCallback(() => {
    adminFetch('/api/admin/event-codes')
      .then((res) => parseJsonResponse<unknown>(res, 'Failed to load event codes'))
      .then((data) =>
        setKnownEvents(ensureArray<EventCode>(data, 'Unexpected event-code response from API'))
      )
      .catch(() => setKnownEvents([]));
  }, []);

  useEffect(() => {
    loadKnownEvents();
  }, [loadKnownEvents]);

  // Persist event code + survey choice
  useEffect(() => {
    if (eventCode) localStorage.setItem(EVENT_CODE_KEY, eventCode);
  }, [eventCode]);
  useEffect(() => {
    localStorage.setItem(EVENT_SURVEY_KEY, selectedSurvey);
  }, [selectedSurvey]);

  // ---- Entries loading -------------------------------------------------
  const loadEntries = useCallback(
    (silent = false) => {
      if (raffleMode === 'event' && !eventCode) return;
      if (!silent) setLoadingEntries(true);
      setEntriesError(null);
      const endpoint =
        raffleMode === 'general'
          ? '/api/admin/raffle-entries'
          : `/api/admin/event-raffle-entries?event_code=${encodeURIComponent(eventCode)}`;
      adminFetch(endpoint)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => setEntries(data.entries || []))
        .catch((err) => {
          if (!isAdminFetchError(err)) {
            console.error(err);
          }
          if (!silent) setEntriesError(`Failed to load ${raffleMode} raffle entries.`);
        })
        .finally(() => {
          if (!silent) setLoadingEntries(false);
        });
    },
    [eventCode, raffleMode]
  );

  useEffect(() => {
    setWinners([]);
    setCurrentWinner(null);
    loadEntries();
  }, [loadEntries]);

  // Auto-refresh entries while the event is running
  useEffect(() => {
    if (raffleMode !== 'event' || !autoRefresh || spinning) return;
    const interval = setInterval(() => loadEntries(true), 8000);
    return () => clearInterval(interval);
  }, [raffleMode, autoRefresh, spinning, loadEntries]);

  // ---- Derived values --------------------------------------------------
  const remainingPool = entries.filter((e) => !winners.includes(e));
  const uniqueRemaining = Array.from(new Set(remainingPool));
  const totalUnique = Array.from(new Set(entries)).length;
  const totalTickets = entries.length;

  const qrUrl =
    selectedSurvey === 'all'
      ? `${baseUrl}?event=${encodeURIComponent(eventCode)}`
      : `${baseUrl}/survey/${selectedSurvey}?event=${encodeURIComponent(eventCode)}`;
  const selectedTitle =
    selectedSurvey === 'all'
      ? 'CYC Survey'
      : surveys.find((s) => s.id === selectedSurvey)?.title || 'Survey';

  // ---- Wheel drawing ---------------------------------------------------
  const drawWheel = useCallback(
    (segments: string[], rotation: number, highlight: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const size = 520;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 8;

      if (segments.length === 0) {
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b7280';
        ctx.font = '600 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for entries…', cx, cy);
        return;
      }

      const n = segments.length;
      const seg = (Math.PI * 2) / n;

      for (let i = 0; i < n; i++) {
        const a0 = rotation + i * seg;
        const a1 = a0 + seg;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, a0, a1);
        ctx.closePath();
        ctx.fillStyle = i === highlight ? '#f5c518' : WHEEL_COLORS[i % WHEEL_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a0 + seg / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = i === highlight ? '#04377e' : '#ffffff';
        ctx.font = `${i === highlight ? '700' : '600'} ${n > 16 ? 11 : 13}px sans-serif`;
        const label = maskEmails ? maskEmail(segments[i]) : segments[i];
        ctx.fillText(truncate(label, n > 16 ? 16 : 22), radius - 14, 4);
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#04377e';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#04377e';
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CYC', cx, cy + 5);
    },
    [maskEmails]
  );

  // Recompute display segments when idle and pool changes.
  useEffect(() => {
    if (spinning) return;
    const segs =
      uniqueRemaining.length <= MAX_WHEEL_SEGMENTS
        ? shuffle(uniqueRemaining)
        : shuffle(uniqueRemaining).slice(0, MAX_WHEEL_SEGMENTS);
    setDisplaySegments(segs);
    highlightRef.current = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, winners, spinning]);

  useEffect(() => {
    drawWheel(displaySegments, rotationRef.current, highlightRef.current);
  }, [displaySegments, drawWheel, fullscreenWheel]);

  // ---- Spin logic ------------------------------------------------------
  const spin = () => {
    if (spinning) return;
    if (remainingPool.length === 0) return;

    const winnerEmail = remainingPool[Math.floor(Math.random() * remainingPool.length)];

    let segs: string[];
    if (uniqueRemaining.length <= MAX_WHEEL_SEGMENTS) {
      segs = shuffle(uniqueRemaining);
    } else {
      const others = shuffle(uniqueRemaining.filter((e) => e !== winnerEmail)).slice(
        0,
        MAX_WHEEL_SEGMENTS - 1
      );
      segs = shuffle([winnerEmail, ...others]);
    }
    setDisplaySegments(segs);

    const winnerIndex = segs.indexOf(winnerEmail);
    const n = segs.length;
    const segAngle = (Math.PI * 2) / n;
    const twoPi = Math.PI * 2;

    const currentRot = rotationRef.current;
    let target = -Math.PI / 2 - (winnerIndex * segAngle + segAngle / 2);
    while (target < currentRot) target += twoPi;
    target += twoPi * 6;

    setSpinning(true);
    setCurrentWinner(null);
    setShowConfetti(false);
    highlightRef.current = -1;

    const duration = 5200;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const rot = currentRot + (target - currentRot) * eased;
      rotationRef.current = rot;
      drawWheel(segs, rot, -1);
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        rotationRef.current = target;
        highlightRef.current = winnerIndex;
        drawWheel(segs, target, winnerIndex);
        setSpinning(false);
        setCurrentWinner(winnerEmail);
        setWinners((prev) => [...prev, winnerEmail]);
        setConfettiPieces(
          Array.from({ length: 120 }).map((_, i) => ({
            left: Math.random() * 100,
            delay: Math.random() * 0.8,
            dur: 2.5 + Math.random() * 2,
            color: WHEEL_COLORS[i % WHEEL_COLORS.length],
            sizePx: 6 + Math.random() * 8,
          }))
        );
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
      }
    };
    animRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const resetWinners = () => {
    setWinners([]);
    setCurrentWinner(null);
    setShowConfetti(false);
  };

  const startNewEvent = () => {
    if (
      knownEvents.length > 0 &&
      !window.confirm(
        'Start a brand new event? This generates a fresh code — only people who scan the NEW QR will be in the next draw.'
      )
    ) {
      return;
    }
    setEventCode(generateEventCode());
    setWinners([]);
    setCurrentWinner(null);
    setEntries([]);
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // The wheel + pointer + spin button. Rendered in EITHER the normal panel or
  // the fullscreen overlay (never both at once, so the single canvasRef is
  // always attached to exactly one canvas).
  const wheelStage = (fullscreen: boolean) => (
    <>
      <div
        className="relative"
        style={{ width: fullscreen ? 'min(78vh, 720px)' : 520, maxWidth: '100%' }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ top: fullscreen ? -10 : -6 }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${fullscreen ? 22 : 16}px solid transparent`,
              borderRight: `${fullscreen ? 22 : 16}px solid transparent`,
              borderTop: `${fullscreen ? 38 : 28}px solid #ef4444`,
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
            }}
          />
        </div>
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }} />
      </div>

      <button
        onClick={spin}
        disabled={spinning || remainingPool.length === 0}
        className="mt-6 btn-primary flex items-center text-lg px-8 py-3 disabled:opacity-40"
      >
        <RotateCw className={`w-5 h-5 mr-2 ${spinning ? 'animate-spin' : ''}`} />
        {spinning ? 'Spinning…' : 'SPIN'}
      </button>
    </>
  );

  // ---- Render ----------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/student"
          className="text-sm text-gray-500 dark:text-slate-400 hover:text-[var(--color-cyc-primary)] flex items-center mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink flex items-center">
          <Trophy className="w-7 h-7 mr-2 text-[var(--color-cyc-accent)]" />
          {raffleMode === 'general' ? 'General Raffle' : 'Event Raffle'}
        </h1>
        <p className="text-gray-500 dark:text-slate-500 mt-1">
          {raffleMode === 'general'
            ? "Draw from raffle tickets earned across your team's surveys."
            : "Only people who complete a survey through this event's QR code enter this wheel."}
        </p>
      </div>

      <div className="inline-flex border border-gray-300 dark:border-slate-700 rounded-lg p-1 mb-6 bg-gray-100 dark:bg-slate-900">
        {(['general', 'event'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setRaffleMode(mode)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              raffleMode === mode
                ? 'bg-white dark:bg-slate-700 text-ink shadow-sm'
                : 'text-gray-500 dark:text-slate-400'
            }`}
          >
            {mode === 'general' ? 'General raffle' : 'Event raffle'}
          </button>
        ))}
      </div>

      {/* Event setup */}
      {raffleMode === 'event' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-gray-200 dark:border-slate-700 p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                Event code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.trim())}
                  className="p-2.5 border-2 border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:border-[var(--color-cyc-primary)] focus:outline-none text-sm font-mono w-44"
                />
                <button
                  onClick={startNewEvent}
                  className="btn-secondary flex items-center whitespace-nowrap"
                  title="Generate a fresh event code"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  New event
                </button>
              </div>
            </div>

            {knownEvents.length > 0 && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                  Past events
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setEventCode(e.target.value);
                  }}
                  className="p-2.5 border-2 border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:border-[var(--color-cyc-primary)] focus:outline-none text-sm"
                >
                  <option value="">Load existing…</option>
                  {knownEvents.map((ev) => (
                    <option key={ev.event_code} value={ev.event_code}>
                      {ev.event_code} ({ev.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                QR links to
              </label>
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                className="p-2.5 border-2 border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:border-[var(--color-cyc-primary)] focus:outline-none text-sm"
              >
                <option value="all">Landing page (all surveys)</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.is_active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                <Users className="w-4 h-4 mr-1.5 text-[var(--color-cyc-primary)]" />
                {totalUnique} {totalUnique !== 1 ? 'people' : 'person'}
                <span className="mx-1.5 text-gray-300 dark:text-slate-600">·</span>
                {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => loadEntries()}
                className="btn-secondary flex items-center"
                disabled={loadingEntries}
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingEntries ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <label className="flex items-center text-gray-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-[var(--color-cyc-primary)] focus:ring-[var(--color-cyc-primary)]"
              />
              Auto-refresh entries (every 8s)
            </label>
            <button
              onClick={() => setMaskEmails((m) => !m)}
              className="flex items-center text-gray-600 dark:text-slate-400 hover:text-[var(--color-cyc-primary)]"
            >
              {maskEmails ? (
                <Eye className="w-4 h-4 mr-1.5" />
              ) : (
                <EyeOff className="w-4 h-4 mr-1.5" />
              )}
              {maskEmails ? 'Show emails' : 'Mask emails on wheel'}
            </button>
          </div>
        </div>
      )}

      {raffleMode === 'general' && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <span className="flex items-center text-sm text-gray-600 dark:text-slate-400">
            <Users className="w-4 h-4 mr-1.5 text-[var(--color-cyc-primary)]" />
            {totalUnique} {totalUnique !== 1 ? 'people' : 'person'}
            <span className="mx-1.5 text-gray-300 dark:text-slate-600">·</span>
            {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMaskEmails((masked) => !masked)}
              className="flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-[var(--color-cyc-primary)]"
            >
              {maskEmails ? (
                <Eye className="w-4 h-4 mr-1.5" />
              ) : (
                <EyeOff className="w-4 h-4 mr-1.5" />
              )}
              {maskEmails ? 'Show emails' : 'Mask emails'}
            </button>
            <button
              onClick={() => loadEntries()}
              className="btn-secondary flex items-center"
              disabled={loadingEntries}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingEntries ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {entriesError && (
        <div className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {entriesError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Panel */}
        {raffleMode === 'event' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow border border-gray-200 dark:border-slate-700 p-6 flex flex-col items-center">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink mb-1 flex items-center self-start">
              <QrCode className="w-5 h-5 mr-2" />
              Scan to Enter
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-4 self-start">
              Completing the survey via this code enters them into the wheel.
            </p>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <QRCodeCanvas value={qrUrl} size={200} level="M" marginSize={4} />
            </div>
            <button
              onClick={copyUrl}
              className="mt-3 text-xs text-gray-500 dark:text-slate-400 hover:text-[var(--color-cyc-primary)] flex items-center"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy link
                </>
              )}
            </button>
            <button
              onClick={() => setFullscreenQr(true)}
              className="mt-4 btn-primary flex items-center text-sm"
            >
              <Maximize2 className="w-4 h-4 mr-1.5" />
              Display fullscreen
            </button>
          </div>
        )}

        {/* Wheel Panel */}
        <div
          className={`${raffleMode === 'general' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white dark:bg-slate-800 rounded-2xl shadow border border-gray-200 dark:border-slate-700 p-6 flex flex-col items-center`}
        >
          <button
            onClick={() => setFullscreenWheel(true)}
            className="self-end btn-secondary flex items-center text-sm mb-2"
          >
            <Maximize2 className="w-4 h-4 mr-1.5" />
            Fullscreen
          </button>

          {fullscreenWheel ? (
            <div className="py-20 text-center text-gray-400 dark:text-slate-500">
              <p>Spinner is displayed in fullscreen.</p>
              <button onClick={() => setFullscreenWheel(false)} className="btn-secondary mt-4">
                Exit fullscreen
              </button>
            </div>
          ) : (
            <>
              {wheelStage(false)}

              {entries.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-3 text-center">
                  {uniqueRemaining.length > MAX_WHEEL_SEGMENTS
                    ? `Showing ${MAX_WHEEL_SEGMENTS} of ${uniqueRemaining.length} remaining people on the wheel. `
                    : ''}
                  Each completed survey = 1 ticket, so the winner is drawn weighted by how many
                  surveys each person did.
                </p>
              )}
              {remainingPool.length === 0 && entries.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-3">
                  All entries have been drawn.
                </p>
              )}
              {entries.length === 0 && !loadingEntries && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-3 text-center">
                  {raffleMode === 'general'
                    ? 'No raffle tickets exist yet for your team surveys.'
                    : 'No entries yet. Display the QR code so attendees can complete the survey.'}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Winner reveal */}
      {currentWinner && !spinning && (
        <div className="mt-6 bg-gradient-to-r from-[var(--color-cyc-accent)]/20 to-[var(--color-cyc-primary)]/20 border-2 border-[var(--color-cyc-accent)] rounded-2xl p-6 text-center">
          <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
            🎉 Winner 🎉
          </p>
          <p className="font-display text-3xl font-semibold tracking-tight text-ink break-all">
            {currentWinner}
          </p>
        </div>
      )}

      {/* Past winners */}
      {winners.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-[var(--color-cyc-accent)]" />
              Winners ({winners.length})
            </h2>
            <button
              onClick={resetWinners}
              className="text-sm text-red-500 hover:text-red-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Reset
            </button>
          </div>
          <ol className="space-y-2">
            {winners.map((email, idx) => (
              <li
                key={email}
                className="flex items-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3"
              >
                <span className="font-bold w-8 text-center text-[var(--color-cyc-accent)]">
                  #{idx + 1}
                </span>
                <span className="text-sm font-semibold text-ink break-all">{email}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Fullscreen spinner */}
      {fullscreenWheel && (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col items-center justify-center p-6">
          <button
            onClick={() => setFullscreenWheel(false)}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Slide to the QR code */}
          {raffleMode === 'event' && (
            <button
              onClick={() => {
                setFullscreenWheel(false);
                setFullscreenQr(true);
              }}
              className="group absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-gray-400 hover:text-[var(--color-cyc-primary)] transition-colors"
              title="Show the QR code"
            >
              <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 group-hover:bg-[var(--color-cyc-primary)]/10 shadow-md">
                <ChevronLeft className="w-8 h-8" />
              </span>
              <span className="text-xs font-semibold">QR code</span>
            </button>
          )}

          <h2 className="font-display text-3xl font-normal tracking-tighter text-ink mb-4 flex items-center">
            <Trophy className="w-7 h-7 mr-2 text-[var(--color-cyc-accent)]" />
            Raffle
          </h2>

          {wheelStage(true)}

          {currentWinner && !spinning && (
            <div className="mt-6 border-2 border-[var(--color-cyc-accent)] bg-[var(--color-cyc-accent)]/10 rounded-2xl px-8 py-4 text-center max-w-2xl">
              <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                🎉 Winner 🎉
              </p>
              <p className="font-display text-3xl font-semibold tracking-tight text-ink break-all">
                {currentWinner}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiPieces.map((piece, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: `${piece.left}%`,
                width: piece.sizePx,
                height: piece.sizePx * 0.4,
                background: piece.color,
                borderRadius: 2,
                animation: `raffle-confetti-fall ${piece.dur}s linear ${piece.delay}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* Fullscreen QR modal */}
      {fullscreenQr && (
        <div
          className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8"
          onClick={() => setFullscreenQr(false)}
        >
          <button
            onClick={() => setFullscreenQr(false)}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-700"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Slide to the spinner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenQr(false);
              setFullscreenWheel(true);
            }}
            className="group absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-gray-400 hover:text-[var(--color-cyc-primary)] transition-colors"
            title="Show the spinner"
          >
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 group-hover:bg-[var(--color-cyc-primary)]/10 shadow-md">
              <ChevronRight className="w-8 h-8" />
            </span>
            <span className="text-xs font-semibold">Spinner</span>
          </button>

          <h2 className="font-display text-4xl font-normal tracking-tighter text-ink mb-2 text-center">
            {selectedTitle}
          </h2>
          <p className="text-xl text-gray-600 mb-8 text-center">
            Scan to complete the survey & enter the raffle 🎉
          </p>
          <div className="bg-white p-6 rounded-2xl border-4 border-[var(--color-cyc-secondary)]">
            <QRCodeCanvas
              value={qrUrl}
              size={Math.min(typeof window !== 'undefined' ? window.innerHeight - 320 : 480, 560)}
              level="M"
              marginSize={4}
            />
          </div>
          <p className="text-gray-400 mt-6 text-lg break-all text-center">{qrUrl}</p>
        </div>
      )}
    </div>
  );
}
