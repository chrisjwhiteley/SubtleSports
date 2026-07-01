import { LiveMatch } from '../../types';
import { MatchState, InningsSummary, Batsman, Bowler, BallEvent, Partnership, ScorecardInnings, FallOfWicket, MatchInfo } from './types';
import { HEADERS, fetchJson } from '../../api/http';

// Extract match ID from a cricinfo match URL
function extractMatchId(url: string): string {
  const m = url.match(/match\/(\d+)/);
  return m ? m[1]! : '';
}

// Parse the RSS feed of live scores to get match list + IDs
export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const xml = await fetch('https://static.cricinfo.com/rss/livescores.xml', { headers: HEADERS })
    .then(r => r.text());

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  const matches: LiveMatch[] = [];

  for (const [, body] of items) {
    const title = body.match(/<title>(.*?)<\/title>/)?.[1]?.trim() ?? '';
    const link = body.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? '';
    const id = extractMatchId(link);
    if (!id || !title) continue;

    // title format: "Team1 score v Team2 score" or "Team1 v Team2"
    const teams = title.replace(/[\d\/\*\(\)\.\s]+/g, ' ').replace(/\s+v\s+/i, ' v ').trim();
    matches.push({
      id,
      description: title,
      teams,
      status: '',
      series: '',
      matchType: '',
      url: link || `https://www.espncricinfo.com/ci/engine/match/${id}.html`,
    });
  }

  // Fetch match type info for each match (just first call to filter internationals)
  // We do this in parallel with a small batch to avoid hammering the server
  const enriched = await Promise.all(
    matches.map(async m => {
      try {
        const data = await fetchJson(`https://www.espncricinfo.com/ci/engine/match/${m.id}.json`);
        const match = data.match;
        const intlClass: string = match?.international_class_name ?? '';
        const isIntl = intlClass.length > 0;
        if (!isIntl) return null;
        return {
          ...m,
          matchType: match?.international_class_card ?? intlClass,
          series: data.series?.[0]?.series_name ?? '',
          status: match?.current_summary ?? '',
          teams: [data.team?.find((t: any) => t.team_id === match?.home_team_id)?.team_name,
                  data.team?.find((t: any) => t.team_id === match?.away_team_id)?.team_name]
                    .filter(Boolean).join(' v '),
        } as LiveMatch;
      } catch {
        return null;
      }
    })
  );

  return enriched.filter((m): m is LiveMatch => m !== null && m.teams.trim() !== '' && m.id !== '');
}

