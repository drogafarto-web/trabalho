import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Option {
  id: string;
  name: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  options: Option[];
  value: Option | null;
  onChange: (opt: Option | null) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

/**
 * Combobox com busca fuzzy simples — o aluno digita parte do nome e vê
 * sugestões. Mobile-friendly, teclado acessível.
 */
export function NameCombobox({
  label,
  placeholder = 'Digite seu nome',
  options,
  value,
  onChange,
  disabled,
  emptyMessage = 'Nenhum resultado',
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlight, setHighlight] = useState(0);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const filtered = options.filter((o) =>
    normalize(o.name).includes(normalize(search)),
  );

  const selectOption = (opt: Option) => {
    onChange(opt);
    setSearch('');
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) selectOption(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="w-full" ref={rootRef}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary"
        >
          {label}
        </label>
      )}

      {value ? (
        <div className="flex items-center justify-between rounded-sm border border-border bg-bg px-3 py-2">
          <span className="text-sm">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-text-muted hover:text-text"
            aria-label="Limpar"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'h-10 w-full rounded-sm border border-border bg-bg pl-9 pr-9 text-sm',
              'placeholder:text-text-muted',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
          <ChevronDown className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-text-muted" />

          {open && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-sm border border-border bg-bg-surface shadow-elevated"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-text-muted">{emptyMessage}</li>
              ) : (
                filtered.map((opt, idx) => (
                  <li
                    key={opt.id}
                    role="option"
                    aria-selected={idx === highlight}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectOption(opt);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                      idx === highlight
                        ? 'bg-bg-surface-hi text-text'
                        : 'text-text-secondary',
                    )}
                  >
                    {opt.name}
                    {idx === highlight && <Check className="h-3.5 w-3.5 text-text-muted" />}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Normaliza: remove acentos e uppercase. Boa pra busca fuzzy.
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}
