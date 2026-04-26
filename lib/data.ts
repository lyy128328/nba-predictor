import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  AdminPoolMember,
  AdminPoolSummary,
  ActivityItem,
  ActivityPage,
  LeaderboardEntry,
  Pick,
  PlayoffTemplateSummary,
  Pool,
  PoolCreateSource,
  PoolMemberPicks,
  PoolMember,
  Series,
  UserSession
} from "@/lib/types";

type UserRow = {
  id: string;
  display_name: string;
};

type PoolRow = {
  id: string;
  name: string;
  code: string;
  created_at: string;
};

type PlayoffTemplateRow = {
  id: string;
  name: string;
  source_pool_id: string | null;
  created_at: string;
};

type SeriesRow = {
  id: string;
  pool_id: string;
  round: string;
  lock_at: string;
  status: "open" | "locked" | "final";
  home_team_name: string;
  home_team_short_name: string;
  home_team_seed: number;
  home_team_conference: "East" | "West";
  away_team_name: string;
  away_team_short_name: string;
  away_team_seed: number;
  away_team_conference: "East" | "West";
  winner_short_name: string | null;
  result_games: number | null;
};

type TemplateSeriesRow = {
  id: string;
  template_id: string;
  round: string;
  lock_at: string;
  status: "open" | "locked" | "final";
  home_team_name: string;
  home_team_short_name: string;
  home_team_seed: number;
  home_team_conference: "East" | "West";
  away_team_name: string;
  away_team_short_name: string;
  away_team_seed: number;
  away_team_conference: "East" | "West";
  winner_short_name: string | null;
  result_games: number | null;
  sort_order: number;
};

type ActivityRow = {
  id: string;
  message: string;
  created_at: string;
};

type StarterSeriesTemplate = Omit<SeriesRow, "id" | "pool_id" | "lock_at"> & {
  lockOffsetHours: number;
};

const starterSeriesTemplates: StarterSeriesTemplate[] = [
  {
    round: "East Round 1",
    lockOffsetHours: 24,
    status: "open",
    home_team_name: "Boston Celtics",
    home_team_short_name: "BOS",
    home_team_seed: 1,
    home_team_conference: "East",
    away_team_name: "Miami Heat",
    away_team_short_name: "MIA",
    away_team_seed: 8,
    away_team_conference: "East",
    winner_short_name: null,
    result_games: null
  },
  {
    round: "East Round 1",
    lockOffsetHours: 26,
    status: "open",
    home_team_name: "New York Knicks",
    home_team_short_name: "NYK",
    home_team_seed: 2,
    home_team_conference: "East",
    away_team_name: "Cleveland Cavaliers",
    away_team_short_name: "CLE",
    away_team_seed: 7,
    away_team_conference: "East",
    winner_short_name: null,
    result_games: null
  },
  {
    round: "West Round 1",
    lockOffsetHours: 29,
    status: "open",
    home_team_name: "Oklahoma City Thunder",
    home_team_short_name: "OKC",
    home_team_seed: 1,
    home_team_conference: "West",
    away_team_name: "Los Angeles Lakers",
    away_team_short_name: "LAL",
    away_team_seed: 8,
    away_team_conference: "West",
    winner_short_name: null,
    result_games: null
  },
  {
    round: "West Round 1",
    lockOffsetHours: 31,
    status: "open",
    home_team_name: "Denver Nuggets",
    home_team_short_name: "DEN",
    home_team_seed: 4,
    home_team_conference: "West",
    away_team_name: "Phoenix Suns",
    away_team_short_name: "PHX",
    away_team_seed: 5,
    away_team_conference: "West",
    winner_short_name: null,
    result_games: null
  }
];

function randomCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function mapUser(row: UserRow): UserSession {
  return {
    id: row.id,
    displayName: row.display_name
  };
}

function mapSeries(row: SeriesRow): Series {
  return {
    id: row.id,
    round: row.round,
    lockAt: row.lock_at,
    status: row.status,
    homeTeam: {
      seed: row.home_team_seed,
      name: row.home_team_name,
      shortName: row.home_team_short_name,
      conference: row.home_team_conference
    },
    awayTeam: {
      seed: row.away_team_seed,
      name: row.away_team_name,
      shortName: row.away_team_short_name,
      conference: row.away_team_conference
    },
    result:
      row.winner_short_name && row.result_games
        ? {
            winnerShortName: row.winner_short_name,
            games: row.result_games
          }
        : undefined
  };
}

