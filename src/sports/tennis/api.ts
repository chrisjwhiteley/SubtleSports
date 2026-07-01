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
  round: string;   // e.g. "Round 2" (comp.round.displayName)
  group: string;   // draw type, e.g. "Men's Singles" (comp.type.text)
  url: string;
}

// Pick a browser-friendly match page. Prefer a match-specific link, falling back
// to the tournament/event link. (Field verified-on-first-run, like the rest.)
function matchUrl(comp: any, event: any): string {
  const links: any[] = [...(comp.links ?? []), ...(event.links ?? [])];
  const pick = links.find(l => Array.isArray(l.rel) && l.rel.includes('desktop')) ?? links[0];
  return pick?.href ?? '';
}

function* iterCompetitions(data: any): Generator<CompContext> {
  const leagueName = data.leagues?.[0]?.name ?? '';
  for (const event of data.events ?? []) {
    const tournament = event.tournament?.displayName ?? event.name ?? leagueName;
    // Draw type + round live on the competition itself (comp.type.text / comp.round);
    // fall back to the grouping's displayName for the draw type when absent.
    const emit = (comp: any, groupingName: string): CompContext => ({
      comp,
      tournament,
      round: comp.round?.displayName ?? '',
      group: comp.type?.text ?? groupingName,
      url: matchUrl(comp, event),
    });
    const groupings: any[] = event.groupings ?? [];
    if (groupings.length > 0) {
      for (const g of groupings) {
        const groupingName = g.grouping?.displayName ?? g.displayName ?? '';
        for (const comp of g.competitions ?? []) yield emit(comp, groupingName);
      }
    } else {
      for (const comp of event.competitions ?? []) yield emit(comp, '');
    }
  }
}

function competitorName(c: any): string {
  // Singles: a single athlete.
  if (c.athlete?.displayName) return c.athlete.displayName;
  // Doubles: ESPN puts the pair under `roster` with a ready-made "A / B" string.
  if (c.roster?.displayName) return c.roster.displayName;
  if (Array.isArray(c.roster?.athletes) && c.roster.athletes.length) {
    return c.roster.athletes.map((a: any) => a.displayName ?? a.shortName ?? a.fullName).filter(Boolean).join(' / ');
  }
  // Fallback shapes.
  if (Array.isArray(c.athletes) && c.athletes.length) {
    return c.athletes.map((a: any) => a.displayName ?? a.athlete?.displayName).filter(Boolean).join(' / ');
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
  const sets = (c.linescores ?? []).map((l: any) => ({
    games: Number(l.value ?? l.displayValue ?? 0),
    won: l.winner === true,
  }));
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

// Compact set-score summary from the two competitors' linescores, home first:
// e.g. [[6,4,2],[4,6,1]] -> "6-4 4-6 2-1".
function setScoreSummary(comp: any): string {
  const [a, b] = orderedCompetitors(comp);
  const aLs: any[] = a.linescores ?? [];
  const bLs: any[] = b.linescores ?? [];
  const n = Math.max(aLs.length, bLs.length);
  const sets: string[] = [];
  for (let i = 0; i < n; i++) {
    sets.push(`${aLs[i]?.value ?? 0}-${bLs[i]?.value ?? 0}`);
  }
  return sets.join(' ');
}

function toState(comp: any, tournament: string, round: string, matchId: string): TennisMatchState {
  const serving = servingId(comp);
  const [a, b] = orderedCompetitors(comp);
  return {
    matchId,
    tournament,
    round,
    status: comp.status?.type?.detail ?? statusText(comp),
    summary: comp.notes?.[0]?.text ?? '',
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

  interface Ranked { match: LiveMatch; slam: boolean }
  // Keyed by the RAW comp.id so the same match returned by both the atp and wta
  // feeds (Grand Slams appear on both) collapses to a single entry.
  const byId = new Map<string, Ranked>();

  for (const p of payloads) {
    if (!p) continue;
    for (const { comp, tournament, round, group, url } of iterCompetitions(p.data)) {
      // Only show matches that are actually in progress.
      if ((comp.status?.type?.state ?? '') !== 'in') continue;
      if (!comp.id || byId.has(String(comp.id))) continue;
      const [a, b] = orderedCompetitors(comp);
      const teams = [competitorName(a), competitorName(b)].filter(Boolean).join(' vs ');
      if (!teams) continue;
      // Status line shows the live set score plus the state, e.g. "4-4 · 1st Set".
      const detail = comp.status?.type?.detail ?? statusText(comp);
      const status = [setScoreSummary(comp), detail].filter(Boolean).join('  ·  ');
      byId.set(String(comp.id), {
        match: {
          id: `${p.league}:${comp.id}`,
          description: `${tournament} — ${teams}`,
          teams,
          status,
          series: isGrandSlam(tournament) ? `★ ${tournament}` : tournament,
          matchType: round,
          group,
          url,
        },
        slam: isGrandSlam(tournament),
      });
    }
  }

  // Grand Slams first, preserving discovery order within each tier.
  return [...byId.values()]
    .sort((x, y) => Number(y.slam) - Number(x.slam))
    .map(r => r.match);
}

export async function fetchMatchState(id: string): Promise<TennisMatchState> {
  const [league, compId] = id.split(':');
  // Try the id's own feed first, then fall back to the other tour's feed — a
  // match de-duped to one feed may only reappear on the other on a later poll.
  const order: League[] = league === 'wta' ? ['wta', 'atp'] : ['atp', 'wta'];
  for (const lg of order) {
    let data: any;
    try {
      data = await fetchJson(scoreboardUrl(lg));
    } catch {
      continue; // try the other feed
    }
    for (const { comp, tournament, round } of iterCompetitions(data)) {
      if (String(comp.id) === compId) return toState(comp, tournament, round, id);
    }
  }
  throw new Error(`tennis match ${id} not found on atp or wta scoreboard`);
}
