import { AfterViewInit, Directive, ElementRef, inject, input } from '@angular/core';

@Directive({ selector: '[atlAutofocus]', standalone: true })
export class AutofocusDirective implements AfterViewInit {
  readonly atlAutofocus = input<boolean | ''>('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    if (this.atlAutofocus() === false) return;
    queueMicrotask(() => this.host.nativeElement.focus());
  }
}
