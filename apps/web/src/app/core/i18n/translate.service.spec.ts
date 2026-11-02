import { describe, expect, it } from 'vitest';
import { flatten, interpolate } from './translate.service';

describe('translate helpers', () => {
  it('flattens nested dictionaries into dotted keys', () => {
    expect(flatten({ orders: { list: { title: 'Orders', empty: 'None' } }, nav: { home: 'Home' } })).toEqual({
      'orders.list.title': 'Orders',
      'orders.list.empty': 'None',
      'nav.home': 'Home',
    });
  });

  it('interpolates named parameters and keeps unknown placeholders', () => {
    expect(interpolate('{{count}} items for {{ name }}', { count: 3, name: 'Amélie' })).toBe('3 items for Amélie');
    expect(interpolate('Hello {{who}}', {})).toBe('Hello {{who}}');
  });
});
