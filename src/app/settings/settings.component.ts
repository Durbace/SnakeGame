import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent {
  @Input() sfxEnabled = true;
  @Input() musicVolume = 50;

  @Output() sfxToggled = new EventEmitter<boolean>();
  @Output() musicVolumeChange = new EventEmitter<number>();

  onToggleSfx(evt: Event) {
    const checked = (evt.target as HTMLInputElement).checked;
    this.sfxToggled.emit(checked);
  }

  onChangeMusicVol(evt: Event) {
    const vol = +(evt.target as HTMLInputElement).value;
    this.musicVolumeChange.emit(vol);
  }
}
