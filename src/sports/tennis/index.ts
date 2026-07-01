import { SportModule } from '../types';
import { fetchLiveMatches } from './api';
import TennisMatchView from './TennisMatchView';

export const tennis: SportModule = {
  id: 'tennis',
  label: 'Tennis',
  description: 'Live ATP & WTA — Grand Slams first',
  fetchLiveMatches,
  MatchView: TennisMatchView,
};
