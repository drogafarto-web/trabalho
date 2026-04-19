import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitário canônico para compor classes Tailwind com merge inteligente.
 * Uso: cn('px-2', condition && 'px-4') → 'px-4' (tailwind-merge resolve conflito)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
