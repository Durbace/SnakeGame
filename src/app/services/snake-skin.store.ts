import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
  private readonly subject = new BehaviorSubject<SnakeSkin>(this.load());
  readonly skin$ = this.subject.asObservable();

  get(): SnakeSkin {
    return this.subject.value;
  }

  set(skin: SnakeSkin) {
    this.persist(skin);
    this.subject.next(skin);
  }

  update(patch: Partial<SnakeSkin>) {
    const next: SnakeSkin = { ...this.subject.value, ...patch };
    this.persist(next);
    this.subject.next(next);
  }

  reset() {
    try { localStorage.removeItem(KEY); } catch {}
    this.subject.next(DEFAULT_SKIN);
  }

  private load(): SnakeSkin {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isSkin(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_SKIN;
  }

  private persist(skin: SnakeSkin) {
    try { localStorage.setItem(KEY, JSON.stringify(skin)); } catch {}
  }
}
