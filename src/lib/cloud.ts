/* Account + cloud layer.
 *
 * editEZ has no server of its own, so "cloud" is implemented as a pluggable
 * adapter:
 *   1. LocalCloudAdapter (default) — keeps a synced copy of every document in
 *      the same IndexedDB database, under a per-account key. Signing in on the
 *      same browser restores the workspace, and every save is mirrored.
 *   2. HttpCloudAdapter — if the user (or a self-hosted operator) points the
 *      app at a REST endpoint in Settings → Account, the same calls go over
 *      fetch() with a bearer token, which is what a Supabase/Firebase/pocketbase
 *      function would expose. Nothing else in the app needs to change.
 *
 * Passwords are never stored in clear text: PBKDF2-SHA256 (Web Crypto) with a
 * random salt, falling back to a deliberately weak digest only when Web Crypto
 * is unavailable (older embeds). This is a local-first account, not a hardened
 * identity provider — the UI says so.
 */
import * as db from './db';
import type { Project } from '../types';

export interface Account {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

interface AccountRecord extends Account {
  salt: string;
  hash: string;
}

export interface Session extends Account {
  since: number;
  token: string;
  /** Mirror of `id`, so callers can read `session.accountId` explicitly. */
  accountId: string;
}

export interface CloudDoc {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  size: number;
  thumb?: string;
  syncedAt: number;
  doc: Project;
}

export interface CloudStats {
  projects: number;
  bytes: number;
  lastSync: number | null;
  endpoint: string | null;
}

const ACCOUNTS_KEY = 'accounts';
const SESSION_KEY = 'session';
const ENDPOINT_KEY = 'cloudEndpoint';
const cloudKey = (accountId: string) => `cloud:${accountId}`;

export class AuthError extends Error {}

const uid = () =>
  `acc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  const c = globalThis.crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.random() * 256) | 0;
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(password: string, salt: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const enc = new TextEncoder();
      const key = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 120_000, hash: 'SHA-256' },
        key,
        256
      );
      return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      /* fall through */
    }
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = `${salt}:${password}`;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + s.charCodeAt(i) * (i + 7), 2246822507) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`.padStart(16, '0');
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export interface PasswordScore {
  score: 0 | 1 | 2 | 3;
  ok: boolean;
}

export function scorePassword(password: string): PasswordScore {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const clamped = Math.min(3, score) as 0 | 1 | 2 | 3;
  return { score: password.length >= 8 ? clamped : (Math.min(1, clamped) as 0 | 1), ok: password.length >= 8 };
}

async function readAccounts(): Promise<AccountRecord[]> {
  return (await db.kvGet<AccountRecord[]>(ACCOUNTS_KEY)) ?? [];
}

async function writeAccounts(list: AccountRecord[]): Promise<void> {
  await db.kvSet(ACCOUNTS_KEY, list);
}

const publicAccount = (r: AccountRecord): Account => ({
  id: r.id,
  email: r.email,
  name: r.name,
  createdAt: r.createdAt,
});

/* --------------------------------- session -------------------------------- */

export async function loadSession(): Promise<Session | null> {
  const raw = await db.kvGet<Session>(SESSION_KEY);
  if (!raw?.accountId) return null;
  const accounts = await readAccounts();
  const found = accounts.find((a) => a.id === raw.accountId);
  if (!found) return null;
  return { ...publicAccount(found), since: raw.since ?? Date.now(), token: raw.token ?? '', accountId: found.id };
}

export async function saveSession(session: Session | null): Promise<void> {
  await db.kvSet(SESSION_KEY, session);
}

/* ---------------------------------- auth --------------------------------- */

export async function signUp(input: { name: string; email: string; password: string }): Promise<Session> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!name) throw new AuthError('name-required');
  if (!validateEmail(email)) throw new AuthError('email-invalid');
  if (input.password.length < 8) throw new AuthError('password-short');
  const accounts = await readAccounts();
  if (accounts.some((a) => a.email === email)) throw new AuthError('email-taken');
  const salt = randomSalt();
  const record: AccountRecord = {
    id: uid(),
    email,
    name,
    createdAt: Date.now(),
    salt,
    hash: await digest(input.password, salt),
  };
  await writeAccounts([...accounts, record]);
  const session: Session = {
    ...publicAccount(record),
    since: Date.now(),
    token: `tok_${record.id}_${Date.now().toString(36)}`,
    accountId: record.id,
  };
  await saveSession(session);
  return session;
}

export async function signIn(input: { email: string; password: string }): Promise<Session> {
  const email = normalizeEmail(input.email);
  const accounts = await readAccounts();
  const found = accounts.find((a) => a.email === email);
  if (!found) throw new AuthError('no-account');
  const hash = await digest(input.password, found.salt);
  if (hash !== found.hash) throw new AuthError('bad-password');
  const session: Session = {
    ...publicAccount(found),
    since: Date.now(),
    token: `tok_${found.id}_${Date.now().toString(36)}`,
    accountId: found.id,
  };
  await saveSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await saveSession(null);
}

