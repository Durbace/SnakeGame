import { Injectable } from '@angular/core';

type SfxKey = 'button' | 'food' | 'win' | 'lose';

@Injectable({ providedIn: 'root' })
export class SfxService {
  private sfxEnabled = true;
  private sfxVolume = 1.0; 
  private musicVolume = 0.5; 

  private sfx: Record<SfxKey, HTMLAudioElement> = {
    button: new Audio('assets/sfx/button.mp3'),
    food:   new Audio('assets/sfx/food.mp3'),
    win:    new Audio('assets/sfx/win.mp3'),
    lose:   new Audio('assets/sfx/game-over.mp3'),
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

    Object.values(this.sfx).forEach(a => { a.preload = 'auto'; a.load(); });
this.music.preload = 'auto';
this.music.load();   
  }

  getEnabled(): boolean       { return this.sfxEnabled; }
  getSfxVolume(): number      { return this.sfxVolume; }
  getMusicVolume(): number    { return this.musicVolume; }

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

  playButton() { this.play('button'); }
  playFood()   { this.play('food'); }
  playWin()    { this.play('win'); }
  playLose()   { this.play('lose'); }

  startMusic() { if (this.sfxEnabled) this.music.play().catch(() => {}); }
  pauseMusic() { this.music.pause(); }
  resumeMusic(){ if (this.sfxEnabled) this.music.play().catch(() => {}); }
  stopMusic()  { this.music.pause(); this.music.currentTime = 0; }

  private play(k: SfxKey) {
    if (!this.sfxEnabled) return;
    const base = this.sfx[k];
    if (!base) return;
    const a = base.cloneNode(true) as HTMLAudioElement;
    a.volume = this.sfxVolume;
    a.play().catch(() => {});
  }
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, isFinite(n) ? n : 0));
}
