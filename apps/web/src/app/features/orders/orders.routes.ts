import type { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const ordersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./order-list.container').then((m) => m.OrderListContainer),
  },
  {
    path: 'new',
    canActivate: [roleGuard('admin', 'ops')],
    loadComponent: () => import('./order-editor.container').then((m) => m.OrderEditorContainer),
  },
  {
    path: ':id',
    loadComponent: () => import('./order-detail.container').then((m) => m.OrderDetailContainer),
  },
];