function mapActivity(row: ActivityRow): ActivityItem {
  return {
    id: row.id,
    message: row.message,
    createdAt: row.created_at
  };
}

function formatSeriesMatchup(series: Series) {
  return `${series.awayTeam.shortName} at ${series.homeTeam.shortName}`;
}

function pickOne<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildPickActivityMessage(displayName: string, series: Series, pick: Pick) {
  const matchup = formatSeriesMatchup(series);
  const sweep = pick.games === 4;
  const templates = sweep
    ? [
        `${displayName} called ${pick.winnerShortName} in ${pick.games} for ${matchup}. Bold for no reason. 🤡`,
        `${displayName} saw ${matchup} and went ${pick.winnerShortName} in ${pick.games}. Absolute sweep brain. 🤡`,
        `${displayName} just posted ${pick.winnerShortName} in ${pick.games} for ${matchup}. No fear, no shame. 🤡`
      ]
    : [
        `${displayName} picked ${pick.winnerShortName} in ${pick.games} for ${matchup}.`,
        `${displayName} is riding with ${pick.winnerShortName} in ${pick.games} for ${matchup}.`,
        `${displayName} locked ${pick.winnerShortName} in ${pick.games} on ${matchup}.`
      ];

  return pickOne(templates);
}

function buildScoreActivityMessage(displayName: string, pick: Pick, points: number) {
  if (points === 2) {
    return pickOne([
      `${displayName} hit ${pick.winnerShortName} in ${pick.games}! +2`,
      `${displayName} called ${pick.winnerShortName} in ${pick.games} exactly. +2`,
      `${displayName} nailed ${pick.winnerShortName} in ${pick.games}. Clean +2`
    ]);
  }

  if (points === 1) {
    return pickOne([
      `${displayName} got ${pick.winnerShortName} right. +1`,
      `${displayName} survived with ${pick.winnerShortName}. +1`,
      `${displayName} had the winner, just not the games. +1`
    ]);
  }

  return pickOne([
    `${displayName} talked big and missed ${pick.winnerShortName} in ${pick.games}.`,
    `${displayName} sent ${pick.winnerShortName} in ${pick.games} and got cooked.`,
    `${displayName} was loud about ${pick.winnerShortName} in ${pick.games}. That aged badly.`
  ]);
}

function buildLeaderActivityMessage(displayName: string) {
  return pickOne([
    `Current leader: ${displayName}`,
    `${displayName} is on top of the pool right now.`,
    `${displayName} has the lead. Everyone else is chasing.`
  ]);
}

function assertDisplayName(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("displayName is required.");
  }
  return trimmed;
}

export async function upsertUser(displayName: string) {
  const supabase = getSupabaseAdminClient();
  const normalizedName = assertDisplayName(displayName);

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id, display_name")
    .ilike("display_name", normalizedName)
    .limit(1)
    .maybeSingle<UserRow>();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return mapUser(existing);
  }

  const { data, error } = await supabase
    .from("users")
    .insert([{ display_name: normalizedName }])
    .select("id, display_name")
    .single<UserRow>();

  if (error) {
    throw error;
  }

  return mapUser(data);
}

async function createUniquePoolCode() {
  const supabase = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const { data, error } = await supabase
      .from("pools")
      .select("id")
      .eq("code", code)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return code;
    }
  }

  throw new Error("Unable to allocate a unique pool code.");
}

async function recordActivity(poolId: string, message: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("activities").insert([{ pool_id: poolId, message }]);

  if (error) {
    throw error;
  }
}

async function ensurePoolMembership(poolId: string, user: UserSession) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pool_members")
    .select("user_id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabase
      .from("pool_members")
      .insert([{ pool_id: poolId, user_id: user.id }]);

    if (insertError) {
      throw insertError;
    }

    return true;
  }

  return false;
}

