const STORAGE_KEY = 'foundou:login:ratelimit:v2';
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60 * 60 * 1000;

/** Number of failed attempts allowed before the lockout kicks in. */
export const LOGIN_MAX_ATTEMPTS = MAX_ATTEMPTS;
/** How long the owner is locked out, in milliseconds. */
export const LOGIN_BLOCK_DURATION_MS = BLOCK_DURATION_MS;

interface AttemptRecord {
  emailKey: string;
  count: number;
  firstAt: number;
  lastAt: number;
  blockedUntil: number | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getEmailKey(email: string): string {
  try {
    const normalized = normalizeEmail(email);
    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
      hash = (hash * 131542391 + normalized.charCodeAt(i)) >>> 0;
    }
    return `em_${hash.toString(36)}_${normalized.length}`;
  } catch {
    return 'em_unknown';
  }
}

function loadRecords(): Record<string, AttemptRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, AttemptRecord>;
  } catch {
    return {};
  }
}

function saveRecords(records: Record<string, AttemptRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export interface LoginRateLimitStatus {
  blocked: boolean;
  blockedUntil: number | null;
  remaining: number;
  attemptsUsed: number;
  maxAttempts: number;
}

export function getLoginRateLimitStatus(email: string): LoginRateLimitStatus {
  const emailKey = getEmailKey(email);
  const records = loadRecords();
  const record = records[emailKey];
  const now = Date.now();

  if (!record) {
    return {
      blocked: false,
      blockedUntil: null,
      remaining: MAX_ATTEMPTS,
      attemptsUsed: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    return {
      blocked: true,
      blockedUntil: record.blockedUntil,
      remaining: 0,
      attemptsUsed: record.count,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (record.blockedUntil && record.blockedUntil <= now) {
    delete records[emailKey];
    saveRecords(records);
    return {
      blocked: false,
      blockedUntil: null,
      remaining: MAX_ATTEMPTS,
      attemptsUsed: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (now - record.firstAt >= BLOCK_DURATION_MS) {
    delete records[emailKey];
    saveRecords(records);
    return {
      blocked: false,
      blockedUntil: null,
      remaining: MAX_ATTEMPTS,
      attemptsUsed: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  const attemptsUsed = record.count;
  const remaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);

  if (remaining <= 0) {
    const blockedUntil = now + BLOCK_DURATION_MS;
    records[emailKey] = { ...record, blockedUntil, lastAt: now };
    saveRecords(records);
    return {
      blocked: true,
      blockedUntil,
      remaining: 0,
      attemptsUsed,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  return {
    blocked: false,
    blockedUntil: null,
    remaining,
    attemptsUsed,
    maxAttempts: MAX_ATTEMPTS,
  };
}

export function recordLoginFailure(email: string): LoginRateLimitStatus {
  const emailKey = getEmailKey(email);
  const records = loadRecords();
  const record = records[emailKey];
  const now = Date.now();

  if (!record) {
    const newRecord: AttemptRecord = {
      emailKey,
      count: 1,
      firstAt: now,
      lastAt: now,
      blockedUntil: null,
    };
    records[emailKey] = newRecord;
    saveRecords(records);
    return {
      blocked: false,
      blockedUntil: null,
      remaining: MAX_ATTEMPTS - 1,
      attemptsUsed: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    return {
      blocked: true,
      blockedUntil: record.blockedUntil,
      remaining: 0,
      attemptsUsed: record.count,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (record.blockedUntil && record.blockedUntil <= now) {
    const newRecord: AttemptRecord = {
      emailKey,
      count: 1,
      firstAt: now,
      lastAt: now,
      blockedUntil: null,
    };
    records[emailKey] = newRecord;
    saveRecords(records);
    return {
      blocked: false,
      blockedUntil: null,
      remaining: MAX_ATTEMPTS - 1,
      attemptsUsed: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (now - record.firstAt >= BLOCK_DURATION_MS) {
    const newRecord: AttemptRecord = {
      emailKey,
      count: 1,
      firstAt: now,
      lastAt: now,
      blockedUntil: null,
    };
    records[emailKey] = newRecord;
    saveRecords(records);
    return {
      blocked: false,
      blockedUntil: null,
      remaining: MAX_ATTEMPTS - 1,
      attemptsUsed: 1,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  const newCount = record.count + 1;
  if (newCount >= MAX_ATTEMPTS) {
    const blockedUntil = now + BLOCK_DURATION_MS;
    records[emailKey] = { ...record, count: newCount, lastAt: now, blockedUntil };
    saveRecords(records);
    return {
      blocked: true,
      blockedUntil,
      remaining: 0,
      attemptsUsed: newCount,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  records[emailKey] = { ...record, count: newCount, lastAt: now, blockedUntil: null };
  saveRecords(records);
  return {
    blocked: false,
    blockedUntil: null,
    remaining: MAX_ATTEMPTS - newCount,
    attemptsUsed: newCount,
    maxAttempts: MAX_ATTEMPTS,
  };
}

export function recordLoginSuccess(email: string): void {
  const emailKey = getEmailKey(email);
  const records = loadRecords();
  if (records[emailKey]) {
    delete records[emailKey];
    saveRecords(records);
  }
}

/**
 * Live countdown used by the lockout card: `MM:SS`, or `H:MM:SS` above one
 * hour. Rounds up so the clock never shows 00:00 while the block is active.
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0 min';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  return `${minutes} min`;
}
