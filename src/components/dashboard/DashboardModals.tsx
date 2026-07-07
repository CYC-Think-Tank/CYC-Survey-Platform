'use client';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, Share2, Trophy, X, Check, Copy, Trash2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { AccountSettingsModal } from '@/components/dashboard/AccountSettingsModal';

export function DashboardModals() {
  const {
    createModalOpen,
    closeCreateModal,
    newSurveyTitle,
    setNewSurveyTitle,
    creatingSurvey,
    handleCreateSurvey,
    shareModal,
    closeShareModal,
    shareLinks,
    shareLabel,
    setShareLabel,
    generatingLink,
    copiedLink,
    hideZeroResponses,
    setHideZeroResponses,
    handleGenerateLink,
    handleDeleteLink,
    copyToClipboard,
    baseUrl,
    leaderboardModal,
    closeLeaderboard,
    leaderboard,
    loadingLeaderboard,
  } = useDashboard();

  return (
    <>
      {/* Create Survey Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
            >
              <button
                onClick={closeCreateModal}
                className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-4 flex items-center">
                <PlusCircle className="w-5 h-5 mr-2" />
                Create New Survey
              </h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-soft mb-2">Survey Title</label>
                <input
                  type="text"
                  autoFocus
                  value={newSurveyTitle}
                  onChange={(e) => setNewSurveyTitle(e.target.value)}
                  placeholder="e.g. Employee Feedback 2024"
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-ink focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSurvey();
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-ink-soft hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCreateSurvey}
                  disabled={creatingSurvey || !newSurveyTitle.trim()}
                  className="px-4 py-2 bg-ink text-cream rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {creatingSurvey ? 'Creating...' : 'Create Survey'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Link Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={closeShareModal}
                className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-1 flex items-center">
                <Share2 className="w-5 h-5 mr-2" />
                Share Links
              </h2>
              <div className="flex justify-between items-center mb-5">
                <p className="text-sm text-ink-soft">
                  Generate unique tracked links for <strong>{shareModal.title}</strong>
                </p>
                <label className="flex items-center text-sm text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideZeroResponses}
                    onChange={(e) => setHideZeroResponses(e.target.checked)}
                    className="mr-2 rounded border-border text-ink focus:ring-ink"
                  />
                  Hide 0 responses
                </label>
              </div>

              <div className="flex space-x-2 mb-5">
                <input
                  type="text"
                  value={shareLabel}
                  onChange={(e) => setShareLabel(e.target.value)}
                  placeholder="Label (intern name)"
                  className="flex-grow p-2.5 border-2 border-border rounded-lg bg-card text-ink focus:border-ink focus:outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerateLink();
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="px-4 py-2 bg-ink text-cream rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
                >
                  {generatingLink ? '...' : '+ Generate'}
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {shareLinks.length === 0 && (
                  <p className="text-center text-ink-soft text-sm py-8">
                    No links generated yet. Click &quot;Generate&quot; to create one.
                  </p>
                )}
                {shareLinks
                  .filter(
                    (link) => !hideZeroResponses || (link.response_count && link.response_count > 0)
                  )
                  .map((link) => {
                    const isGlobal = shareModal.id === 'global';
                    const url = isGlobal
                      ? `${baseUrl}?ref=${link.code}`
                      : `${baseUrl}/survey/${shareModal.id}?ref=${link.code}`;
                    const isCopied = copiedLink === link.code;
                    return (
                      <div
                        key={link.id}
                        className="bg-cream-deep/50 border border-border rounded-lg p-3 group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-ink">
                              {link.label || (
                                <span className="text-ink-soft italic">Unlabeled</span>
                              )}
                            </span>
                            <span className="text-xs bg-card border border-border px-1.5 py-0.5 rounded font-mono text-ink-soft">
                              {link.code}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-ink-soft font-medium">
                              {link.response_count} response{link.response_count !== 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="text-ink-soft/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <code className="text-xs text-ink-soft truncate mr-2 flex-1">{url}</code>
                          <button
                            onClick={() => copyToClipboard(url, link.code)}
                            className={`flex items-center text-xs font-medium px-2 py-1 rounded transition-all ${isCopied ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-card border border-border text-ink-soft hover:text-ink hover:border-ink'}`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral Leaderboard Modal */}
      <AnimatePresence>
        {leaderboardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={closeLeaderboard}
                className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-5 flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Referrals Leaderboard
              </h2>

              <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                {loadingLeaderboard ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-center text-ink-soft text-sm py-8">
                    No referrals recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <div
                        key={entry.email}
                        className="flex items-center justify-between bg-cream-deep/50 border border-border rounded-lg p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-bold w-6 text-center text-ink-soft">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-ink truncate max-w-[200px]">
                            {entry.email}
                          </span>
                        </div>
                        <span className="text-sm font-medium border border-border px-2 py-1 rounded-full text-ink-soft">
                          {entry.referral_count}{' '}
                          {entry.referral_count === 1 ? 'referral' : 'referrals'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AccountSettingsModal />
    </>
  );
}
