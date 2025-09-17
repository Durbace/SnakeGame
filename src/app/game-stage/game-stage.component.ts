import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-stage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-stage.component.html',
  styleUrls: ['./game-stage.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class GameStageComponent {
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
}
