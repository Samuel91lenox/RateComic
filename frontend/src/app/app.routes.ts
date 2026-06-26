import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Rutas públicas de autenticación
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Rutas protegidas
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'library',
    canActivate: [authGuard],
    loadComponent: () => import('./features/library/library.component').then(m => m.LibraryComponent),
  },
  {
    path: 'media',
    loadComponent: () => import('./features/media/media-list/media-list.component').then(m => m.MediaListComponent),
  },
  {
    path: 'media/:imdbId',
    loadComponent: () => import('./features/media/media-detail/media-detail.component').then(m => m.MediaDetailComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'user/:id',
    loadComponent: () => import('./features/user-profile/user-profile.component').then(m => m.UserProfileComponent),
  },

  // Fallback
  { path: '**', redirectTo: 'home' },
];
