"use client";

import {
  createContext,
  useCallback,
  useContext,
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
  document.documentElement.classList.toggle("light", t === "light");
  document.documentElement.classList.toggle("dark", t === "dark");
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

  const setTheme = useCallback((t: Theme) => {
    writeTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    writeTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
