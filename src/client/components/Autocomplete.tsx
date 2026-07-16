import { useState, useEffect, useRef, useCallback, useId } from 'react';

export interface AutocompleteOption {
  value: number;
  label: string;
  extra?: { defaultPermission?: 'manage' | 'edit' };
}

interface Props {
  placeholder: string;
  onSearch: (query: string) => Promise<AutocompleteOption[]>;
  onSelect: (option: AutocompleteOption) => void;
  onClear: () => void;
  initialValue?: string;
  disabled?: boolean;
}

export default function Autocomplete({
  placeholder,
  onSearch,
  onSelect,
  onClear,
  initialValue = '',
  disabled = false,
}: Props) {
  const listboxId = useId();
  const [query, setQuery] = useState(initialValue);
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length === 0) {
        setOptions([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      try {
        const results = await onSearch(q.trim());
        setOptions(results);
        setIsOpen(results.length > 0);
        setHighlightIndex(-1);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onClear();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (option: AutocompleteOption) => {
    setQuery(option.label);
    onSelect(option);
    setIsOpen(false);
    setOptions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(options[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    setOptions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          ref={inputRef}
          aria-activedescendant={
            highlightIndex >= 0
              ? `${listboxId}-option-${highlightIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          className="form-input"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          role="combobox"
          style={{ flex: 1 }}
        />
        {query && (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleClear}
            aria-label="Wyczyść pole"
          >
            ×
          </button>
        )}
      </div>
      {loading && (
        <div style={{ padding: '4px 8px', fontSize: 12, color: '#888' }}>
          Szukanie…
        </div>
      )}
      {isOpen && options.length > 0 && (
        <ul
          id={listboxId}
          className="autocomplete-dropdown"
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 999,
            maxHeight: 200,
            overflowY: 'auto',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              aria-selected={i === highlightIndex}
              id={`${listboxId}-option-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              role="option"
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                background:
                  i === highlightIndex ? 'var(--accent-muted)' : 'transparent',
                color: 'var(--text)',
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
