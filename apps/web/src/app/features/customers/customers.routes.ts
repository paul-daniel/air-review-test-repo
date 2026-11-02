import type { Routes } from '@angular/router';

export const customersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./customer-list.container').then((m) => m.CustomerListContainer),
  },
  {
    path: ':id',
    loadComponent: () => import('./customer-detail.container').then((m) => m.CustomerDetailContainer),
  },
];
