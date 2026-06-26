import { useState, useRef, useEffect, useMemo } from 'react';
import type { Category } from '../types/category';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface CategoryDropdownProps {
  categories: Category[];
  value: number | '';
  onChange: (val: number | '') => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export default function CategoryDropdown({
  categories,
  value,
  onChange,
  placeholder = 'Wybierz kategorię',
  allowEmpty = true,
  emptyLabel = 'Brak',
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const childrenMap = useMemo(() => {
    const map = new Map<number | null, Category[]>();
    map.set(null, []);
    categories.forEach((c) => map.set(c.id, []));
    categories.forEach((c) => {
      const p = c.parentId ?? null;
      if (map.has(p)) map.get(p)!.push(c);
      else map.set(p, [c]);
    });
    return map;
  }, [categories]);

  const currentLevelCategories = childrenMap.get(currentParentId) || [];
  const currentParentObj = currentParentId
    ? categories.find((c) => c.id === currentParentId)
    : null;

  const handleSelect = (val: number | '') => {
    onChange(val);
    setIsOpen(false);
  };

  const handleDrillDown = (e: React.MouseEvent, catId: number) => {
    e.stopPropagation();
    setCurrentParentId(catId);
  };

  const handleGoUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentParentObj) {
      setCurrentParentId(currentParentObj.parentId ?? null);
    }
  };

  const selectedCategoryObj =
    value !== '' ? categories.find((c) => c.id === value) : null;
  const displayValue = selectedCategoryObj
    ? selectedCategoryObj.name
    : allowEmpty
      ? emptyLabel
      : placeholder;

  return (
    <div
      ref={wrapperRef}
      className="category-dropdown"
      style={{ position: 'relative', width: '100%' }}
    >
      <button
        type="button"
        className="form-input"
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayValue}
        </span>
        <span style={{ opacity: 0.5, fontSize: '0.8em' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            marginTop: 4,
            boxShadow: 'var(--shadow-lg)',
            maxHeight: 300,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {currentParentId !== null && (
            <>
              <button
                type="button"
                onClick={handleGoUp}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: 'var(--surface)',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <ChevronLeft size={16} /> <span>Wróć</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect(currentParentId)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontWeight: 'bold',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = 'var(--accent-muted)')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <span>Wybrana kategoria: {currentParentObj?.name}</span>
                {value === currentParentId && (
                  <Check size={16} className="text-primary" />
                )}
              </button>
            </>
          )}

          {currentParentId === null && allowEmpty && (
            <button
              type="button"
              onClick={() => handleSelect('')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = 'var(--accent-muted)')
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <span>{emptyLabel}</span>
              {value === '' && <Check size={16} className="text-primary" />}
            </button>
          )}

          {currentLevelCategories.length === 0 ? (
            <div
              style={{
                padding: '8px 12px',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              Brak podkategorii
            </div>
          ) : (
            currentLevelCategories.map((cat) => {
              const hasChildren = (childrenMap.get(cat.id)?.length ?? 0) > 0;
              const isSelected = value === cat.id;

              return (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    width: '100%',
                    background: 'transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(cat.id)}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = 'var(--accent-muted)')
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <span style={{ flex: 1 }}>{cat.name}</span>
                    {isSelected && <Check size={16} className="text-primary" />}
                  </button>

                  {hasChildren && (
                    <button
                      type="button"
                      onClick={(e) => handleDrillDown(e, cat.id)}
                      style={{
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        borderLeft: '1px solid var(--border)',
                      }}
                      title="Pokaż podkategorie"
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          'var(--accent-muted)')
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
