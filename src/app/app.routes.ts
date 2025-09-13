import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SnakeComponent } from './snake/snake.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Snake — Home' },
  { path: 'play', component: SnakeComponent, title: 'Snake — Play' },
  { path: '**', redirectTo: '' },
];
