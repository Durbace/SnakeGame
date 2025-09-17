import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameClassicComponent } from '../game-play/game-classic/game-classic.component';
import { HowToPlayComponent } from '../how-to-play/how-to-play.component';

@Component({
  selector: 'app-game-stage',
  standalone: true,
  imports: [CommonModule, GameClassicComponent, HowToPlayComponent],
  templateUrl: './game-stage.component.html',
  styleUrls: ['./game-stage.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class GameStageComponent implements OnInit {
  @Input() title = 'Retro Snake';
  @Input() score = 0;
  @Input() highScore = 0;
  @Input() difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  @Input() gameSpeed = 1;
  @Input() paused = false;

  @Output() howTo = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() pauseToggle = new EventEmitter<void>();

  mode: 'classic' | 'speed' | 'challenge' | null = null;
  settings: any = null;

  @ViewChild(GameClassicComponent) gameRef?: GameClassicComponent;

  showHowTo = false;
  private wasPausedBeforeHowTo = false;

  constructor(private router: Router) {}

  ngOnInit() {
    const st = this.router.getCurrentNavigation()?.extras?.state ?? window.history.state;
    this.mode = st?.mode ?? null;
    this.settings = st?.settings ?? null;
  }

  onClickHome() {
    this.router.navigate(['/']);
  }

 onClickHowTo() {
    if (!this.paused) {
      this.paused = true;
      this.pauseToggle.emit();
      this.gameRef?.setPaused(true);
    }
    this.showHowTo = true; 
    this.howTo.emit();
  }

  closeHowTo() {
    this.showHowTo = false;
  }

  onClickRestart() {
    this.paused = false;
    this.gameRef?.setPaused(false);
    this.restart.emit();
    this.gameRef?.restart();
    this.score = 0;
  }

  onClickPauseToggle() {
    if (this.showHowTo) return;
    this.paused = !this.paused;
    this.pauseToggle.emit();
    this.gameRef?.setPaused(this.paused);
  }

  handleScoreChange(val: number) {
    this.score = val;
    if (this.score > this.highScore) this.highScore = this.score;
  }
  handleHighScoreChange(val: number) { this.highScore = val; }
  handleSpeedChange(val: number) { this.gameSpeed = val; }

  handleGameOver() {
    this.paused = true;
    this.gameRef?.setPaused(true);
  }

  handleRequestedRestart() {
    this.onClickRestart();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (this.showHowTo) {
      if (key === 'escape') this.closeHowTo();
      e.preventDefault();
      return;
    }

    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    if (key === ' ') { this.onClickPauseToggle(); return; }
    if (key === 'r') { this.onClickRestart(); return; }

    this.gameRef?.handleKey(e.key);
  }

  handleResumeRequested() {
  if (this.showHowTo) return; 
  if (this.paused) this.onClickPauseToggle(); 
}
}
