import { SportModule } from '../types';
import { fetchLiveMatches } from './api';
import CricketMatchView from './CricketMatchView';

export const cricket: SportModule = {
  id: 'cricket',
  label: 'Cricket',
  description: 'Live international cricket — Tests, ODIs and T20Is',
  fetchLiveMatches,
  MatchView: CricketMatchView,
};
