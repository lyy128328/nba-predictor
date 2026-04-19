import {
  LeaderboardEntry,
  Pick,
  PicksByUser,
  Pool,
  PoolMember,
  Series,
  UserSession
} from "@/lib/types";

type Store = {
  pools: Record<string, Pool>;
  picks: Record<string, PicksByUser>;
  users: Record<string, UserSession>;
};

const starterSeries: Series[] = [
  {
    id: "bos-mia",
    round: "East Round 1",
    lockAt: "2026-04-21T23:00:00.000Z",
    status: "open",
    homeTeam: { seed: 1, name: "Boston Celtics", shortName: "BOS", conference: "East" },
    awayTeam: { seed: 8, name: "Miami Heat", shortName: "MIA", conference: "East" }
  },
  {
    id: "nyk-cle",
    round: "East Round 1",
    lockAt: "2026-04-21T23:30:00.000Z",
    status: "open",
    homeTeam: { seed: 2, name: "New York Knicks", shortName: "NYK", conference: "East" },
    awayTeam: { seed: 7, name: "Cleveland Cavaliers", shortName: "CLE", conference: "East" }
  },
  {
    id: "okc-lal",
    round: "West Round 1",
    lockAt: "2026-04-22T02:00:00.000Z",
    status: "open",
    homeTeam: { seed: 1, name: "Oklahoma City Thunder", shortName: "OKC", conference: "West" },
    awayTeam: { seed: 8, name: "Los Angeles Lakers", shortName: "LAL", conference: "West" }
  },
  {
    id: "den-phx",
    round: "West Round 1",
    lockAt: "2026-04-22T03:00:00.000Z",
    status: "open",
    homeTeam: { seed: 4, name: "Denver Nuggets", shortName: "DEN", conference: "West" },
    awayTeam: { seed: 5, name: "Phoenix Suns", shortName: "PHX", conference: "West" }
  }
];

function cloneSeries() {
  return starterSeries.map((series) => ({ ...series, homeTeam: { ...series.homeTeam }, awayTeam: { ...series.awayTeam } }));
}

function createBasePool(): Pool {
  return {
    id: "demo-pool",
    name: "Office Playoff Pool",
    code: "PLAYOFFS",
    members: [
      { id: "user-alex", displayName: "Alex" },
      { id: "user-sam", displayName: "Sam" }
    ],
    series: cloneSeries(),
    activities: [
      {
        id: "activity-1",
        message: "Alex created the pool.",
        createdAt: "2026-04-18T17:00:00.000Z"
      },
      {
        id: "activity-2",
        message: "Sam joined with a spicy Lakers-in-7 take.",
        createdAt: "2026-04-18T17:10:00.000Z"
      }
    ]
  };
}

declare global {
  // eslint-disable-next-line no-var
  var nbaPredictorStore: Store | undefined;
}

function createStore(): Store {
  return {
    pools: {
      "demo-pool": createBasePool()
    },
    picks: {
      "demo-pool": {
        "user-alex": [
          { seriesId: "bos-mia", winnerShortName: "BOS", games: 5 },
          { seriesId: "nyk-cle", winnerShortName: "NYK", games: 7 }
        ],
        "user-sam": [
          { seriesId: "okc-lal", winnerShortName: "LAL", games: 7 },
          { seriesId: "den-phx", winnerShortName: "DEN", games: 6 }
        ]
      }
    },
    users: {
      "user-alex": { id: "user-alex", displayName: "Alex" },
      "user-sam": { id: "user-sam", displayName: "Sam" }
    }
  };
}

function getStore(): Store {
  if (!globalThis.nbaPredictorStore) {
    globalThis.nbaPredictorStore = createStore();
  }

  return globalThis.nbaPredictorStore;
}

function toId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function makeActivity(message: string) {
  return {
    id: `activity-${Math.random().toString(36).slice(2, 10)}`,
    message,
    createdAt: new Date().toISOString()
  };
}

export function listPools() {
  return Object.values(getStore().pools);
}

export function getPool(poolId: string) {
  return getStore().pools[poolId] ?? null;
}

export function getPoolByCode(code: string) {
  return Object.values(getStore().pools).find((pool) => pool.code.toUpperCase() === code.toUpperCase()) ?? null;
}

