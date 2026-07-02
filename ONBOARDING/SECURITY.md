# Security Policy and Engineering Guide

The CYC Survey Platform processes account information, survey responses, referral data, and email addresses. Security and privacy requirements apply to application code, database policies, operational scripts, logs, backups, and developer environments.

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability or expose affected user data in chat, screenshots, logs, or pull requests.

TODO: Add the private security contact, expected acknowledgement time, escalation path, and disclosure policy.

Until that contact is documented, notify the repository owners privately with:

- A concise description and potential impact
- Reproduction steps using synthetic data
- Affected routes, roles, tables, or commits
- Whether exploitation appears active
- Any temporary containment already performed

Do not access more data than necessary to validate the issue.

## Trust Boundaries

- Public survey routes intentionally support unauthenticated respondents but must expose only published survey-taking data.
- `/student` is for authenticated team-scoped users. Database RLS and API authorization must enforce team membership and role.
- `/admin` is for global administrators whose profile has `is_admin = true`.
- Team leadership and global administration are independent permissions.
- The browser uses the Supabase anon key and user JWT. It must never receive a service-role key.
- Server-side routes may use the service role only after authenticating the caller and explicitly authorizing the requested operation.
- RLS remains the primary defense for user-scoped database access; UI hiding is not authorization.

See `ONBOARDING/ARCHITECTURE.md` for the complete authorization and database model.

## Credentials and Environment Variables

- Keep `.env.local` and local-only variants untracked.
- Never commit Supabase service-role keys, database passwords, Gmail app passwords, Gemini keys, cron secrets, access tokens, or production exports.
- `NEXT_PUBLIC_*` values are embedded in browser bundles. Only publish values explicitly designed for public use.
- `SUPABASE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only privileged secrets.
- Keep client and server allowed-domain variables aligned, but enforce the restriction on the server and in the Supabase Auth hook.
- Use distinct credentials for local, staging, and production environments.
- Rotate a secret immediately if it appears in Git history, logs, screenshots, or an untrusted system. Deleting the visible string is not sufficient.

Before running a command that reads `.env.local`, verify which project its URL identifies. Supabase CLI linking is independent of `.env.local`; verify both separately.

## Authentication and Authorization

For every protected operation:

1. Validate the Supabase JWT with Supabase Auth.
2. Enforce the allowed account domain server-side where applicable.
3. Load current profile and membership state; do not trust role or team IDs supplied by the browser.
4. Authorize the exact resource and action.
5. Query through the user's JWT so RLS applies, or manually enforce equivalent checks before a service-role operation.

Sensitive authorization changes require negative tests. At minimum, test unauthenticated users, wrong-team users, ordinary members, team leaders, and global administrators as relevant.

`profiles.is_admin` must be writable only through a controlled database or server-side administrative process. The architecture guide records a grant interaction that needs a real-JWT regression test and may require a corrective migration; do not assume column-level revocation is sufficient without verifying effective PostgreSQL privileges.

## Row-Level Security

New user-facing tables must have RLS enabled before they are exposed through the Supabase Data API. Policies should:

- Use `auth.uid()` or stable security-definer helpers with tightly scoped grants
- Express team ownership explicitly
- Include both `USING` and `WITH CHECK` where updates could change ownership
- Avoid recursive policy queries
- Deny access by default
- Be tested with anon, authenticated, and service-role contexts

Never disable RLS as a workaround for an application error. A table backup created in the public schema can also become API-accessible; use a private schema or enable RLS and revoke access.

## Service-Role Usage

The service role bypasses RLS. Its use is appropriate only in trusted server-side or controlled operational contexts.

Before using it, confirm:

- The code cannot be bundled for the browser
- The caller is authenticated and authorized when acting on a user's request
- Inputs are constrained to the authorized resource
- Logs do not include the key, JWT, or sensitive row data
- Tests prove cross-team access is rejected

Prefer a user-scoped Supabase client for ordinary team reads and writes.

## Privacy and Data Handling

- Treat survey answers, email addresses, postal/geographic data, referral records, and analytics outputs as sensitive.
- Use synthetic or de-identified data in tests and screenshots.
- Do not copy production data into local development without explicit approval and an approved handling process.
- Store backups in approved encrypted storage, not the repository.
- Minimize logs and error payloads; do not log tokens, passwords, full answers, or bulk email lists.
- Preserve public survey functionality without exposing unpublished surveys or administrative metadata.

TODO: Document retention periods, deletion obligations, data classification, access review cadence, and incident notification requirements.

## Email and External Services

Local code can reach Gmail and Google Gemini when credentials are present. Tests and routine development must mock these services. Before any email action, verify the environment, recipient count, template, and whether the route can contact production records.

Bulk-email UI actions should use explicit confirmation and display scope before sending. Cron endpoints must require `CRON_SECRET` in production.

## Dependency and Code Scanning

- CodeQL scans JavaScript and Python.
- GitHub's security audit workflow runs `npm audit --audit-level=high`.
- Dependabot is configured under `.github/dependabot.yml`.
- Ruff, ESLint, TypeScript, unit tests, and code review provide additional controls.

Review dependency upgrades for transitive risk and runtime compatibility; a passing audit alone does not establish safety.

## Security Checklist for Pull Requests

- [ ] No credentials, tokens, production data, or sensitive logs are added
- [ ] Client/server boundaries do not expose privileged secrets
- [ ] Authentication and authorization are both enforced server-side
- [ ] RLS, grants, ownership transitions, and cross-team denial are tested
- [ ] Public routes expose only intended fields and records
- [ ] External email/AI calls are mocked in tests and constrained in production
- [ ] Migrations preserve existing rows and do not silently broaden access
- [ ] Operational and rollback steps are documented

## Incident Response

If exposure or unauthorized access is suspected:

1. Stop the affected operation without destroying evidence.
2. Notify the private security contact and production owner.
3. Revoke or rotate affected credentials.
4. Preserve relevant logs and record times in UTC.
5. Contain the affected route, deployment, or database permission.
6. Determine affected users and data with the minimum necessary access.
7. Follow organizational notification and recovery procedures.
8. Add regression tests and document the root cause after containment.

Do not run destructive cleanup until backups and evidence requirements have been considered.
