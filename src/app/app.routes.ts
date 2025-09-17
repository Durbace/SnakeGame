import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { GameStageComponent } from './game-stage/game-stage.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Snake — Home' },
  { path: 'play', component: GameStageComponent, title: 'Snake — Play' },
  { path: '**', redirectTo: '' },
];