async function recordActivities(poolId: string, messages: string[]) {
  const filtered = messages.filter(Boolean);
  if (filtered.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("activities")
    .insert(filtered.map((message) => ({ pool_id: poolId, message })));

  if (error) {
    throw error;
  }
}

async function seedStarterSeries(poolId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("series")
    .select("id")
    .eq("pool_id", poolId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return;
  }

  const { error } = await supabase
    .from("series")
    .insert(
      starterSeriesTemplates.map(({ lockOffsetHours, ...series }) => ({
        ...series,
        pool_id: poolId,
        lock_at: new Date(Date.now() + lockOffsetHours * 60 * 60 * 1000).toISOString()
      }))
    );

  if (error) {
    throw error;
  }
}

async function insertSeriesRowsForPool(
  targetPoolId: string,
  rows: Array<{
    round: string;
    lock_at: string;
    status: "open" | "locked" | "final";
    home_team_name: string;
    home_team_short_name: string;
    home_team_seed: number;
    home_team_conference: "East" | "West";
    away_team_name: string;
    away_team_short_name: string;
    away_team_seed: number;
    away_team_conference: "East" | "West";
    winner_short_name: string | null;
    result_games: number | null;
  }>
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("series").insert(
    rows.map((series) => ({
      pool_id: targetPoolId,
      ...series
    }))
  );

  if (error) {
    throw error;
  }
}

async function seedSeriesFromTemplate(templateId: string, poolId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("template_series")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("Selected template has no series.");
  }

  await insertSeriesRowsForPool(
    poolId,
    data.map((series) => ({
      round: series.round,
      lock_at: series.lock_at,
      status: series.status,
      home_team_name: series.home_team_name,
      home_team_short_name: series.home_team_short_name,
      home_team_seed: series.home_team_seed,
      home_team_conference: series.home_team_conference,
      away_team_name: series.away_team_name,
      away_team_short_name: series.away_team_short_name,
      away_team_seed: series.away_team_seed,
      away_team_conference: series.away_team_conference,
      winner_short_name: series.winner_short_name,
      result_games: series.result_games
    }))
  );
}

async function seedSeriesFromPool(sourcePoolId: string, targetPoolId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("series")
    .select("*")
    .eq("pool_id", sourcePoolId)
    .order("lock_at", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("Selected source pool has no series.");
  }

  await insertSeriesRowsForPool(
    targetPoolId,
    data.map((series) => ({
      round: series.round,
      lock_at: series.lock_at,
      status: series.status,
      home_team_name: series.home_team_name,
      home_team_short_name: series.home_team_short_name,
      home_team_seed: series.home_team_seed,
      home_team_conference: series.home_team_conference,
      away_team_name: series.away_team_name,
      away_team_short_name: series.away_team_short_name,
      away_team_seed: series.away_team_seed,
      away_team_conference: series.away_team_conference,
      winner_short_name: series.winner_short_name,
      result_games: series.result_games
    }))
  );
}

type CreatePoolSourceInput = {
  templateId?: string;
  sourcePoolId?: string;
};

export async function createPool(name: string, user: UserSession, source?: CreatePoolSourceInput) {
  const supabase = getSupabaseAdminClient();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("name is required.");
  }

  const code = await createUniquePoolCode();
  const { data, error } = await supabase
    .from("pools")
    .insert([{ name: trimmedName, code, created_by: user.id }])
    .select("id, name, code")
    .single<PoolRow>();

  if (error) {
    throw error;
  }

  await ensurePoolMembership(data.id, user);
  if (source?.templateId) {
    await seedSeriesFromTemplate(source.templateId, data.id);
  } else if (source?.sourcePoolId) {
    await seedSeriesFromPool(source.sourcePoolId, data.id);
  } else {
    await seedStarterSeries(data.id);
  }
  await recordActivity(data.id, pickOne([
    `${user.displayName} created ${trimmedName}.`,
    `${user.displayName} started ${trimmedName}. Trouble begins.`,
    `${user.displayName} opened ${trimmedName}. Receipts will be kept.`
  ]));

  return getPool(data.id);
}

export async function joinPool(poolCode: string, user: UserSession) {
  const supabase = getSupabaseAdminClient();
  const normalizedCode = poolCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("pools")
    .select("id")
    .eq("code", normalizedCode)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const joinedForFirstTime = await ensurePoolMembership(data.id, user);
  if (joinedForFirstTime) {
    await recordActivity(data.id, pickOne([
      `${user.displayName} joined the pool.`,
      `${user.displayName} entered the chat with playoff confidence.`,
      `${user.displayName} is in. Bad takes pending.`
    ]));
  }
  return getPool(data.id);
}

