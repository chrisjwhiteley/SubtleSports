import { SportModule } from './types';
import { cricket } from './cricket';
import { tennis } from './tennis';

// Registry of every sport the app supports. Add a module here to make it appear
// in the sport picker.
export const SPORTS: SportModule[] = [cricket, tennis];

export type { SportModule };
