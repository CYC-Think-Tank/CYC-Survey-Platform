'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAllowedAdminEmailDomain, isAllowedAdminEmail } from '@/lib/adminAuth';

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

    if (!isAllowedAdminEmail(email)) {
      setError(`Use an email from ${allowedDomain}.`);
      return;
    }

    setLoading(true);
    const credentials = { email: email.trim(), password };
    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    if (mode === 'signup' && !result.data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-cyc-secondary)]">Admin Access</h1>
          <p className="text-gray-500 mt-2">
            {mode === 'login' ? 'Sign in to manage team surveys' : 'Create your admin account'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-medium">{error}</div>
        )}
        {message && (
          <div className="bg-teal-50 text-teal-700 p-3 rounded mb-4 text-sm font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-teal-50 focus:outline-none transition-all"
              placeholder={allowedDomain ? `name@${allowedDomain}` : 'name@example.com'}
            />
          </div>
          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-teal-50 focus:outline-none transition-all"
              placeholder="Enter password"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-6 text-lg">
            {loading ? 'Verifying...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setMessage('');
          }}
          className="mt-5 w-full text-sm font-semibold text-[var(--color-cyc-primary)] hover:text-teal-700"
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
