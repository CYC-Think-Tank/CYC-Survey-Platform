'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchAdminMe, getAllowedAdminEmailDomain, isAllowedAdminEmail } from '@/lib/adminAuth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const allowedDomain = getAllowedAdminEmailDomain();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allowedDomain) {
      setError('Admin email domain is not configured.');
      return;
    }
    if (!isAllowedAdminEmail(email)) {
      setError(`Use an email from ${allowedDomain}.`);
      return;
    }

    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    // Only global admins may enter /admin; students must use the student login.
    try {
      const me = await fetchAdminMe();
      if (!me.is_admin) {
        await supabase.auth.signOut();
        setError('This account is not an admin. Use the student login instead.');
        setLoading(false);
        return;
      }
    } catch {
      await supabase.auth.signOut();
      setError('Could not verify admin access. Please try again.');
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
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Admin Access
          </h1>
          <p className="text-gray-500 mt-2">Sign in to manage all surveys</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-medium">{error}</div>
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
              className="w-full p-3 border-2 border-gray-200 rounded-xl bg-card text-ink focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-teal-50 focus:outline-none transition-all"
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
              className="w-full p-3 border-2 border-gray-200 rounded-xl bg-card text-ink focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-teal-50 focus:outline-none transition-all"
              placeholder="Enter password"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-6 text-lg">
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <a
          href="/student/login"
          className="mt-5 block text-center text-sm font-semibold text-[var(--color-cyc-primary)] hover:text-teal-700"
        >
          Not an admin? Student login
        </a>
      </div>
    </div>
  );
}
