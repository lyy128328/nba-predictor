export type TeamSeed = {
  seed: number;
  name: string;
  shortName: string;
  conference: "East" | "West";
};

export type SeriesResult = {
  winnerShortName: string;
  games: number;
};

export type SeriesStatus = "open" | "locked" | "final";

export type Series = {
  id: string;
  round: string;
  lockAt: string;
  status: SeriesStatus;
  homeTeam: TeamSeed;
  awayTeam: TeamSeed;
  result?: SeriesResult;
};

export type Pick = {
  seriesId: string;
  winnerShortName: string;
  games: number;
};

export type PoolMember = {
  id: string;
  displayName: string;
};

export type ActivityItem = {
  id: string;
  message: string;
  createdAt: string;
};

export type ActivityPage = {
  items: ActivityItem[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type Pool = {
  id: string;
  name: string;
  code: string;
  members: PoolMember[];
  series: Series[];
  activities: ActivityItem[];
};

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  score: number;
  exactCalls: number;
  correctWinners: number;
};

export type UserSession = {
  id: string;
  displayName: string;
};

export type PicksByUser = Record<string, Pick[]>;

export type PoolMemberPicks = {
  userId: string;
  displayName: string;
  picks: Pick[];
};

export type AdminPoolSummary = {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  leaderboard: LeaderboardEntry[];
  leaderDisplayName: string | null;
  lastUpdatedAt: string;
};

export type AdminPoolMember = PoolMember & {
  score: number;
  exactCalls: number;
  correctWinners: number;
};

export type PlayoffTemplateSummary = {
  id: string;
  name: string;
  seriesCount: number;
  createdAt: string;
  sourcePoolId: string | null;
};

export type PoolCreateSource = {
  pools: AdminPoolSummary[];
  templates: PlayoffTemplateSummary[];
};