export async function getPool(poolId: string): Promise<Pool | null> {
  const supabase = getSupabaseAdminClient();

  const { data: poolRow, error: poolError } = await supabase
    .from("pools")
    .select("id, name, code, created_at")
    .eq("id", poolId)
    .maybeSingle<PoolRow>();

  if (poolError) {
    throw poolError;
  }

  if (!poolRow) {
    return null;
  }

  const [
    { data: memberRows, error: memberError },
    { data: seriesRows, error: seriesError },
    { data: activityRows, error: activityError }
  ] = await Promise.all([
    supabase
      .from("pool_members")
      .select("user_id, users!inner(id, display_name)")
      .eq("pool_id", poolId),
    supabase
      .from("series")
      .select("*")
      .eq("pool_id", poolId)
      .order("lock_at", { ascending: true }),
    supabase
      .from("activities")
      .select("id, message, created_at")
      .eq("pool_id", poolId)
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  if (memberError) {
    throw memberError;
  }
  if (seriesError) {
    throw seriesError;
  }
  if (activityError) {
    throw activityError;
  }

  const members: PoolMember[] = (memberRows ?? []).map((row: { user_id: string; users: UserRow | UserRow[] }) => {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.user_id,
      displayName: user.display_name
    };
  });

  return {
    id: poolRow.id,
    name: poolRow.name,
    code: poolRow.code,
    members,
    series: (seriesRows ?? []).map((row) => mapSeries(row as SeriesRow)),
    activities: (activityRows ?? []).map((row) => mapActivity(row as ActivityRow))
  };
}

export async function getPoolActivities(poolId: string, offset = 0, limit = 12): Promise<ActivityPage> {
  const supabase = getSupabaseAdminClient();
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), 50);

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from("activities")
      .select("id, message, created_at")
      .eq("pool_id", poolId)
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1),
    supabase
      .from("activities")
      .select("*", { count: "exact", head: true })
      .eq("pool_id", poolId)
  ]);

  if (error) {
    throw error;
  }

  if (countError) {
    throw countError;
  }

  const total = count ?? 0;
  return {
    items: (data ?? []).map((row) => mapActivity(row as ActivityRow)),
    total,
    offset: safeOffset,
    limit: safeLimit,
    hasMore: safeOffset + safeLimit < total
  };
}

export async function listAdminPools(): Promise<AdminPoolSummary[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pools")
    .select("id, name, code, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const pools = (data ?? []) as PoolRow[];
  const summaries = await Promise.all(
    pools.map(async (pool) => {
      const fullPool = await getPool(pool.id);
      const leaderboard = await computeLeaderboard(pool.id);
      const { data: latestActivity, error: activityError } = await supabase
        .from("activities")
        .select("created_at")
        .eq("pool_id", pool.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ created_at: string }>();

      if (activityError) {
        throw activityError;
      }

      return {
        id: pool.id,
        name: pool.name,
        code: pool.code,
        memberCount: fullPool?.members.length ?? 0,
        leaderboard,
        leaderDisplayName: leaderboard[0]?.displayName ?? null,
        lastUpdatedAt: latestActivity?.created_at ?? pool.created_at
      };
    })
  );

  return summaries;
}

export async function listPlayoffTemplates(): Promise<PlayoffTemplateSummary[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("playoff_templates")
    .select("id, name, source_pool_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const templates = (data ?? []) as PlayoffTemplateRow[];
  const summaries = await Promise.all(
    templates.map(async (template) => {
      const { count, error: countError } = await supabase
        .from("template_series")
        .select("*", { count: "exact", head: true })
        .eq("template_id", template.id);

      if (countError) {
        throw countError;
      }

      return {
        id: template.id,
        name: template.name,
        seriesCount: count ?? 0,
        createdAt: template.created_at,
        sourcePoolId: template.source_pool_id
      };
    })
  );

  return summaries;
}

export async function listPoolCreateSources(): Promise<PoolCreateSource> {
  const [pools, templates] = await Promise.all([listAdminPools(), listPlayoffTemplates()]);
  return { pools, templates };
}

export async function deleteSeries(poolId: string, seriesId: string) {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    throw new Error("Pool not found.");
  }

  const target = pool.series.find((series) => series.id === seriesId);
  if (!target) {
    return false;
  }

  const { error } = await supabase
    .from("series")
    .delete()
    .eq("pool_id", poolId)
    .eq("id", seriesId);

  if (error) {
    throw error;
  }

  await recordActivity(poolId, `Admin deleted ${target.awayTeam.shortName} at ${target.homeTeam.shortName}.`);
  return true;
}

export async function deletePool(poolId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("pools").delete().eq("id", poolId);

  if (error) {
    throw error;
  }

  return true;
}

export async function deleteAllSeries(poolId: string) {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    throw new Error("Pool not found.");
  }

  const { error } = await supabase.from("series").delete().eq("pool_id", poolId);
  if (error) {
    throw error;
  }

  await recordActivity(poolId, `Admin cleared all series from ${pool.name}.`);
  return true;
}

