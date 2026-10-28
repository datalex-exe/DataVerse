/* THEME START */
import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'dv-theme';

export function getSavedTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    console.warn('Unable to read theme from localStorage', e);
  }
  return 'system';
}

export function saveTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Unable to save theme to localStorage', e);
  }
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolved === 'dark' ? '#040b0d' : '#faf6ee');
    }
  }
  return resolved;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getSavedTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getSavedTheme()));

  const setMode = useCallback((newMode: ThemeMode) => {
    saveTheme(newMode);
    setModeState(newMode);
    const resolved = applyTheme(newMode);
    setResolvedTheme(resolved);
    window.dispatchEvent(new CustomEvent('dv-theme-change', { detail: { mode: newMode, resolved } }));
  }, []);

  const toggleLightDark = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [resolvedTheme, setMode]);

  const cycleMode = useCallback(() => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const nextIndex = (order.indexOf(mode) + 1) % order.length;
    setMode(order[nextIndex]);
  }, [mode, setMode]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = e.newValue as ThemeMode;
        setModeState(val);
        setResolvedTheme(applyTheme(val));
      }
    };

    const handleCustomChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setModeState(custom.detail.mode);
        setResolvedTheme(custom.detail.resolved);
      }
    };

    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleMediaChange = () => {
      const current = getSavedTheme();
      if (current === 'system') {
        const resolved = applyTheme('system');
        setResolvedTheme(resolved);
        window.dispatchEvent(new CustomEvent('dv-theme-change', { detail: { mode: 'system', resolved } }));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('dv-theme-change', handleCustomChange);
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleMediaChange);
    }

    // Ensure initial sync
    const initialResolved = applyTheme(mode);
    setResolvedTheme(initialResolved);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dv-theme-change', handleCustomChange);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else if (mediaQuery?.removeListener) {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, [mode]);

  return { mode, resolvedTheme, setMode, toggleLightDark, cycleMode };
}

/**
 * Animated Sun/Moon icon button for mobile top bar and Auth screen.
 * Rotates and fades between sun and moon in 300ms using transform & opacity.
 */
export const ThemeIconButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { resolvedTheme, toggleLightDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleLightDark}
      className={`relative w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] border border-transparent hover:border-[var(--line)] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${className}`}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={resolvedTheme === 'dark' ? 'Switch to light mode (Warm Sand)' : 'Switch to dark mode (Aurora Teal)'}
    >
      <div className="theme-icon-container w-5 h-5 relative">
        <Sun className="theme-icon-sun w-5 h-5 text-[var(--gold)]" />
        <Moon className="theme-icon-moon w-5 h-5 text-[var(--accent-2)]" />
      </div>
    </button>
  );
};

/**
 * Sidebar Switch:
 * When expanded: compact switch row with icon, label "Theme", and 3-button segmented control.
 * When collapsed: single icon button cycling modes with tooltip.
 */
