// SearchSelect: a text box that searches an API as you type (debounced)
// and shows a dropdown of matches to pick from. Generic over the item
// type so the same component drives both the customer picker and the
// product picker on the challan create page.

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { inputClasses } from "./Field";

interface SearchSelectProps<T> {
  placeholder: string;
  searchFn: (q: string) => Promise<T[]>;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
  onSelect: (item: T) => void;
}

export function SearchSelect<T>({ placeholder, searchFn, getLabel, getSubLabel, onSelect }: SearchSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    searchFn(debouncedQuery).then((items) => {
      if (!cancelled) setResults(items);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searchFn]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={inputClasses()}
      />
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-paper-raised shadow-raised">
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(item);
                setQuery("");
                setResults([]);
                setIsOpen(false);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-forest-50"
            >
              <span className="text-ink">{getLabel(item)}</span>
              {getSubLabel && <span className="text-xs text-ink-faint">{getSubLabel(item)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
