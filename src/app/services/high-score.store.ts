import { Injectable } from '@angular/core';

type Mode = 'classic' | 'speed' | 'challenge';
const KEY = 'highScores:v1';

export interface HighScores {
  classic: number;
  speed: number;
  challenge: number;
}

const DEFAULT: HighScores = { classic: 0, speed: 0, challenge: 0 };

@Injectable({ providedIn: 'root' })
export class HighScoreStore {
  private load(): HighScores {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT };
      const parsed = JSON.parse(raw) as Partial<HighScores>;
      return { ...DEFAULT, ...parsed };
    } catch { return { ...DEFAULT }; }
  }
  private save(val: HighScores) {
    try { localStorage.setItem(KEY, JSON.stringify(val)); } catch {}
  }

  get(mode: Mode): number {
    const all = this.load();
    return all[mode] ?? 0;
  }
  set(mode: Mode, value: number) {
    const all = this.load();
    if (value > (all[mode] ?? 0)) {
      all[mode] = value;
      this.save(all);
    }
  }
  resetAll() { this.save({ ...DEFAULT }); }
}
