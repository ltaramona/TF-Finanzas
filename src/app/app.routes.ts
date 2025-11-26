import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { MenuComponent } from './menu/menu';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'menu', component: MenuComponent }
];
