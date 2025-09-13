import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type PlayDifficulty = 'easy' | 'normal' | 'hard';

@Component({
  selector: 'app-play-start',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './play-start.component.html',
  styleUrls: ['./play-start.component.css'],
})
export class PlayStartComponent {
  @Input() difficulty: PlayDifficulty = 'normal';
  @Input() wrapEdges = false;

  @Input() gridSize = 24;
  @Input() startingLength = 4;
  @Input() startingSpeed = 5;

  @Output() start = new EventEmitter<{
    difficulty: PlayDifficulty;
    wrapEdges: boolean;
    gridSize: number;
    startingLength: number;
    startingSpeed: number;
  }>();

  applyPreset(d: PlayDifficulty) {
    this.difficulty = d;
    if (d === 'easy') {
      this.startingSpeed = 3;
      this.gridSize = Math.max(this.gridSize, 24);
      this.startingLength = 4;
      this.wrapEdges = true;
    } else if (d === 'normal') {
      this.startingSpeed = 5;
      this.gridSize = 24;
      this.startingLength = 4;
      this.wrapEdges = false;
    } else {
      this.startingSpeed = 7;
      this.gridSize = Math.min(this.gridSize, 22);
      this.startingLength = 5;
      this.wrapEdges = false;
    }
  }

  onStart() {
    this.start.emit({
      difficulty: this.difficulty,
      wrapEdges: this.wrapEdges,
      gridSize: this.gridSize,
      startingLength: this.startingLength,
      startingSpeed: this.startingSpeed,
    });
  }
}
