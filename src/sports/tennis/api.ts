import { LiveMatch } from '../../types';
import { fetchJson } from '../../api/http';
import { TennisMatchState, TennisPlayer } from './types';

// ESPN's free, no-auth tennis scoreboard. We poll the scoreboard itself for live
// updates (rather than the summary endpoint) so the live-list parser and the
// per-match parser share one code path and one payload shape.
//
// NOTE: ESPN does not publish this API, so the exact field names below are based
// on the documented/observed scoreboard shape and must be confirmed on the first
// live run (see the plan's verification section). The parser is written
// defensively — missing fields degrade gracefully rather than throw.
const LEAGUES = ['atp', 'wta'] as const;
type League = typeof LEAGUES[number];

const GRAND_SLAMS = ['australian open', 'roland garros', 'french open', 'wimbledon', 'us open'];

function isGrandSlam(name: string): boolean {
  const n = name.toLowerCase();
  return GRAND_SLAMS.some(s => n.includes(s));
}

function scoreboardUrl(league: League): string {
  return `https://site.api.espn.com/apis/site/v2/sports/tennis/${league}/scoreboard`;
}

// Tennis scoreboards can nest individual matches either directly under an event's
// `competitions`, or under `event.groupings[].competitions`. Yield a flat stream
// of matches with their tournament + round context either way.
interface CompContext {
  comp: any;
  tournament: string;
  round: string;
}

function* iterCompetitions(data: any): Generator<CompContext> {
  const leagueName = data.leagues?.[0]?.name ?? '';
  for (const event of data.events ?? []) {
    const tournament = event.tournament?.displayName ?? event.name ?? leagueName;
    const groupings: any[] = event.groupings ?? [];
    if (groupings.length > 0) {
      for (const g of groupings) {
        const round = g.grouping?.displayName ?? g.displayName ?? '';
        for (const comp of g.competitions ?? []) yield { comp, tournament, round };
      }
    } else {
      for (const comp of event.competitions ?? []) {
        yield { comp, tournament, round: comp.type?.text ?? '' };
      }
    }
  }
}

function competitorName(c: any): string {
  if (c.athlete?.displayName) return c.athlete.displayName;
  if (Array.isArray(c.athletes) && c.athletes.length) {
    return c.athletes.map((a: any) => a.displayName ?? a.athlete?.displayName).filter(Boolean).join('/');
  }
  if (c.team?.displayName) return c.team.displayName;
  return c.displayName ?? c.name ?? '';
}

function competitorSeed(c: any): string | undefined {
  if (c.seed != null && c.seed !== '') return String(c.seed);
  if (c.curatedRank?.current != null) return `#${c.curatedRank.current}`;
  return undefined;
}

// Best-effort read of the in-progress game points for a competitor. ESPN exposes
// this inconsistently across sports, so probe a few plausible keys and fall back
// to blank (the stream view simply omits the game score when it is empty).
function currentGamePoints(comp: any, c: any): string {
  const s = comp.situation;
  if (!s) return '';
  const home = c.homeAway === 'home';
  const cand = home
    ? (s.homeScore ?? s.homePoints ?? s.homeGameScore)
    : (s.awayScore ?? s.awayPoints ?? s.awayGameScore);
  return cand != null ? String(cand) : '';
}

function servingId(comp: any): string | null {
  const s = comp.situation;
  const id = s?.serving?.id ?? s?.servingId ?? null;
  return id != null ? String(id) : null;
}

function toPlayer(comp: any, c: any, serving: string | null): TennisPlayer {
  const sets = (c.linescores ?? []).map((l: any) => Number(l.value ?? l.displayValue ?? 0));
  return {
    name: competitorName(c),
    seed: competitorSeed(c),
    sets,
    currentGameScore: currentGamePoints(comp, c),
    isServing: c.possession === true || (serving != null && String(c.id) === serving),
    setsWon: Number(c.score ?? 0),
    isWinner: c.winner === true,
  };
}

// Order competitors home-first for stable display, falling back to the `order` field.
function orderedCompetitors(comp: any): [any, any] {
  const comps: any[] = comp.competitors ?? [];
  const sorted = [...comps].sort((a, b) => {
    if (a.homeAway && b.homeAway) return a.homeAway === 'home' ? -1 : 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  return [sorted[0] ?? {}, sorted[1] ?? {}];
}

function statusText(comp: any): string {
  const t = comp.status?.type;
  return t?.shortDetail ?? t?.description ?? t?.detail ?? '';
}

function toState(comp: any, tournament: string, round: string, matchId: string): TennisMatchState {
  const serving = servingId(comp);
  const [a, b] = orderedCompetitors(comp);
  return {
    matchId,
    tournament,
    round,
    status: statusText(comp),
    players: [toPlayer(comp, a, serving), toPlayer(comp, b, serving)],
    lastUpdated: new Date(),
  };
}

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const payloads = await Promise.all(
    LEAGUES.map(async league => {
      try {
        const data = await fetchJson(scoreboardUrl(league));
        return { league, data };
      } catch {
        return null; // one tour failing shouldn't blank the whole list
      }
    }),
  );

  interface Ranked { match: LiveMatch; live: boolean; slam: boolean }
  const ranked: Ranked[] = [];

  for (const p of payloads) {
    if (!p) continue;
    for (const { comp, tournament, round } of iterCompetitions(p.data)) {
      const [a, b] = orderedCompetitors(comp);
      const teams = [competitorName(a), competitorName(b)].filter(Boolean).join(' vs ');
      if (!teams || !comp.id) continue;
      const state = comp.status?.type?.state ?? ''; // 'pre' | 'in' | 'post'
      ranked.push({
        match: {
          id: `${p.league}:${comp.id}`,
          description: `${tournament} — ${teams}`,
          teams,
          status: statusText(comp),
          series: isGrandSlam(tournament) ? `★ ${tournament}` : tournament,
          matchType: round,
        },
        live: state === 'in',
        slam: isGrandSlam(tournament),
      });
    }
  }

  // Live matches first, then Grand Slams, preserving discovery order within a tier.
  ranked.sort((x, y) => rank(y) - rank(x));
  return ranked.map(r => r.match);

  function rank(r: Ranked): number {
    return (r.live ? 2 : 0) + (r.slam ? 1 : 0);
  }
}

export async function fetchMatchState(id: string): Promise<TennisMatchState> {
  const [league, compId] = id.split(':');
  const data = await fetchJson(scoreboardUrl(league as League));
  for (const { comp, tournament, round } of iterCompetitions(data)) {
    if (String(comp.id) === compId) return toState(comp, tournament, round, id);
  }
  throw new Error(`tennis match ${id} not found on ${league} scoreboard`);
}
