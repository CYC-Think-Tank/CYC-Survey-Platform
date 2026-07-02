import { supabase } from './supabase';

export interface AdminTeam {
  id: string;
  name: string | null;
  role: 'team_leader' | 'team_member';
}

export interface AdminMe {
  user: { id: string; email: string };
  is_admin: boolean;
  teams: AdminTeam[];
  pending_requests: unknown[];
}

export class AdminFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminFetchError';
    this.status = status;
  }
}

export function getAllowedAdminEmailDomain() {
  return (process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL_DOMAIN || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

export function isAllowedAdminEmail(email?: string | null) {
  const allowedDomain = getAllowedAdminEmailDomain();
  if (!allowedDomain || !email) return false;
  const domain = email.trim().toLowerCase().split('@')[1];
  return domain === allowedDomain;
}

export async function getAdminAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getAdminAccessToken();
  if (!token) {
    throw new AdminFetchError('Missing Supabase access token', 401);
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export function isAdminFetchError(error: unknown): error is AdminFetchError {
  return error instanceof AdminFetchError;
}

export async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdminFetchError(data?.detail || data?.error || fallbackMessage, response.status);
  }
  return data as T;
}

export function ensureArray<T>(data: unknown, fallbackMessage: string): T[] {
  if (!Array.isArray(data)) {
    throw new Error(fallbackMessage);
  }
  return data;
}

export async function fetchAdminMe() {
  const response = await adminFetch('/api/admin/me');
  return parseJsonResponse<AdminMe>(response, 'Failed to load admin profile');
}
