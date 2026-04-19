import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/cn';

describe('smoke · infra', () => {
  it('cn resolve conflito entre classes Tailwind', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('cn aplica classe condicional', () => {
    expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold');
  });
});
