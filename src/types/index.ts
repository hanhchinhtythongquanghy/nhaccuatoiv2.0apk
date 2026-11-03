export interface Track {
  id: string;
  name: string;
  folder: string;
  title: string;
  artist: string;
  _k: string; // normalized search key
}

export interface VideoItem {
  id: string;
  name: string;
  folder: string;
  mimeType: string;
}

export interface Playlist {
  id: string;
  name: string;
  ids: string[];
}

export interface AppConfig {
  apiKey: string;
  folderId: string;
  clientId: string;
}

export interface PlayerPrefs {
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  volume: number;
  speed: number;
  nameFormat: 'title-artist' | 'artist-title';
  fx: boolean;
  fxType: 'bars' | 'wave' | 'pulse' | 'aurora' | 'particles' | 'random';
  fxVinyl: boolean;
  fxLevel: number;
  offAuto: boolean;
  offWifi: boolean;
  offLimit: number; // in MB (0 = unlimited)
}

export type VisualizerMode = 'bars' | 'wave' | 'pulse' | 'aurora' | 'particles' | 'random';

export type TabView = 'all' | 'videos' | 'folders' | 'favorites' | 'offline' | 'playlists' | 'queue';

export interface SleepTimerState {
  until?: number;
  endOfTrack?: boolean;
}
