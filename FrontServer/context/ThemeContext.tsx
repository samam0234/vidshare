"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const STORAGE_KEY = "vidshare-theme";

function applyDomTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", t === "light");
  root.classList.remove("dark");
  document.body.classList.toggle("light", t === "light");
}

export function toggleStoredTheme() {
  writeTheme(currentTheme === "dark" ? "light" : "dark");
}

/** Tiny external store so theme can update without setState-in-effect */
let currentTheme: Theme = "dark";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

function writeTheme(t: Theme) {
  currentTheme = t;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, t);
  }
  applyDomTheme(t);
  emit();
}

function subscribe(onStoreChange: () => void) {
  // hydrate from storage on first client subscribe
  if (typeof window !== "undefined") {
    const stored = readTheme();
    if (stored !== currentTheme) {
      currentTheme = stored;
      applyDomTheme(stored);
    }
  }
  listeners.add(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      currentTheme = readTheme();
      applyDomTheme(currentTheme);
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => undefined,
  setTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useLayoutEffect(() => {
    applyDomTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    writeTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    toggleStoredTheme();
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={
          theme === "light"
            ? "theme-light flex min-h-full flex-1 flex-col"
            : "flex min-h-full flex-1 flex-col"
        }
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
