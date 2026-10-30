import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Tag } from 'lucide-react';

export interface CatalogItem {
  id: string | number;
  item_name: string;
  description?: string;
  size?: string;
  cost_price: number | string;
  selling_price: number | string;
  category?: string;
  [key: string]: any;
}

interface SalesRegistryItemComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelectItem: (item: CatalogItem) => void;
  catalog: CatalogItem[];
  disabled?: boolean;
  placeholder?: string;
}

export const SalesRegistryItemCombobox: React.FC<SalesRegistryItemComboboxProps> = ({
  value,
  onChange,
  onSelectItem,
  catalog = [],
  disabled = false,
  placeholder = 'Select or type item...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 380,
    openUpward: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Update fixed portal position relative to viewport
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const width = Math.max(rect.width, 380);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left,
      width,
      openUpward
    });
  }, []);

  // Update position on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close when clicking outside both container & portal dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  // Filter catalog items based on user input
  const filteredItems = useMemo(() => {
    if (!catalog || catalog.length === 0) return [];
    const q = (value || '').trim().toLowerCase();
    if (!q) {
      return catalog.slice(0, 50);
    }

    const exactMatches: CatalogItem[] = [];
    const prefixMatches: CatalogItem[] = [];
    const otherMatches: CatalogItem[] = [];

    catalog.forEach(item => {
      const name = (item.item_name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const sz = (item.size || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();

      if (name === q) {
        exactMatches.push(item);
      } else if (name.startsWith(q)) {
        prefixMatches.push(item);
      } else if (name.includes(q) || desc.includes(q) || sz.includes(q) || cat.includes(q)) {
        otherMatches.push(item);
      }
    });

    return [...exactMatches, ...prefixMatches, ...otherMatches].slice(0, 50);
  }, [catalog, value]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      if (filteredItems.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
        e.preventDefault();
        const selected = filteredItems[highlightedIndex];
        onSelectItem(selected);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onFocus={handleOpen}
          onClick={handleOpen}
          onChange={e => {
            onChange(e.target.value);
            if (!isOpen) handleOpen();
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-2 pr-7 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold text-neutral-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              handleOpen();
            }
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          title="Browse Sales Registry"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
            }`}
          />
        </button>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: coords.openUpward ? undefined : coords.top,
            bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: coords.width,
            zIndex: 99999,
          }}
          className="max-h-64 overflow-y-auto bg-white dark:bg-neutral-900 border border-emerald-400 dark:border-emerald-700 rounded-xl shadow-2xl divide-y divide-neutral-100 dark:divide-neutral-800/80 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header pill indicator */}
          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/70 flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/60 sticky top-0 z-10 backdrop-blur-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Sales Registry Catalog ({catalog.length} items)
            </span>
            <span className="text-[9.5px] text-neutral-500 dark:text-neutral-400">
              Auto-fills Cost & Selling
            </span>
          </div>

          <div ref={listRef} className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {filteredItems.length === 0 ? (
              <div className="p-3 text-center text-xs text-neutral-400">
                <p className="font-medium text-neutral-600 dark:text-neutral-300">
                  No matching item found in Sales Registry
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  You can keep typing to record a custom item.
                </p>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const sp = Number(item.selling_price || 0);
                const cp = Number(item.cost_price || 0);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={`${item.id || idx}-${item.item_name}-${item.size}`}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      onSelectItem(item);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isHighlighted
                        ? 'bg-emerald-100/80 dark:bg-emerald-900/60'
                        : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-neutral-900 dark:text-white">
                          {item.item_name}
                        </span>
                        {item.category && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                        {item.description && <span>{item.description}</span>}
                        {item.description && item.size && <span>•</span>}
                        {item.size && (
                          <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.2 rounded text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                            Size: {item.size}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                        ₱{sp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                        Cost: ₱{cp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
