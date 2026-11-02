import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService, type UserRole } from '../../core/auth.service';

/** Structural directive: `<button *atlHasRole="['admin', 'ops']">`. */
@Directive({ selector: '[atlHasRole]', standalone: true })
export class HasRoleDirective {
  readonly atlHasRole = input.required<readonly UserRole[]>();

  private readonly auth = inject(AuthService);
  private readonly template = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.hasRole(...this.atlHasRole());
      if (allowed && !this.rendered) {
        this.container.createEmbeddedView(this.template);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.container.clear();
        this.rendered = false;
      }
    });
  }
}
