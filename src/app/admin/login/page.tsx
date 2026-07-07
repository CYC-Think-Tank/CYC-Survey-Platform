'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchAdminMe, getAllowedAdminEmailDomain, isAllowedAdminEmail } from '@/lib/adminAuth';
import { AuthShell, AuthError, authInputClass } from '@/components/auth/AuthShell';

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
    <AuthShell
      icon={<ShieldCheck className="h-7 w-7" />}
      title="Admin Access"
      subtitle="Sign in to manage all surveys"
      footer={
        <a
          href="/student/login"
          className="font-semibold text-teal transition-colors hover:text-teal-deep"
        >
          Not an admin? Student login
        </a>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthError>{error}</AuthError>}

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
          {loading ? 'Verifying…' : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  );
}
