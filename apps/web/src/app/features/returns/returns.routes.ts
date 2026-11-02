import type { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const returnsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./return-list.container').then((m) => m.ReturnListContainer),
  },
  {
    path: 'new/:orderId',
    canActivate: [roleGuard('admin', 'ops', 'support')],
    loadComponent: () => import('./return-request.container').then((m) => m.ReturnRequestContainer),
  },
];
