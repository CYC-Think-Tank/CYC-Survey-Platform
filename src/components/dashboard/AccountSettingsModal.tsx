'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, UserCog, X } from 'lucide-react';
import { getAllowedAdminEmailDomain } from '@/lib/adminAuth';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/lib/supabase';

export function AccountSettingsModal() {
  const { role, adminEmail, userId, accountSettingsOpen, closeAccountSettings } = useDashboard();
  const allowedDomain = getAllowedAdminEmailDomain();

  const [fullName, setFullName] = useState('');
  const [savedFullName, setSavedFullName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!accountSettingsOpen || !userId) return;
    setLoadingProfile(true);
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
  }, [accountSettingsOpen, userId]);

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
    <AnimatePresence>
      {accountSettingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
          >
            <button
              onClick={closeAccountSettings}
              className="absolute right-4 top-4 text-ink-soft transition-colors hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-5 flex items-center font-display text-xl font-medium tracking-tight text-ink">
              <UserCog className="mr-2 h-5 w-5" />
              Account Settings
            </h2>

            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-sm text-ink-soft">Email</p>
                <p className="font-medium text-ink">{adminEmail || 'Loading…'}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink">
                <ShieldCheck className="h-3.5 w-3.5" />
                {role === 'admin' ? 'Admin' : 'Team member'}
              </span>
            </div>

            <div className="mb-5 border-b border-border pb-5">
              <label htmlFor="account-display-name" className="mb-1 block text-sm text-ink-soft">
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  id="account-display-name"
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
              {nameError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{nameError}</p>
              )}
              <p className="mt-3 text-xs text-ink-soft">
                Restricted to <strong>@{allowedDomain || 'unconfigured'}</strong> accounts.
              </p>
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-ink">Change Password</h3>
              <p className="mb-3 text-sm text-ink-soft">Choose a new password for your account.</p>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="account-new-password"
                    className="mb-1 block text-sm text-ink-soft"
                  >
                    New password
                  </label>
                  <input
                    id="account-new-password"
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
                  <label
                    htmlFor="account-confirm-password"
                    className="mb-1 block text-sm text-ink-soft"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="account-confirm-password"
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
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Passwords do not match.
                    </p>
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
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {passwordMessage}
                  </p>
                )}
                {passwordError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