export async function cloneSeriesBetweenPools(sourcePoolId: string, targetPoolId: string, replaceExisting: boolean) {
  const supabase = getSupabaseAdminClient();

  if (sourcePoolId === targetPoolId) {
    throw new Error("Source and target pool must be different.");
  }

  const [sourcePool, targetPool] = await Promise.all([getPool(sourcePoolId), getPool(targetPoolId)]);

  if (!sourcePool) {
    throw new Error("Source pool not found.");
  }

  if (!targetPool) {
    throw new Error("Target pool not found.");
  }

  const { data: sourceSeries, error: sourceError } = await supabase
    .from("series")
    .select("*")
    .eq("pool_id", sourcePoolId)
    .order("lock_at", { ascending: true });

  if (sourceError) {
    throw sourceError;
  }

  if (!sourceSeries || sourceSeries.length === 0) {
    throw new Error("Source pool has no series to copy.");
  }

  if (replaceExisting) {
    const { error: deleteError } = await supabase.from("series").delete().eq("pool_id", targetPoolId);
    if (deleteError) {
      throw deleteError;
    }
  }

  const { error: insertError } = await supabase.from("series").insert(
    sourceSeries.map((series) => ({
      pool_id: targetPoolId,
      round: series.round,
      lock_at: series.lock_at,
      status: series.status,
      home_team_name: series.home_team_name,
      home_team_short_name: series.home_team_short_name,
      home_team_seed: series.home_team_seed,
      home_team_conference: series.home_team_conference,
      away_team_name: series.away_team_name,
      away_team_short_name: series.away_team_short_name,
      away_team_seed: series.away_team_seed,
      away_team_conference: series.away_team_conference,
      winner_short_name: series.winner_short_name,
      result_games: series.result_games
    }))
  );

  if (insertError) {
    throw insertError;
  }

  await recordActivity(
    targetPoolId,
    `Admin copied ${sourceSeries.length} series from ${sourcePool.name} into ${targetPool.name}.`
  );

  return sourceSeries.length;
}

export async function createTemplateFromPool(poolId: string, name: string) {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);
  if (!pool) {
    throw new Error("Pool not found.");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Template name is required.");
  }

  const { data: template, error: templateError } = await supabase
    .from("playoff_templates")
    .insert([{ name: trimmedName, source_pool_id: poolId }])
    .select("id, name, source_pool_id, created_at")
    .single<PlayoffTemplateRow>();

  if (templateError) {
    throw templateError;
  }

  const { data: seriesRows, error: seriesError } = await supabase
    .from("series")
    .select("*")
    .eq("pool_id", poolId)
    .order("lock_at", { ascending: true });

  if (seriesError) {
    throw seriesError;
  }

  if (!seriesRows || seriesRows.length === 0) {
    throw new Error("Pool has no series to save as a template.");
  }

  const { error: insertError } = await supabase.from("template_series").insert(
    seriesRows.map((series, index) => ({
      template_id: template.id,
      round: series.round,
      lock_at: series.lock_at,
      status: series.status,
      home_team_name: series.home_team_name,
      home_team_short_name: series.home_team_short_name,
      home_team_seed: series.home_team_seed,
      home_team_conference: series.home_team_conference,
      away_team_name: series.away_team_name,
      away_team_short_name: series.away_team_short_name,
      away_team_seed: series.away_team_seed,
      away_team_conference: series.away_team_conference,
      winner_short_name: series.winner_short_name,
      result_games: series.result_games,
      sort_order: index
    }))
  );

  if (insertError) {
    throw insertError;
  }

  await recordActivity(poolId, `Admin saved ${pool.name} as template ${trimmedName}.`);

  return {
    id: template.id,
    name: template.name,
    sourcePoolId: template.source_pool_id,
    createdAt: template.created_at,
    seriesCount: seriesRows.length
  };
}

export async function renameTemplate(templateId: string, name: string) {
  const supabase = getSupabaseAdminClient();
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Template name is required.");
  }

  const { data, error } = await supabase
    .from("playoff_templates")
    .update({ name: trimmedName })
    .eq("id", templateId)
    .select("id, name, source_pool_id, created_at")
    .maybeSingle<PlayoffTemplateRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Template not found.");
  }

  const { count, error: countError } = await supabase
    .from("template_series")
    .select("*", { count: "exact", head: true })
    .eq("template_id", templateId);

  if (countError) {
    throw countError;
  }

  return {
    id: data.id,
    name: data.name,
    sourcePoolId: data.source_pool_id,
    createdAt: data.created_at,
    seriesCount: count ?? 0
  };
}

