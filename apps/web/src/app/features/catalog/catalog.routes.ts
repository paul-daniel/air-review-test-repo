import type { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const catalogRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./product-list.container').then((m) => m.ProductListContainer),
  },
  {
    path: 'new',
    canActivate: [roleGuard('admin', 'ops')],
    loadComponent: () => import('./product-form.container').then((m) => m.ProductFormContainer),
  },
  {
    path: ':id',
    canActivate: [roleGuard('admin', 'ops')],
    loadComponent: () => import('./product-form.container').then((m) => m.ProductFormContainer),
  },
];
