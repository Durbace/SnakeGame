import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-play-start',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './play-start.component.html',
  styleUrls: ['./play-start.component.css'],
})
export class PlayStartComponent {
  @Output() select = new EventEmitter<'classic' | 'speed' | 'challenge'>();

  onPick(mode: 'classic' | 'speed' | 'challenge') {
    this.select.emit(mode);
  }
}