export async function deleteTemplate(templateId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("playoff_templates").delete().eq("id", templateId);

  if (error) {
    throw error;
  }

  return true;
}

export async function removePoolMember(poolId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    throw new Error("Pool not found.");
  }

  const member = pool.members.find((entry) => entry.id === userId);
  if (!member) {
    return false;
  }

  const [{ error: pickError }, { error: memberError }] = await Promise.all([
    supabase.from("picks").delete().eq("pool_id", poolId).eq("user_id", userId),
    supabase.from("pool_members").delete().eq("pool_id", poolId).eq("user_id", userId)
  ]);

  if (pickError) {
    throw pickError;
  }
  if (memberError) {
    throw memberError;
  }

  await recordActivity(poolId, `Admin removed ${member.displayName} from the pool.`);
  return true;
}

export async function listAdminPoolMembers(poolId: string): Promise<AdminPoolMember[]> {
  const pool = await getPool(poolId);
  if (!pool) {
    throw new Error("Pool not found.");
  }

  const leaderboard = await computeLeaderboard(poolId);
  const leaderboardByUser = new Map(leaderboard.map((entry) => [entry.userId, entry]));

  return pool.members
    .map((member) => {
      const stats = leaderboardByUser.get(member.id);
      return {
        ...member,
        score: stats?.score ?? 0,
        exactCalls: stats?.exactCalls ?? 0,
        correctWinners: stats?.correctWinners ?? 0
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.displayName.localeCompare(right.displayName);
    });
}

export async function getUserPicks(poolId: string, userId: string): Promise<Pick[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("picks")
    .select("series_id, winner_short_name, games")
    .eq("pool_id", poolId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: { series_id: string; winner_short_name: string; games: number }) => ({
    seriesId: row.series_id,
    winnerShortName: row.winner_short_name,
    games: row.games
  }));
}

