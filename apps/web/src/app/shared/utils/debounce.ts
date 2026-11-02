import { debounceTime, distinctUntilChanged, map, type OperatorFunction } from 'rxjs';

export const SEARCH_DEBOUNCE_MS = 300;

/** Standard search-box pipeline: trim, debounce, dedupe. */
export function searchTerm(delayMs = SEARCH_DEBOUNCE_MS): OperatorFunction<string | null | undefined, string> {
  return (source) =>
    source.pipe(
      map((value) => (value ?? '').trim()),
      debounceTime(delayMs),
      distinctUntilChanged(),
    );
}
