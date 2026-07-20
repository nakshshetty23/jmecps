'use client';

import { useTheme } from './ThemeContext';
import { useState, useRef, useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    {
      value: 'light',
      label: 'LIGHT',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" strokeWidth={2} />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth={2} strokeLinecap="round" />
        </svg>
      )
    },
    {
      value: 'dark',
      label: 'DARK',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      value: 'system',
      label: 'SYSTEM',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
          <path d="M8 21h8M12 17v4" strokeWidth={2} strokeLinecap="round" />
        </svg>
      )
    }
  ] as const;

  const currentOption = themeOptions.find(opt => opt.value === theme) || themeOptions[2];

  return (
    <div className="relative font-mono text-xs" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 border border-border bg-card text-text hover:border-primary transition-none hover:bg-background uppercase tracking-widest focus:outline-none h-9 min-w-[100px] cursor-default"
      >
        <span className="mr-1">{currentOption.icon}</span>
        <span>{currentOption.label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 bg-card border border-border z-50 shadow-2xl">
          <ul className="flex flex-col py-1">
            {themeOptions.map((opt) => (
              <li key={opt.value}>
                <button
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-background hover:text-accent transition-none flex items-center cursor-default ${
                    theme === opt.value ? 'text-primary font-bold bg-background' : 'text-text'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