export async function getPoolPicks(poolId: string, viewerUserId: string): Promise<PoolMemberPicks[]> {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    throw new Error("Pool not found.");
  }

  const viewerIsMember = pool.members.some((member) => member.id === viewerUserId);
  if (!viewerIsMember) {
    throw new Error("You must be a member of this pool to view picks.");
  }

  const { data, error } = await supabase
    .from("picks")
    .select("user_id, series_id, winner_short_name, games, users!inner(display_name)")
    .eq("pool_id", poolId);

  if (error) {
    throw error;
  }

  const picksByUser = new Map<string, PoolMemberPicks>();

  for (const member of pool.members) {
    picksByUser.set(member.id, {
      userId: member.id,
      displayName: member.displayName,
      picks: []
    });
  }

  for (const row of data ?? []) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    const existing: PoolMemberPicks = picksByUser.get(row.user_id) ?? {
      userId: row.user_id,
      displayName: user.display_name,
      picks: []
    };

    existing.picks.push({
      seriesId: row.series_id,
      winnerShortName: row.winner_short_name,
      games: row.games
    });

    picksByUser.set(row.user_id, existing);
  }

  return Array.from(picksByUser.values())
    .map((entry) => ({
      ...entry,
      picks: entry.picks.sort((left, right) => left.seriesId.localeCompare(right.seriesId))
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function isSeriesLocked(series: Series) {
  return series.status !== "open" || new Date(series.lockAt).getTime() <= Date.now();
}

export async function saveUserPicks(poolId: string, userId: string, picks: Pick[]) {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    throw new Error("Pool not found.");
  }

  const existingPicks = await getUserPicks(poolId, userId);
  const existingBySeries = new Map(existingPicks.map((pick) => [pick.seriesId, pick]));

  const validSeriesIds = new Set(pool.series.map((series) => series.id));
  const lockedSeriesIds = new Set(pool.series.filter(isSeriesLocked).map((series) => series.id));
  const editableSeriesIds = pool.series.filter((series) => !isSeriesLocked(series)).map((series) => series.id);
  const member = pool.members.find((entry) => entry.id === userId);

  if (!member) {
    throw new Error("You are not a member of this pool. Rejoin from the landing page and try again.");
  }

  if (editableSeriesIds.length === 0) {
    throw new Error("All series in this pool are locked. Update lock times in admin or create new series.");
  }

  if (picks.length === 0) {
    throw new Error("Pick at least one series before submitting.");
  }

  const sanitized = picks.filter(
    (pick) =>
      validSeriesIds.has(pick.seriesId) &&
      !lockedSeriesIds.has(pick.seriesId) &&
      typeof pick.winnerShortName === "string" &&
      typeof pick.games === "number" &&
      pick.games >= 4 &&
      pick.games <= 7
  );

  if (sanitized.length === 0) {
    throw new Error("No editable picks were submitted. The selected series may already be locked.");
  }

  let deleteQuery = supabase.from("picks").delete().eq("pool_id", poolId).eq("user_id", userId);

  if (lockedSeriesIds.size > 0) {
    deleteQuery = deleteQuery.not(
      "series_id",
      "in",
      `(${Array.from(lockedSeriesIds)
        .map((id) => `"${id}"`)
        .join(",")})`
    );
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    throw deleteError;
  }

  if (sanitized.length > 0) {
    const { error: insertError } = await supabase.from("picks").insert(
      sanitized.map((pick) => ({
        pool_id: poolId,
        user_id: userId,
        series_id: pick.seriesId,
        winner_short_name: pick.winnerShortName,
        games: pick.games
      }))
    );

    if (insertError) {
      throw insertError;
    }
  }

  const changedMessages = sanitized
    .filter((pick) => {
      const previous = existingBySeries.get(pick.seriesId);
      return !previous || previous.winnerShortName !== pick.winnerShortName || previous.games !== pick.games;
    })
    .slice(0, 4)
    .map((pick) => {
      const series = pool.series.find((entry) => entry.id === pick.seriesId);
      return series ? buildPickActivityMessage(member.displayName, series, pick) : "";
    });

  await recordActivities(poolId, [
    pickOne([
      `${member.displayName} submitted picks for ${sanitized.length} series.`,
      `${member.displayName} turned in picks for ${sanitized.length} series.`,
      `${member.displayName} locked a fresh batch of takes: ${sanitized.length} series.`
    ]),
    ...changedMessages
  ]);

  return sanitized;
}

export async function computeLeaderboard(poolId: string): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    return [];
  }

  const [memberRows, pickRows] = await Promise.all([
    supabase.from("pool_members").select("user_id, users!inner(id, display_name)").eq("pool_id", poolId),
    supabase.from("picks").select("user_id, series_id, winner_short_name, games").eq("pool_id", poolId)
  ]);

  if (memberRows.error) {
    throw memberRows.error;
  }
  if (pickRows.error) {
    throw pickRows.error;
  }

  const resultsBySeries = new Map(
    pool.series
      .filter((series) => series.result)
      .map((series) => [series.id, series.result] as const)
  );

  const picksByUser = new Map<string, Pick[]>();
  for (const row of pickRows.data ?? []) {
    const next = picksByUser.get(row.user_id) ?? [];
    next.push({
      seriesId: row.series_id,
      winnerShortName: row.winner_short_name,
      games: row.games
    });
    picksByUser.set(row.user_id, next);
  }

  return (memberRows.data ?? [])
    .map((row: { user_id: string; users: UserRow | UserRow[] }) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      const picks = picksByUser.get(row.user_id) ?? [];
      let score = 0;
      let correctWinners = 0;
      let exactCalls = 0;

      for (const pick of picks) {
        const result = resultsBySeries.get(pick.seriesId);
        if (!result) {
          continue;
        }

        const correctWinner = pick.winnerShortName === result.winnerShortName;
        const exactCall = correctWinner && pick.games === result.games;

        if (exactCall) {
          score += 2;
          exactCalls += 1;
          correctWinners += 1;
        } else if (correctWinner) {
          score += 1;
          correctWinners += 1;
        }
      }

      return {
        userId: row.user_id,
        displayName: user.display_name,
        score,
        exactCalls,
        correctWinners
      };
    })
    .sort((a, b) => b.score - a.score || b.exactCalls - a.exactCalls || b.correctWinners - a.correctWinners);
}

