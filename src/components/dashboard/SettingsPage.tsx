'use client';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { getAllowedAdminEmailDomain } from '@/lib/adminAuth';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/lib/supabase';

export function SettingsPage() {
  const { role, adminEmail, userId, handleLogout } = useDashboard();
  const allowedDomain = getAllowedAdminEmailDomain();

  const [fullName, setFullName] = useState('');
  const [savedFullName, setSavedFullName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      setFullName(data?.full_name || '');
      setSavedFullName(data?.full_name || '');
      setLoadingProfile(false);
    })();
  }, [userId]);

  const saveDisplayName = async () => {
    if (!userId) return;
    setSavingName(true);
    setNameMessage('');
    setNameError('');
    const trimmed = fullName.trim();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed || null })
      .eq('id', userId);
    if (error) {
      setNameError('Failed to update display name.');
    } else {
      setSavedFullName(trimmed);
      setNameMessage('Display name updated.');
    }
    setSavingName(false);
  };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 6;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSavePassword =
    newPassword.length >= 6 && newPassword === confirmPassword && !savingPassword;

  const savePassword = async () => {
    if (!canSavePassword) return;
    setSavingPassword(true);
    setPasswordMessage('');
    setPasswordError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message || 'Failed to update password.');
    } else {
      setPasswordMessage('Password updated.');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  };

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage your account.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-4 font-display text-lg font-medium tracking-tight text-ink">Account</h2>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-sm text-ink-soft">Email</p>
            <p className="font-medium text-ink">{adminEmail || 'Loading…'}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink">
            <ShieldCheck className="h-3.5 w-3.5" />
            {role === 'admin' ? 'Admin' : 'Team member'}
          </span>
        </div>

        <div className="border-b border-border py-4">
          <label htmlFor="display-name" className="mb-1 block text-sm text-ink-soft">
            Display name
          </label>
          <div className="flex gap-2">
            <input
              id="display-name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameMessage('');
              }}
              disabled={loadingProfile}
              placeholder="Your name"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={saveDisplayName}
              disabled={loadingProfile || savingName || fullName.trim() === savedFullName}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {savingName ? 'Saving...' : 'Save'}
            </button>
          </div>
          {nameMessage && (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{nameMessage}</p>
          )}
          {nameError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{nameError}</p>}
        </div>

        <div className="pt-4">
          <p className="text-sm text-ink-soft">Access</p>
          <p className="text-sm text-ink">
            Restricted to <strong>@{allowedDomain || 'unconfigured'}</strong> accounts.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-1 font-display text-lg font-medium tracking-tight text-ink">
          Change Password
        </h2>
        <p className="mb-4 text-sm text-ink-soft">Choose a new password for your account.</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm text-ink-soft">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordMessage('');
              }}
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
            {passwordTooShort && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Password must be at least 6 characters.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm text-ink-soft">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordMessage('');
              }}
              placeholder="Repeat new password"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
            {passwordsMismatch && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
            )}
          </div>
          <button
            type="button"
            onClick={savePassword}
            disabled={!canSavePassword}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {savingPassword ? 'Saving...' : 'Update Password'}
          </button>
          {passwordMessage && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{passwordMessage}</p>
          )}
          {passwordError && (
            <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-1 font-display text-lg font-medium tracking-tight text-ink">Sign Out</h2>
        <p className="mb-4 text-sm text-ink-soft">
          You&apos;ll need to sign back in to manage surveys.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
