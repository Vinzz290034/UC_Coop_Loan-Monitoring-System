'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  delay?: number;
  className?: string;
  defaultValue?: string;
}

export default function SearchInput({
  placeholder = "Search...",
  onSearch,
  delay = 400,
  className = "",
  defaultValue = "",
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const onSearchRef = useRef(onSearch);
  const prevValueRef = useRef(defaultValue);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (prevValueRef.current === value) return;

    const handler = setTimeout(() => {
      prevValueRef.current = value;
      onSearchRef.current(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return (
    <div className={`relative flex items-center w-full max-w-md ${className}`}>
      <span className="absolute left-3.5 text-neutral/50 dark:text-neutral/40">
        <Search className="w-4 h-4" />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-outline-variant bg-white dark:bg-surface-container-low text-on-surface dark:text-on-surface rounded-full shadow-sm placeholder:text-neutral/40 focus:outline-none focus:ring-2 focus:ring-secondary/35 focus:border-secondary transition-all font-body text-sm"
      />
    </div>
  );
}
