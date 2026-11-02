import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CUSTOMER_TIERS } from '@atlas/shared';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import type { Customer, CustomerFormValue, CustomerTier } from './customer.models';

@Component({
  selector: 'atl-customer-detail-presenter',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-detail.presenter.html',
})
export class CustomerDetailPresenter {
  readonly customer = input.required<Customer | null>();
  readonly saving = input(false);
  readonly canEdit = input(false);
  readonly canDelete = input(false);

  readonly save = output<CustomerFormValue>();
  readonly delete = output<void>();
  readonly viewOrders = output<void>();

  protected readonly tiers = CUSTOMER_TIERS;
  protected readonly confirmOpen = signal(false);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    tier: new FormControl<CustomerTier>('standard', { nonNullable: true }),
    marketingOptIn: new FormControl(false, { nonNullable: true }),
    billingAddress: new FormGroup({
      line1: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      line2: new FormControl('', { nonNullable: true }),
      postalCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      countryCode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Z]{2}$/)] }),
    }),
  });

  constructor() {
    effect(() => {
      const customer = this.customer();
      if (!customer) return;
      this.form.reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        tier: customer.tier,
        marketingOptIn: customer.marketingOptIn,
        billingAddress: { ...customer.billingAddress, line2: customer.billingAddress.line2 ?? '' },
      });
    });
    effect(() => {
      if (this.canEdit() && !this.saving()) {
        this.form.enable({ emitEvent: false });
      } else {
        this.form.disable({ emitEvent: false });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const { line2, ...address } = raw.billingAddress;
    this.save.emit({
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      tier: raw.tier,
      marketingOptIn: raw.marketingOptIn,
      billingAddress: line2.trim() ? { ...address, line2: line2.trim() } : address,
    });
  }

  protected confirmDelete(): void {
    this.confirmOpen.set(false);
    this.delete.emit();
  }
}
