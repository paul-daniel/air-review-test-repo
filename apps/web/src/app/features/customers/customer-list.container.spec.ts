import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from '../../core/notification.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { CustomerListContainer } from './customer-list.container';
import { CustomersService } from './customers.service';

describe('CustomerListContainer', () => {
  const queryParamMap = new BehaviorSubject(convertToParamMap({}));
  const customers = { list: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    customers.list.mockReset().mockReturnValue(of({ items: [{ id: 'cus_1', fullName: 'A', email: 'a@x', tier: 'gold', orderCount: 1, lifetimeValueMinor: 10 }], page: 1, pageSize: 25, total: 1 }));
    TestBed.configureTestingModule({
      imports: [CustomerListContainer],
      providers: [
        { provide: CustomersService, useValue: customers },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap } },
        { provide: NotificationService, useValue: { error: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key, locale: () => 'en' } },
      ],
    });
  });

  it('loads customers from the route query params', () => {
    queryParamMap.next(convertToParamMap({ search: 'a', tier: 'gold', page: '2' }));
    const fixture = TestBed.createComponent(CustomerListContainer);
    fixture.detectChanges();
    expect(customers.list).toHaveBeenCalledWith({ search: 'a', tier: 'gold', page: 2, pageSize: 25 });
  });

  it('navigates to the detail page on selection', () => {
    const fixture = TestBed.createComponent(CustomerListContainer);
    fixture.detectChanges();
    fixture.debugElement.children[0]?.triggerEventHandler('customerSelected', { id: 'cus_1' });
    expect(router.navigate).toHaveBeenCalledWith(['/customers', 'cus_1']);
  });
});
