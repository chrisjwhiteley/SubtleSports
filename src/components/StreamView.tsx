import React from 'react';
import { Box, Text, useInput } from 'ink';
import { MatchState, Config, DetailView } from '../types';

interface Props {
  state: MatchState;
  config: Config;
  onDetail: (view: DetailView) => void;
}

function formatBall(b: NonNullable<MatchState['lastBall']>): string {
  if (b.isWicket) return 'W';
  if (b.isSix) return '6';
  if (b.isFour) return '4';
  if (b.runs === 0) return '.';
  return String(b.runs);
}

function situationLine(state: MatchState): string {
  const { lead, target, remainingBalls, requiredRunRate, currentScore, matchType } = state;
  const team = currentScore?.teamName ?? '';

  // No situation to show in the first innings
  if (state.innings.length < 2) return '';

  const isLimitedOvers = /T20|ODI|One.Day/i.test(matchType);

  if (target > 0) {
    // Chasing innings
    const runsNeeded = target - (currentScore?.score ?? 0);
    if (runsNeeded <= 0) return '';  // match over, status text covers it
    if (isLimitedOvers && remainingBalls > 0) {
      const rrStr = requiredRunRate != null ? `  rr needed: ${requiredRunRate.toFixed(2)}` : '';
      return `${team} require ${runsNeeded} from ${remainingBalls} balls${rrStr}`;
    }
    return `${team} require ${runsNeeded} runs`;
  }

  // Not chasing — show lead/deficit
  if (lead < 0) return `${team} trail by ${Math.abs(lead)}`;
  if (lead > 0) return `${team} lead by ${lead}`;
  return '';
}

export default function StreamView({ state, onDetail }: Props) {
  useInput((input) => {
    if (input === 's') onDetail('scorecard');
    if (input === 'b') onDetail('ballbyball');
    if (input === 'p') onDetail('partnership');
  });

  const { currentScore, batsmen, bowler, currentOverBalls, session, status, ground } = state;
  const situation = situationLine(state);
  const overBalls = currentOverBalls;
  const lastBallIdx = overBalls.length - 1;

  return (
    <Box flexDirection="column" gap={1}>
      {/* Score + situation */}
      <Box flexDirection="column">
        {currentScore && (
          <Text>
            {currentScore.teamName}  {currentScore.score}/{currentScore.wickets}
            {currentScore.declared ? 'd' : ''}
            {'  '}({currentScore.overs} ov)
          </Text>
        )}
        {situation !== '' && <Text dimColor>{situation}</Text>}
        {status !== '' && <Text dimColor>{status}</Text>}
        {session !== '' && <Text dimColor>{session}</Text>}
        {ground !== '' && <Text dimColor>{ground}</Text>}
      </Box>

      {/* Live batting */}
      <Box flexDirection="column">
        {batsmen.map(b => (
          <Text key={b.name}>
            {b.onStrike ? '* ' : '  '}{b.name}  {b.runs} ({b.balls})
          </Text>
        ))}
      </Box>

      {/* Bowler + this over */}
      <Box flexDirection="column">
        {bowler && (
          <Text dimColor>
            {bowler.name}  {bowler.overs}-{bowler.maidens}-{bowler.runs}-{bowler.wickets}
          </Text>
        )}
        {overBalls.length > 0 && (
          <Box>
            <Text dimColor>this over:  </Text>
            {overBalls.map((b, i) => {
              const label = formatBall(b);
              const isLast = i === lastBallIdx;
              return (
                <Text key={i} bold={isLast} dimColor={!isLast}>
                  {label}{i < overBalls.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
