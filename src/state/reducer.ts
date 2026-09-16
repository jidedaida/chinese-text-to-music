import { DEFAULT_SETTINGS } from '../domain/settings';
import type { GenerationSettings, Score } from '../domain/types';

export type AppPhase =
  | 'idle'
  | 'dirty'
  | 'generating'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'exporting'
  | 'error';

export interface AppState {
  phase: AppPhase;
  text: string;
  settings: GenerationSettings;
  score: Score | null;
  dirty: boolean;
  playheadSeconds: number;
  activeTokenId: string | null;
  volume: number;
  error: string | null;
  notice: string | null;
}

export const initialAppState: AppState = {
  phase: 'idle',
  text: '',
  settings: DEFAULT_SETTINGS,
  score: null,
  dirty: false,
  playheadSeconds: 0,
  activeTokenId: null,
  volume: 0.8,
  error: null,
  notice: null,
};

export type AppAction =
  | { type: 'EDIT_TEXT'; text: string }
  | { type: 'EDIT_SETTINGS'; settings: GenerationSettings }
  | { type: 'GENERATE' }
  | { type: 'GENERATION_SUCCEEDED'; score: Score }
  | { type: 'GENERATION_FAILED'; message: string }
  | { type: 'PLAY' }
  | { type: 'PLAY_FAILED'; message: string }
  | { type: 'PAUSE'; playheadSeconds: number }
  | { type: 'STOP' }
  | { type: 'SEEK'; playheadSeconds: number; tokenId: string | null }
  | { type: 'PLAYHEAD'; playheadSeconds: number; tokenId: string | null }
  | { type: 'EXPORT' }
  | { type: 'EXPORT_FINISHED' }
  | { type: 'EXPORT_FAILED'; message: string }
  | { type: 'VOLUME'; volume: number }
  | { type: 'NOTICE'; message: string | null };

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'EDIT_TEXT':
      return {
        ...state, text: action.text,
        dirty: Boolean(state.score), phase: state.score ? 'dirty' : 'idle', error: null,
      };
    case 'EDIT_SETTINGS':
      return {
        ...state, settings: action.settings,
        dirty: Boolean(state.score), phase: state.score ? 'dirty' : 'idle', error: null,
      };
    case 'GENERATE':
      return { ...state, phase: 'generating', error: null };
    case 'GENERATION_SUCCEEDED':
      return {
        ...state, phase: 'ready', score: action.score,
        dirty: false, playheadSeconds: 0, error: null,
      };
    case 'GENERATION_FAILED':
      return { ...state, phase: 'error', error: action.message };
    case 'PLAY':
      return state.score ? { ...state, phase: 'playing', error: null } : state;
    case 'PLAY_FAILED':
      return { ...state, phase: 'error', error: action.message };
    case 'PAUSE':
      return { ...state, phase: 'paused', playheadSeconds: action.playheadSeconds };
    case 'STOP':
      return {
        ...state,
        phase: state.score ? (state.dirty ? 'dirty' : 'ready') : 'idle',
        playheadSeconds: 0,
        activeTokenId: null,
      };
    case 'SEEK':
      return { ...state, playheadSeconds: action.playheadSeconds, activeTokenId: action.tokenId };
    case 'PLAYHEAD':
      return {
        ...state,
        playheadSeconds: action.playheadSeconds,
        activeTokenId: action.tokenId ?? state.activeTokenId,
      };
    case 'EXPORT':
      return state.score ? { ...state, phase: 'exporting', error: null } : state;
    case 'EXPORT_FINISHED':
      return {
        ...state,
        phase: state.score ? (state.dirty ? 'dirty' : 'ready') : 'idle',
      };
    case 'EXPORT_FAILED':
      return { ...state, phase: 'error', error: action.message };
    case 'VOLUME':
      return { ...state, volume: Math.min(1, Math.max(0, action.volume)) };
    case 'NOTICE':
      return { ...state, notice: action.message };
  }
}
