import type { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const promotionsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./promotion-list.container').then((m) => m.PromotionListContainer),
  },
  {
    path: 'new',
    canActivate: [roleGuard('admin', 'ops')],
    loadComponent: () => import('./promotion-editor.container').then((m) => m.PromotionEditorContainer),
  },
];