export async function updateProfile(patch: { name?: string }): Promise<Session | null> {
  const session = await loadSession();
  if (!session) return null;
  const accounts = await readAccounts();
  const next = accounts.map((a) =>
    a.id === session.accountId ? { ...a, name: patch.name?.trim() || a.name } : a
  );
  await writeAccounts(next);
  const updated: Session = { ...session, name: patch.name?.trim() || session.name };
  await saveSession(updated);
  return updated;
}

export async function deleteAccount(accountId: string, password: string): Promise<void> {
  const accounts = await readAccounts();
  const found = accounts.find((a) => a.id === accountId);
  if (!found) throw new AuthError('no-account');
  const hash = await digest(password, found.salt);
  if (hash !== found.hash) throw new AuthError('bad-password');
  await writeAccounts(accounts.filter((a) => a.id !== accountId));
  await db.kvSet(cloudKey(accountId), []);
  await saveSession(null);
}

/* --------------------------------- cloud --------------------------------- */

export async function getEndpoint(): Promise<string | null> {
  const raw = await db.kvGet<string>(ENDPOINT_KEY);
  return raw?.trim() ? raw.trim().replace(/\/+$/, '') : null;
}

export async function setEndpoint(url: string | null): Promise<void> {
  await db.kvSet(ENDPOINT_KEY, url?.trim() ? url.trim().replace(/\/+$/, '') : null);
}

async function http<T>(path: string, init: RequestInit, endpoint: string): Promise<T> {
  const res = await fetch(`${endpoint}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`cloud ${res.status}`);
  return (await res.json()) as T;
}

const docSize = (doc: Project) => {
  try {
    return new Blob([JSON.stringify(doc)]).size;
  } catch {
    return JSON.stringify(doc).length;
  }
};

export async function cloudList(session: Session): Promise<CloudDoc[]> {
  const endpoint = await getEndpoint();
  if (endpoint) {
    return http<CloudDoc[]>('/projects', { method: 'GET', headers: { authorization: `Bearer ${session.token}` } }, endpoint);
  }
  return (await db.kvGet<CloudDoc[]>(cloudKey(session.accountId))) ?? [];
}

export async function cloudPush(session: Session, docs: CloudDoc[]): Promise<void> {
  if (!docs.length) return;
  const endpoint = await getEndpoint();
  if (endpoint) {
    await http<{ ok: true }>(
      '/projects',
      { method: 'PUT', headers: { authorization: `Bearer ${session.token}` }, body: JSON.stringify({ docs }) },
      endpoint
    );
    return;
  }
  const current = (await db.kvGet<CloudDoc[]>(cloudKey(session.accountId))) ?? [];
  const map = new Map(current.map((d) => [d.id, d]));
  for (const doc of docs) {
    const existing = map.get(doc.id);
    if (!existing || existing.updatedAt <= doc.updatedAt) map.set(doc.id, doc);
  }
  await db.kvSet(cloudKey(session.accountId), [...map.values()]);
}

export async function cloudDelete(session: Session, projectId: string): Promise<void> {
  const endpoint = await getEndpoint();
  if (endpoint) {
    await http<{ ok: true }>(
      `/projects/${encodeURIComponent(projectId)}`,
      { method: 'DELETE', headers: { authorization: `Bearer ${session.token}` } },
      endpoint
    );
    return;
  }
  const current = (await db.kvGet<CloudDoc[]>(cloudKey(session.accountId))) ?? [];
  await db.kvSet(cloudKey(session.accountId), current.filter((d) => d.id !== projectId));
}

export async function cloudStats(session: Session | null): Promise<CloudStats> {
  const endpoint = await getEndpoint();
  if (!session) return { projects: 0, bytes: 0, lastSync: null, endpoint };
  const docs = await cloudList(session).catch(() => []);
  return {
    projects: docs.length,
    bytes: docs.reduce((n, d) => n + (d.size || docSize(d.doc)), 0),
    lastSync: docs.reduce<number | null>((latest, d) => (latest === null || d.syncedAt > latest ? d.syncedAt : latest), null),
    endpoint,
  };
}

/** Wrap a project document in what the adapter stores. */
export function toCloudDoc(project: Project, thumb?: string): CloudDoc {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
    size: docSize(project),
    thumb,
    syncedAt: Date.now(),
    doc: project,
  };
}

/** Pull remote documents into the local IndexedDB project store. */
export async function pullIntoLocal(session: Session): Promise<{ pulled: number; conflicts: number }> {
  const remote = await cloudList(session).catch(() => [] as CloudDoc[]);
  let pulled = 0;
  let conflicts = 0;
  for (const doc of remote) {
    const local = await db.getProject(doc.id);
    if (!local) {
      await db.saveProject(doc.doc, { thumb: doc.thumb }).catch(() => undefined);
      pulled++;
    } else if (local.updatedAt < doc.updatedAt) {
      await db.saveProject(doc.doc, { thumb: doc.thumb ?? local.thumb }).catch(() => undefined);
      pulled++;
      conflicts++;
    }
  }
  return { pulled, conflicts };
}

/** Last-sync bookkeeping so the UI can show a real timestamp. */
export async function readLastSync(accountId: string): Promise<number | null> {
  return (await db.kvGet<number>(`sync:${accountId}`)) ?? null;
}

export async function writeLastSync(accountId: string, at: number): Promise<void> {
  await db.kvSet(`sync:${accountId}`, at);
}
