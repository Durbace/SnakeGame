import { Component, EventEmitter, Input, Output, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameClassicComponent } from '../game-play/game-classic/game-classic.component';

@Component({
  selector: 'app-game-stage',
  standalone: true,
  imports: [CommonModule, GameClassicComponent],
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

  @Output() home = new EventEmitter<void>();
  @Output() howTo = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() pauseToggle = new EventEmitter<void>();

  mode: 'classic' | 'speed' | 'challenge' | null = null;
  settings: any = null;

  constructor(private router: Router) {}

  ngOnInit() {
    const st = this.router.getCurrentNavigation()?.extras?.state ?? window.history.state;
    this.mode = st?.mode ?? null;
    this.settings = st?.settings ?? null;
  }
}
