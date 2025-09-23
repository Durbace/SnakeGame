import { Injectable } from '@angular/core';
import type { SnakeSkin } from '../settings/settings.component';

const KEY = 'snakeSkin';

const DEFAULT_SKIN: SnakeSkin = {
  style: 'stripes',
  base: '#22c55e',
  accent: '#065f46',
  stripeWidth: 6,
};

function isSkin(v: any): v is SnakeSkin {
  return v && ['solid','stripes','gradient'].includes(v.style)
      && typeof v.base === 'string'
      && typeof v.accent === 'string'
      && typeof v.stripeWidth === 'number';
}

@Injectable({ providedIn: 'root' })
export class SnakeSkinStore {
  get(): SnakeSkin {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isSkin(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_SKIN;
  }

  set(skin: SnakeSkin) {
    try { localStorage.setItem(KEY, JSON.stringify(skin)); } catch {}
  }

  reset() {
    try { localStorage.removeItem(KEY); } catch {}
  }
}
