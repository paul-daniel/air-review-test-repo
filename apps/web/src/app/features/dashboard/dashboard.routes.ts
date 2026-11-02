import type { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard.container').then((m) => m.DashboardContainer),
  },
];
