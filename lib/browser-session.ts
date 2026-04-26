import { UserSession } from "@/lib/types";

export const SESSION_KEY = "nba-predictor-user";
const REMEMBERED_POOLS_KEY = "nba-predictor-pools";

export type RememberedPool = {
  poolId: string;
  poolName: string;
  poolCode: string;
  lastVisitedAt: string;
};

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function getStoredUserSession(): UserSession | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function setStoredUserSession(user: UserSession) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getRememberedPools(): RememberedPool[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(REMEMBERED_POOLS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RememberedPool[];
    return parsed
      .filter((entry) => entry.poolId && entry.poolName && entry.poolCode && entry.lastVisitedAt)
      .sort((left, right) => right.lastVisitedAt.localeCompare(left.lastVisitedAt));
  } catch {
    return [];
  }
}

function setRememberedPools(pools: RememberedPool[]) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(REMEMBERED_POOLS_KEY, JSON.stringify(pools));
}

export function rememberPool(pool: { id: string; name: string; code: string }) {
  const nextEntry: RememberedPool = {
    poolId: pool.id,
    poolName: pool.name,
    poolCode: pool.code,
    lastVisitedAt: new Date().toISOString()
  };

  const next = [
    nextEntry,
    ...getRememberedPools().filter((entry) => entry.poolId !== pool.id)
  ].slice(0, 20);

  setRememberedPools(next);
}

export function removeRememberedPool(poolId: string) {
  const next = getRememberedPools().filter((entry) => entry.poolId !== poolId);
  setRememberedPools(next);
}

export function clearBrowserSession() {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(REMEMBERED_POOLS_KEY);
}
