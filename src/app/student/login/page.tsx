'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAllowedAdminEmailDomain, isAllowedAdminEmail } from '@/lib/adminAuth';
import { AuthShell, AuthError, AuthNotice, authInputClass } from '@/components/auth/AuthShell';

export default function AdminLogin() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const allowedDomain = getAllowedAdminEmailDomain();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!allowedDomain) {
      setError('Admin email domain is not configured.');
      return;
    }

    if (!isAllowedAdminEmail(email)) {
      setError(`Use an email from ${allowedDomain}.`);
      return;
    }

    setLoading(true);
    const credentials = { email: email.trim(), password };
    if (mode === 'signup') {
      const response = await fetch('/admin-api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Failed to create admin account.');
        setLoading(false);
        return;
      }

      if (!data.session) {
        setMessage('Check your email to confirm your account, then sign in.');
        setLoading(false);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
    } else {
      const result = await supabase.auth.signInWithPassword(credentials);

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
    }

    router.push('/student/teams');
    router.refresh();
  };

  return (
    <AuthShell
      icon={<GraduationCap className="h-7 w-7" />}
      title="Student Access"
      subtitle={
        mode === 'login' ? 'Sign in to manage your team surveys' : 'Create your student account'
      }
      footer={
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setMessage('');
          }}
          className="font-semibold text-teal transition-colors hover:text-teal-deep"
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthError>{error}</AuthError>}
        {message && <AuthNotice>{message}</AuthNotice>}

        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder={allowedDomain ? `name@${allowedDomain}` : 'name@example.com'}
          />
        </div>
        <div>
          <label
            htmlFor="admin-password"
            className="mb-1.5 block text-sm font-medium text-ink-soft"
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            placeholder="Enter password"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full py-3 text-base">
          {loading ? 'Verifying…' : mode === 'login' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
    </AuthShell>
  );
}
