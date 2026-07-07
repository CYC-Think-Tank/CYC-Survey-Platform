'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, Lock, User } from 'lucide-react';
import { AuthShell, AuthError } from '@/components/auth/AuthShell';

export default function JudgeLogin() {
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/judging/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, passcode }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      localStorage.setItem('judgeProfile', JSON.stringify(data));
      router.push('/judge');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to login');
      } else {
        setError('Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-border bg-cream-deep/50 py-3 pl-11 pr-4 text-ink placeholder:text-ink-soft/60 transition-all focus:border-teal focus:bg-card focus:outline-none focus:ring-4 focus:ring-teal-soft';

  return (
    <AuthShell
      icon={<Gavel className="h-7 w-7" />}
      title="Judge Portal"
      subtitle="Enter your credentials to access the evaluation platform"
    >
      <form className="space-y-4" onSubmit={handleLogin}>
        {error && <AuthError>{error}</AuthError>}

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Your Name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <User className="h-5 w-5 text-ink-soft/70" />
            </div>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Alice Smith"
            />
          </div>
        </div>

        <div>
          <label htmlFor="passcode" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Passcode
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-5 w-5 text-ink-soft/70" />
            </div>
            <input
              id="passcode"
              type="password"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className={fieldClass}
              placeholder="Enter passcode"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full py-3 text-base">
          {loading ? 'Authenticating…' : 'Sign in to Dashboard'}
        </button>
      </form>
    </AuthShell>
  );
}
