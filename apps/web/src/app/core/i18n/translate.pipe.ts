import { Pipe, inject, type PipeTransform } from '@angular/core';
import { TranslateService } from './translate.service';

/**
 * Impure on purpose: the active locale is a signal and templates must re-render
 * when it changes. The lookup is a flat map read, so the cost is negligible.
 */
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.translate.instant(key, params);
  }
}
