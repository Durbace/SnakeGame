import { Injectable } from '@angular/core';

type SfxKey = 'button' | 'food' | 'win' | 'lose';

@Injectable({ providedIn: 'root' })
export class SfxService {
  private sfxEnabled = true;
  private sfxVolume = 1.0;
  private musicVolume = 0.5;
  private resumeOnGestureBound = this.resumeOnGesture.bind(this);
  private waitingForGesture = false;
  private sfxGateUntil = 0; 
  private musicPlayInFlight = false;

  private sfx: Record<SfxKey, HTMLAudioElement> = {
    button: new Audio('assets/sfx/button.mp3'),
    food: new Audio('assets/sfx/food.mp3'),
    win: new Audio('assets/sfx/win.mp3'),
    lose: new Audio('assets/sfx/game-over.mp3'),
  };

  private music = new Audio('assets/sfx/game-music.mp3');

  constructor() {
    const se = localStorage.getItem('sfxEnabled');
    const sv = localStorage.getItem('sfxVolume');
    const mv = localStorage.getItem('musicVolume');

    if (se !== null) this.sfxEnabled = se === 'true';
    if (sv !== null) this.sfxVolume = clamp01(parseFloat(sv));
    if (mv !== null) this.musicVolume = clamp01(parseFloat(mv));

    this.music.loop = true;
    this.music.volume = this.musicVolume;

    Object.values(this.sfx).forEach((a) => {
      a.preload = 'auto';
      a.load();
    });
    this.music.preload = 'auto';
    this.music.load();
  }

  getEnabled(): boolean {
    return this.sfxEnabled;
  }
  getSfxVolume(): number {
    return this.sfxVolume;
  }
  getMusicVolume(): number {
    return this.musicVolume;
  }

  setEnabled(enabled: boolean) {
    this.sfxEnabled = !!enabled;
    localStorage.setItem('sfxEnabled', String(this.sfxEnabled));
    if (!this.sfxEnabled) this.stopMusic();
  }
  setMusicVolume(v01: number) {
    this.musicVolume = clamp01(v01);
    localStorage.setItem('musicVolume', String(this.musicVolume));
    this.music.volume = this.musicVolume;
  }
  setSfxVolume(v01: number) {
    this.sfxVolume = clamp01(v01);
    localStorage.setItem('sfxVolume', String(this.sfxVolume));
  }

  playButton() {
    this.play('button');
  }
  playFood() {
    this.play('food');
  }
  playWin() {
    this.play('win');
  }
  playLose() {
    this.play('lose');
  }

  async playMusic(): Promise<void> {
  if (!this.sfxEnabled) return;

  if (this.music && !this.music.paused) {
    this.detachGestureResume();
    return;
  }

  this.musicPlayInFlight = true;
  try {
    if (this.music && this.music.paused) {
      await this.music.play();
    } else {
      await this.startMusic(); 
    }
    this.sfxGateUntil = performance.now() + 200;
    this.detachGestureResume();
  } catch {
    this.attachGestureResume();
  } finally {
    this.musicPlayInFlight = false;
  }
}

startMusic() {
  if (!this.sfxEnabled) return;
  return this.music.play();
}


  pauseMusic() {
    this.music.pause();
    this.detachGestureResume();
  }

  resumeMusic() {
    return this.playMusic();
  }

  stopMusic() {
    this.music.pause();
    this.music.currentTime = 0;
    this.detachGestureResume();
  }

  private attachGestureResume() {
    if (this.waitingForGesture) return;
    this.waitingForGesture = true;
    window.addEventListener('pointerdown', this.resumeOnGestureBound, {
      once: true,
      capture: true,
    });
    window.addEventListener('keydown', this.resumeOnGestureBound, {
      once: true,
      capture: true,
    });
    window.addEventListener('touchstart', this.resumeOnGestureBound, {
      once: true,
      capture: true,
      passive: true,
    });
  }

  private detachGestureResume() {
    if (!this.waitingForGesture) return;
    this.waitingForGesture = false;
    window.removeEventListener(
      'pointerdown',
      this.resumeOnGestureBound,
      true as any
    );
    window.removeEventListener(
      'keydown',
      this.resumeOnGestureBound,
      true as any
    );
    window.removeEventListener(
      'touchstart',
      this.resumeOnGestureBound,
      true as any
    );
  }

  private resumeOnGesture() {
    this.playMusic();
  }

  private async play(k: SfxKey) {
    if (!this.sfxEnabled) return;

    if (performance.now() < this.sfxGateUntil || this.musicPlayInFlight) return;

    const el = this.sfx[k];
    if (!el) return;

    try {
      el.pause();
      el.currentTime = 0;
      el.volume = this.sfxVolume;
      await el.play();
    } catch {
    }
  }
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, isFinite(n) ? n : 0));
}