export function upsertUser(displayName: string): UserSession {
  const trimmed = displayName.trim();
  const store = getStore();
  const existing = Object.values(store.users).find(
    (user) => user.displayName.toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const user = {
    id: `user-${Math.random().toString(36).slice(2, 10)}`,
    displayName: trimmed
  };
  store.users[user.id] = user;
  return user;
}

export function createPool(name: string, user: UserSession) {
  const store = getStore();
  const idSeed = toId(name) || `pool-${Math.random().toString(36).slice(2, 8)}`;
  const id = store.pools[idSeed] ? `${idSeed}-${Math.random().toString(36).slice(2, 6)}` : idSeed;
  const code = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const owner: PoolMember = { id: user.id, displayName: user.displayName };

  const pool: Pool = {
    id,
    name: name.trim(),
    code,
    members: [owner],
    series: cloneSeries(),
    activities: [makeActivity(`${user.displayName} created ${name.trim()}.`)]
  };

  store.pools[id] = pool;
  store.picks[id] = {};
  return pool;
}

export function joinPool(poolCode: string, user: UserSession) {
  const pool = getPoolByCode(poolCode);

  if (!pool) {
    return null;
  }

  const exists = pool.members.some((member) => member.id === user.id);
  if (!exists) {
    pool.members.push({ id: user.id, displayName: user.displayName });
    pool.activities.unshift(makeActivity(`${user.displayName} joined the pool.`));
  }

  return pool;
}

export function getUserPicks(poolId: string, userId: string): Pick[] {
  const picks = getStore().picks[poolId]?.[userId] ?? [];
  return picks.map((pick) => ({ ...pick }));
}

export function saveUserPicks(poolId: string, userId: string, picks: Pick[]) {
  const store = getStore();
  if (!store.picks[poolId]) {
    store.picks[poolId] = {};
  }

  store.picks[poolId][userId] = picks.map((pick) => ({ ...pick }));
  const pool = getPool(poolId);
  const user = store.users[userId];

  if (pool && user) {
    pool.activities.unshift(makeActivity(`${user.displayName} submitted picks for ${picks.length} series.`));
  }
}

function scorePick(pick: Pick, series: Series) {
  if (!series.result) {
    return { score: 0, correctWinner: false, exactCall: false };
  }

  const correctWinner = pick.winnerShortName === series.result.winnerShortName;
  const exactCall = correctWinner && pick.games === series.result.games;

  return {
    score: exactCall ? 3 : correctWinner ? 1 : 0,
    correctWinner,
    exactCall
  };
}

export function computeLeaderboard(poolId: string): LeaderboardEntry[] {
  const pool = getPool(poolId);
  if (!pool) {
    return [];
  }

  const poolPicks = getStore().picks[poolId] ?? {};
  return pool.members
    .map((member) => {
      const picks = poolPicks[member.id] ?? [];
      const totals = picks.reduce(
        (acc, pick) => {
          const series = pool.series.find((item) => item.id === pick.seriesId);
          if (!series) {
            return acc;
          }

          const result = scorePick(pick, series);
          acc.score += result.score;
          acc.correctWinners += result.correctWinner ? 1 : 0;
          acc.exactCalls += result.exactCall ? 1 : 0;
          return acc;
        },
        { score: 0, exactCalls: 0, correctWinners: 0 }
      );

      return {
        userId: member.id,
        displayName: member.displayName,
        ...totals
      };
    })
    .sort((a, b) => b.score - a.score || b.exactCalls - a.exactCalls || b.correctWinners - a.correctWinners);
}

export function updateSeriesResult(poolId: string, seriesId: string, winnerShortName: string, games: number) {
  const pool = getPool(poolId);
  if (!pool) {
    return null;
  }

  const series = pool.series.find((entry) => entry.id === seriesId);
  if (!series) {
    return null;
  }

  series.result = { winnerShortName, games };
  series.status = "final";
  pool.activities.unshift(
    makeActivity(`Result posted: ${winnerShortName} won ${series.homeTeam.shortName}/${series.awayTeam.shortName} in ${games}.`)
  );

  return series;
}
