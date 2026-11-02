import { Injectable, computed, inject, signal } from '@angular/core';
import { ReturnStatus } from '@atlas/shared';
import { firstValueFrom } from 'rxjs';
import type { ReturnDecision, ReturnDto, ReturnListFilter } from './return.models';
import { ReturnsService } from './returns.service';

export const DEFAULT_RETURN_FILTER: ReturnListFilter = {
  status: null,
  customerId: null,
  orderId: null,
  page: 1,
  pageSize: 25,
};

@Injectable({ providedIn: 'root' })
export class ReturnsStore {
  private readonly returnsService = inject(ReturnsService);

  private readonly returns = signal<readonly ReturnDto[]>([]);
  private readonly totalCount = signal(0);
  private readonly currentFilter = signal<ReturnListFilter>(DEFAULT_RETURN_FILTER);
  private readonly loading = signal(false);
  private readonly busyId = signal<string | null>(null);

  readonly items = this.returns.asReadonly();
  readonly total = this.totalCount.asReadonly();
  readonly filter = this.currentFilter.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly busy = this.busyId.asReadonly();

  readonly awaitingDecision = computed(
    () => this.returns().filter((item) => item.status === ReturnStatus.Requested).length,
  );

  async load(filter: Partial<ReturnListFilter> = {}): Promise<void> {
    const next = { ...this.currentFilter(), ...filter };
    this.currentFilter.set(next);
    this.loading.set(true);
    try {
      const page = await firstValueFrom(this.returnsService.list(next));
      this.returns.set(page.items);
      this.totalCount.set(page.total);
    } finally {
      this.loading.set(false);
    }
  }

  async decide(id: string, decision: ReturnDecision): Promise<ReturnDto> {
    return this.run(id, () => this.returnsService.decide(id, decision));
  }

  async markReceived(id: string): Promise<ReturnDto> {
    return this.run(id, () => this.returnsService.markReceived(id));
  }

  async refund(id: string): Promise<ReturnDto> {
    return this.run(id, () => this.returnsService.refund(id));
  }

  upsert(item: ReturnDto): void {
    this.returns.update((list) =>
      list.some((candidate) => candidate.id === item.id)
        ? list.map((candidate) => (candidate.id === item.id ? item : candidate))
        : [item, ...list],
    );
  }

  private async run(id: string, action: () => ReturnType<ReturnsService['refund']>): Promise<ReturnDto> {
    this.busyId.set(id);
    try {
      const updated = await firstValueFrom(action());
      this.upsert(updated);
      return updated;
    } finally {
      this.busyId.set(null);
    }
  }
}
