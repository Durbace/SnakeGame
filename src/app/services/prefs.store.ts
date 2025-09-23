import { Injectable } from '@angular/core';

const KEY = 'prefs:v1';

export interface AudioPrefs {
  sfxEnabled: boolean;
  musicVolume: number;
}
export interface ClassicSettings {
  gridSize: number;
  wrapEdges: boolean;
  startingLength: number;
  startingSpeed: number;
}
export interface SpeedSettings {
  startingSpeed: number;
  accelRate: number;
  timeAttackSec: number;
  obstaclesOn: boolean;
  obstaclePreset?: 'easy' | 'medium' | 'hard';
  obstacleDensity?: number;
  gridSize: number;
  wrapEdges: boolean;
  startingLength: number;
}
export interface ChallengeGoals {
  targetFruits: number;
  targetTime: number;
  wallsAllowed: boolean;
}
export interface ChallengeBundle {
  settings: ClassicSettings;
  goals: ChallengeGoals;
}

export type Mode = 'classic' | 'speed' | 'challenge';

export interface PrefsState {
  audio: AudioPrefs;
  classic?: ClassicSettings;
  speed?: SpeedSettings;
  challenge?: ChallengeBundle;
  lastMode?: Mode;
}

const DEFAULT: PrefsState = {
  audio: { sfxEnabled: true, musicVolume: 50 },
};

@Injectable({ providedIn: 'root' })
export class PrefsStore {
  private read(): PrefsState {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT };
      const parsed = JSON.parse(raw) as Partial<PrefsState>;
      return { ...DEFAULT, ...parsed };
    } catch {
      return { ...DEFAULT };
    }
  }
  private write(state: PrefsState) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  getAudio(): AudioPrefs {
    return this.read().audio;
  }
  setAudio(p: AudioPrefs) {
    const s = this.read();
    s.audio = p;
    this.write(s);
  }

  getClassic(): ClassicSettings | undefined {
    return this.read().classic;
  }
  setClassic(v: ClassicSettings) {
    const s = this.read();
    s.classic = v;
    this.write(s);
  }

  getSpeed(): SpeedSettings | undefined {
    return this.read().speed;
  }
  setSpeed(v: SpeedSettings) {
    const s = this.read();
    s.speed = v;
    this.write(s);
  }

  getChallenge(): ChallengeBundle | undefined {
    return this.read().challenge;
  }
  setChallenge(v: ChallengeBundle) {
    const s = this.read();
    s.challenge = v;
    this.write(s);
  }

  getLastMode(): Mode | undefined {
    return this.read().lastMode;
  }
  setLastMode(m: Mode) {
    const s = this.read();
    s.lastMode = m;
    this.write(s);
  }
}