export async function updateSeriesResult(poolId: string, seriesId: string, winnerShortName: string, games: number) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("series")
    .update({
      winner_short_name: winnerShortName,
      result_games: games,
      status: "final"
    })
    .eq("pool_id", poolId)
    .eq("id", seriesId)
    .select("*")
    .maybeSingle<SeriesRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const series = mapSeries(data);
  const [{ data: pickRows, error: pickError }, leaderboard] = await Promise.all([
    supabase
      .from("picks")
      .select("user_id, winner_short_name, games, users!inner(display_name)")
      .eq("pool_id", poolId)
      .eq("series_id", seriesId),
    computeLeaderboard(poolId)
  ]);

  if (pickError) {
    throw pickError;
  }

  const scoringMessages = (pickRows ?? [])
    .map((row: { user_id: string; winner_short_name: string; games: number; users: { display_name: string } | { display_name: string }[] }) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      const points =
        row.winner_short_name === winnerShortName ? (row.games === games ? 2 : 1) : 0;

      return buildScoreActivityMessage(
        user.display_name,
        {
          seriesId,
          winnerShortName: row.winner_short_name,
          games: row.games
        },
        points
      );
    })
    .slice(0, 8);

  await recordActivities(poolId, [
    pickOne([
      `Result posted: ${winnerShortName} won ${data.home_team_short_name}/${data.away_team_short_name} in ${games}.`,
      `${winnerShortName} closed out ${data.home_team_short_name}/${data.away_team_short_name} in ${games}. Results are in.`,
      `${winnerShortName} finished ${data.home_team_short_name}/${data.away_team_short_name} in ${games}. Time to score the damage.`
    ]),
    ...scoringMessages,
    leaderboard[0] ? buildLeaderActivityMessage(leaderboard[0].displayName) : ""
  ]);

  return series;
}

export async function clearSeriesResult(poolId: string, seriesId: string) {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    throw new Error("Pool not found.");
  }

  const target = pool.series.find((series) => series.id === seriesId);
  if (!target) {
    return null;
  }

  const nextStatus = new Date(target.lockAt).getTime() > Date.now() ? "open" : "locked";
  const { data, error } = await supabase
    .from("series")
    .update({
      winner_short_name: null,
      result_games: null,
      status: nextStatus
    })
    .eq("pool_id", poolId)
    .eq("id", seriesId)
    .select("*")
    .maybeSingle<SeriesRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  await recordActivity(poolId, `Admin cleared the result for ${target.awayTeam.shortName} at ${target.homeTeam.shortName}.`);
  return mapSeries(data);
}

type SeriesAdminInput = {
  round: string;
  lockAt: string;
  homeTeam: {
    name: string;
    shortName: string;
    seed: number;
    conference: "East" | "West";
  };
  awayTeam: {
    name: string;
    shortName: string;
    seed: number;
    conference: "East" | "West";
  };
};

function normalizeSeriesAdminInput(input: SeriesAdminInput) {
  const round = input.round.trim();
  const lockAt = input.lockAt;
  const homeName = input.homeTeam.name.trim();
  const homeShortName = input.homeTeam.shortName.trim().toUpperCase();
  const awayName = input.awayTeam.name.trim();
  const awayShortName = input.awayTeam.shortName.trim().toUpperCase();

  if (!round || !lockAt || !homeName || !homeShortName || !awayName || !awayShortName) {
    throw new Error("round, lockAt, and both team names/short names are required.");
  }

  if (input.homeTeam.seed < 1 || input.awayTeam.seed < 1) {
    throw new Error("Team seeds must be 1 or higher.");
  }

  return {
    round,
    lock_at: new Date(lockAt).toISOString(),
    status: "open" as const,
    home_team_name: homeName,
    home_team_short_name: homeShortName,
    home_team_seed: input.homeTeam.seed,
    home_team_conference: input.homeTeam.conference,
    away_team_name: awayName,
    away_team_short_name: awayShortName,
    away_team_seed: input.awayTeam.seed,
    away_team_conference: input.awayTeam.conference
  };
}

export async function createSeries(poolId: string, input: SeriesAdminInput) {
  const supabase = getSupabaseAdminClient();
  const pool = await getPool(poolId);

  if (!pool) {
    throw new Error("Pool not found.");
  }

  const payload = normalizeSeriesAdminInput(input);
  const { data, error } = await supabase
    .from("series")
    .insert([{ pool_id: poolId, ...payload }])
    .select("*")
    .single<SeriesRow>();

  if (error) {
    throw error;
  }

  await recordActivity(
    poolId,
    `Admin added ${payload.away_team_short_name} at ${payload.home_team_short_name} for ${payload.round}.`
  );

  return mapSeries(data);
}

export async function updateSeriesDetails(poolId: string, seriesId: string, input: SeriesAdminInput) {
  const supabase = getSupabaseAdminClient();
  const payload = normalizeSeriesAdminInput(input);
  const { data, error } = await supabase
    .from("series")
    .update(payload)
    .eq("pool_id", poolId)
    .eq("id", seriesId)
    .select("*")
    .maybeSingle<SeriesRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  await recordActivity(
    poolId,
    `Admin updated ${payload.away_team_short_name} at ${payload.home_team_short_name} for ${payload.round}.`
  );

  return mapSeries(data);
}