export async function fetchMatchState(matchId: string): Promise<MatchState> {
  const data = await fetchJson(`https://www.espncricinfo.com/ci/engine/match/${matchId}.json`);

  const match = data.match;
  const live = data.live;
  const centre = data.centre ?? {};
  const teams: any[] = data.team ?? [];

  // Build player name lookup from all teams' player arrays and centre batting/bowling
  const playerNames: Record<string, string> = {};
  for (const team of teams) {
    for (const p of team.player ?? []) {
      if (p.player_id) playerNames[String(p.player_id)] = p.known_as ?? p.popular_name ?? p.team_player_name ?? '';
    }
  }
  for (const b of centre.batting ?? []) {
    if (b.player_id) playerNames[String(b.player_id)] = b.known_as ?? b.popular_name ?? playerNames[String(b.player_id)] ?? '';
  }
  for (const b of centre.bowling ?? []) {
    if (b.player_id) playerNames[String(b.player_id)] = b.known_as ?? b.popular_name ?? playerNames[String(b.player_id)] ?? '';
  }
  const inningsArr: any[] = data.innings ?? [];
  const comms: any[] = data.comms ?? [];

  // Build innings summaries
  const innings: InningsSummary[] = inningsArr.map((inn: any) => {
    const team = teams.find((t: any) => t.team_id === inn.batting_team_id);
    return {
      teamName: team?.team_name ?? team?.team_abbreviation ?? '',
      score: parseInt(inn.runs ?? '0', 10),
      wickets: parseInt(inn.wickets ?? '0', 10),
      overs: parseFloat(inn.overs ?? '0'),
      declared: inn.event === 'declared',
      allOut: inn.event === 'all out',
    };
  });

  const liveInn = live?.innings;
  const currentScore: InningsSummary | null = liveInn ? {
    teamName: teams.find((t: any) => String(t.team_id) === String(liveInn.team_id))?.team_name ?? '',
    score: parseInt(liveInn.runs ?? '0', 10),
    wickets: parseInt(liveInn.wickets ?? '0', 10),
    overs: parseFloat(liveInn.overs ?? '0'),
    declared: false,
    allOut: false,
  } : innings[innings.length - 1] ?? null;

  // Batsmen — merge live stats with centre for names
  const batsmen: Batsman[] = (live?.batting ?? []).slice(0, 2).map((b: any) => ({
    name: playerNames[String(b.player_id)] ?? '',
    runs: parseInt(b.runs ?? '0', 10),
    balls: parseInt(b.balls_faced ?? '0', 10),
    fours: parseInt(b.fours ?? '0', 10),
    sixes: parseInt(b.sixes ?? '0', 10),
    strikeRate: parseFloat(b.strike_rate ?? '0'),
    onStrike: b.live_current_name === 'striker',
    dismissal: b.dismissal_name ?? 'not out',
    didBat: true,
  }));

  // Bowler — current bowler is live_current_name === 'current bowler' in centre.bowling
  const currentBowlerCentre = (centre.bowling ?? []).find((b: any) => b.live_current_name === 'current bowler');
  const bowlerRaw = currentBowlerCentre ?? (live?.bowling ?? [])[0] ?? null;
  const bowler: Bowler | null = bowlerRaw ? {
    name: playerNames[String(bowlerRaw.player_id)] ?? bowlerRaw.known_as ?? bowlerRaw.popular_name ?? '',
    overs: parseFloat(bowlerRaw.overs ?? '0'),
    maidens: parseInt(bowlerRaw.maidens ?? '0', 10),
    runs: parseInt(bowlerRaw.conceded ?? '0', 10),
    wickets: parseInt(bowlerRaw.wickets ?? '0', 10),
    economy: parseFloat(bowlerRaw.economy_rate ?? '0'),
  } : null;

  // Recent overs — array of arrays of ball objects
  // recent_overs[0] is oldest, each ball has: ball (runs or HTML entity for dot), over_number, ball_number
  const recentOversRaw: any[][] = live?.recent_overs ?? [];
  const recentBalls: BallEvent[] = recentOversRaw.flatMap((over: any[]) =>
    over.map(b => parseEngineBall(b))
  );

  // Current over is the last item in recent_overs
  const currentOverBalls: BallEvent[] = recentOversRaw.length > 0
    ? (recentOversRaw[recentOversRaw.length - 1] ?? []).map(parseEngineBall)
    : [];

  const lastBall = currentOverBalls.length > 0
    ? currentOverBalls[currentOverBalls.length - 1] ?? null
    : recentBalls[recentBalls.length - 1] ?? null;

  // Ball-by-ball from comms (newest first from API, keep that order)
  const ballByBall: BallEvent[] = comms.flatMap((over: any) =>
    (over.ball ?? []).map((b: any) => ({
      over: parseInt(b.over_number ?? '0', 10),
      ball: parseFloat(b.overs_actual ?? '0'),
      description: `${b.players ?? ''}: ${b.text ?? ''}`.trim(),
      runs: parseEventRuns(b.event ?? ''),
      isWicket: (b.dismissal ?? '') !== '',
      isFour: b.event === 'Four',
      isSix: b.event === 'Six',
    } as BallEvent))
  );

  // Partnership from live.fow (fall of wicket) — derive current stand
  const fow: any[] = live?.fow ?? [];
  const lastWicket = fow[fow.length - 1];
  const partnershipRuns = lastWicket
    ? (currentScore?.score ?? 0) - parseInt(lastWicket.runs ?? '0', 10)
    : currentScore?.score ?? 0;
  const partnership: Partnership | null = batsmen.length >= 2 ? {
    runs: partnershipRuns,
    balls: 0, // not available in this endpoint directly
    batsman1: batsmen[0]?.name ?? '',
    batsman1Runs: batsmen[0]?.runs ?? 0,
    batsman2: batsmen[1]?.name ?? '',
    batsman2Runs: batsmen[1]?.runs ?? 0,
  } : null;

  // Full scorecard — use live centre data for current innings
  // Historical innings batting is not available in this endpoint without HTML scraping
  const liveBatsmen: Batsman[] = (centre.batting ?? []).map((b: any) => ({
    name: playerNames[String(b.player_id)] ?? b.known_as ?? b.popular_name ?? '',
    runs: parseInt(b.runs ?? '0', 10),
    balls: parseInt(b.balls_faced ?? '0', 10),
    fours: parseInt(b.fours ?? '0', 10),
    sixes: parseInt(b.sixes ?? '0', 10),
    strikeRate: parseFloat(b.strike_rate ?? '0'),
    onStrike: b.live_current_name === 'striker',
    dismissal: b.dismissal_name ?? 'not out',
    didBat: true,
  }));

  const liveBowlers: Bowler[] = (centre.bowling ?? []).map((b: any) => ({
    name: playerNames[String(b.player_id)] ?? b.known_as ?? b.popular_name ?? '',
    overs: parseFloat(b.overs ?? '0'),
    maidens: parseInt(b.maidens ?? '0', 10),
    runs: parseInt(b.conceded ?? '0', 10),
    wickets: parseInt(b.wickets ?? '0', 10),
    economy: parseFloat(b.economy_rate ?? '0'),
  }));

  // Pad allInnings arrays to match innings count, using live data for current innings
  const allInningsBatsmen: Batsman[][] = innings.map((_, i) =>
    i === innings.length - 1 ? liveBatsmen : []
  );
  const allInningsBowlers: Bowler[][] = innings.map((_, i) =>
    i === innings.length - 1 ? liveBowlers : []
  );

  const currentInnIdx = Math.max(0, innings.length - 1);

  return {
    matchId,
    teams: [
      teams.find((t: any) => t.team_id === match?.home_team_id)?.team_name ?? '',
      teams.find((t: any) => t.team_id === match?.away_team_id)?.team_name ?? '',
    ].filter(Boolean).join(' v '),
    status: match?.current_summary ?? live?.status?.text ?? '',
    matchType: match?.international_class_name ?? '',
    currentInnings: currentInnIdx,
    innings,
    currentScore,
    batsmen,
    bowler,
    lastBall,
    currentOverBalls,
    recentBalls,
    partnership,
    ballByBall,
    ground: match?.ground_name ?? '',
    session: live?.break ?? '',
    lead: parseInt(liveInn?.lead ?? '0', 10),
    target: parseInt(liveInn?.target ?? '0', 10),
    remainingBalls: parseInt(liveInn?.remaining_balls ?? '0', 10),
    requiredRunRate: liveInn?.required_run_rate ? parseFloat(liveInn.required_run_rate) : null,
    lastUpdated: new Date(),
    scorecardInnings: null,
    matchInfo: null,
  };
}