export const SidebarThemeSwitch: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => {
  const { mode, resolvedTheme, setMode, cycleMode } = useTheme();

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={cycleMode}
        className="w-full flex items-center justify-center p-3 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-all group active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]"
        aria-label={`Theme: currently ${mode}. Click to cycle mode.`}
        title={`Theme: ${mode} (${resolvedTheme}) - click to cycle`}
      >
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          <div className="theme-icon-container w-5 h-5 relative">
            <Sun className="theme-icon-sun w-5 h-5 text-[var(--gold)]" />
            <Moon className="theme-icon-moon w-5 h-5 text-[var(--accent-2)]" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--input)] border border-[var(--line)] transition-all">
      <div className="flex items-center gap-2.5 text-[var(--text)]">
        <div className="theme-icon-container w-4 h-4 relative">
          <Sun className="theme-icon-sun w-4 h-4 text-[var(--gold)]" />
          <Moon className="theme-icon-moon w-4 h-4 text-[var(--accent-2)]" />
        </div>
        <span className="text-xs font-semibold tracking-wide select-none">Theme</span>
      </div>

      {/* Segmented Control: Light / Dark / System */}
      <div 
        role="radiogroup" 
        aria-label="Theme mode selector"
        className="flex items-center bg-[color-mix(in_srgb,var(--side)_80%,transparent)] p-0.5 rounded-lg border border-[var(--line)]"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'light'}
          aria-label="Switch to light mode"
          title="Light (Warm Sand)"
          onClick={() => setMode('light')}
          className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
            mode === 'light'
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]`}
        >
          <Sun className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={mode === 'dark'}
          aria-label="Switch to dark mode"
          title="Dark (Aurora Teal)"
          onClick={() => setMode('dark')}
          className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
            mode === 'dark'
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]`}
        >
          <Moon className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={mode === 'system'}
          aria-label="Follow system theme"
          title="System theme"
          onClick={() => setMode('system')}
          className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
            mode === 'system'
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)]`}
        >
          <Laptop className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Settings Page Theme Control (3-way segmented control for settings pane)
 */
export const SettingsThemeControl: React.FC = () => {
  const { mode, setMode } = useTheme();

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 shadow-[var(--shadow-card)] space-y-5">
      <div className="border-b border-[var(--line)] pb-3">
        <h3 className="text-[16px] font-semibold text-[var(--text)]">Appearance & Color Theme</h3>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">Choose between Aurora Teal (Dark), Warm Sand (Light), or match your System settings.</p>
      </div>

      <div 
        role="radiogroup" 
        aria-label="Color theme" 
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1"
      >
        {/* Light Card */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'light'}
          onClick={() => setMode('light')}
          className={`relative p-6 rounded-[16px] border flex flex-col items-center justify-center gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${
            mode === 'light'
              ? 'border-[var(--accent-2)] ring-2 ring-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--card))] text-[var(--text)] shadow-sm'
              : 'border-[var(--line)] bg-[var(--input)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          }`}
        >
          {mode === 'light' && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent-2)] text-[var(--on-accent)] flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </div>
          )}
          <div className="w-12 h-12 rounded-[14px] bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[var(--gold)] flex items-center justify-center">
            <Sun className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="text-center">
            <span className="text-[15px] font-semibold text-[var(--text)] block">Light</span>
            <span className="text-[12px] text-[var(--muted)] block mt-0.5">Warm Sand</span>
          </div>
        </button>

        {/* Dark Card */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'dark'}
          onClick={() => setMode('dark')}
          className={`relative p-6 rounded-[16px] border flex flex-col items-center justify-center gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${
            mode === 'dark'
              ? 'border-[var(--accent-2)] ring-2 ring-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--card))] text-[var(--text)] shadow-sm'
              : 'border-[var(--line)] bg-[var(--input)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          }`}
        >
          {mode === 'dark' && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent-2)] text-[var(--on-accent)] flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </div>
          )}
          <div className="w-12 h-12 rounded-[14px] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent-2)] flex items-center justify-center">
            <Moon className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="text-center">
            <span className="text-[15px] font-semibold text-[var(--text)] block">Dark</span>
            <span className="text-[12px] text-[var(--muted)] block mt-0.5">Aurora Teal</span>
          </div>
        </button>

        {/* System Card */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'system'}
          onClick={() => setMode('system')}
          className={`relative p-6 rounded-[16px] border flex flex-col items-center justify-center gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-2)] ${
            mode === 'system'
              ? 'border-[var(--accent-2)] ring-2 ring-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--card))] text-[var(--text)] shadow-sm'
              : 'border-[var(--line)] bg-[var(--input)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          }`}
        >
          {mode === 'system' && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent-2)] text-[var(--on-accent)] flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[2.5]" />
            </div>
          )}
          <div className="w-12 h-12 rounded-[14px] bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] text-[var(--muted)] flex items-center justify-center">
            <Laptop className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="text-center">
            <span className="text-[15px] font-semibold text-[var(--text)] block">System</span>
            <span className="text-[12px] text-[var(--muted)] block mt-0.5">Match device</span>
          </div>
        </button>
      </div>
    </div>
  );
};
/* THEME END */
