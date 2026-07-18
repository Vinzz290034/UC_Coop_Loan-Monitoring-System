'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-11 h-11" aria-hidden="true" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-full hover:bg-neutral/10 dark:hover:bg-neutral/20 transition-all active:scale-90 flex items-center justify-center text-primary dark:text-secondary focus:outline-none"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      {theme === 'light' ? (
        <Moon className="w-6 h-6 transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Sun className="w-6 h-6 transition-transform duration-300 hover:rotate-45" />
      )}
    </button>
  );
}