export async function fetchScorecard(matchId: string): Promise<{ innings: ScorecardInnings[]; info: MatchInfo }> {
  const html = await fetch(`https://www.espncricinfo.com/ci/engine/match/${matchId}.html`, {
    headers: { ...HEADERS, Accept: 'text/html' },
  }).then(r => r.text());

  const scriptStart = html.indexOf('<script id="__NEXT_DATA__"');
  const scriptEnd = html.indexOf('</script>', scriptStart);
  const raw = html.slice(html.indexOf('{', scriptStart), scriptEnd);
  const data = JSON.parse(raw);

  const content = data?.props?.appPageProps?.data?.data?.content ?? {};
  const matchData = data?.props?.appPageProps?.data?.data?.match ?? {};

  const info: MatchInfo = {
    ground: [matchData?.ground?.longName, matchData?.ground?.country?.name].filter(Boolean).join(', '),
    series: matchData?.series?.longName ?? matchData?.series?.name ?? '',
    matchTitle: matchData?.title ?? '',
    matchType: matchData?.internationalClassId === 1 ? 'Test' :
               matchData?.internationalClassId === 2 ? 'ODI' :
               matchData?.internationalClassId === 3 ? 'T20I' : '',
  };

  const innings: ScorecardInnings[] = (content?.innings ?? []).map((inn: any) => {
    const batsmen: Batsman[] = (inn.inningBatsmen ?? []).map((b: any) => ({
      name: b.player?.longName ?? b.player?.name ?? '',
      runs: b.runs ?? 0,
      balls: b.balls ?? 0,
      fours: b.fours ?? 0,
      sixes: b.sixes ?? 0,
      strikeRate: b.strikerate ?? 0,
      onStrike: false,
      dismissal: b.isOut ? (b.dismissalText?.long ?? b.dismissalText?.short ?? 'out') : 'not out',
      didBat: b.battedType === 'yes',
    }));

    const bowlers: Bowler[] = (inn.inningBowlers ?? []).map((b: any) => ({
      name: b.player?.longName ?? b.player?.name ?? '',
      overs: b.overs ?? 0,
      maidens: b.maidens ?? 0,
      runs: b.conceded ?? 0,
      wickets: b.wickets ?? 0,
      economy: b.economy ?? 0,
    }));

    const fallOfWickets: FallOfWicket[] = (inn.inningFallOfWickets ?? []).map((f: any) => ({
      wicketNum: f.fowWicketNum ?? 0,
      runs: f.fowRuns ?? 0,
      overs: f.fowOvers ?? 0,
      batsmanName: f.dismissalBatsman?.mobileName ?? f.dismissalBatsman?.name ?? '',
    }));

    return {
      inningNumber: inn.inningNumber ?? 0,
      teamName: inn.team?.longName ?? inn.team?.name ?? '',
      runs: inn.runs ?? 0,
      wickets: inn.wickets ?? 0,
      overs: inn.overs ?? 0,
      declared: inn.event === 'declared',
      allOut: inn.wickets === 10,
      extras: inn.extras ?? 0,
      batsmen,
      bowlers,
      fallOfWickets,
    };
  });

  return { innings, info };
}

function parseEngineBall(b: any): BallEvent {
  // ball field is HTML entity &bull; for dot, or a number for runs, or "W" for wicket
  const raw = String(b.ball ?? '');
  const isWicket = raw === 'W' || raw.toLowerCase().includes('w');
  const isFour = raw === '4';
  const isSix = raw === '6';
  const runs = isWicket ? 0 : (parseInt(raw, 10) || 0);
  return {
    over: parseInt(b.over_number ?? '0', 10),
    ball: parseInt(b.ball_number ?? '0', 10),
    description: '',
    runs,
    isWicket,
    isFour,
    isSix,
  };
}

function parseEventRuns(event: string): number {
  if (event === 'Four') return 4;
  if (event === 'Six') return 6;
  const m = event.match(/(\d+)\s*run/i);
  return m ? parseInt(m[1]!, 10) : 0;
}
