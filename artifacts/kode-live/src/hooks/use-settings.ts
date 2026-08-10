import { useState, useEffect } from "react";

export interface AppSettings {
  // Agent
  model: string;
  maxTokens: string;
  lang: string;
  autoRun: boolean;
  streaming: boolean;
  // Editor
  fontSize: string;
  tabSize: string;
  theme: string;
  autoSave: boolean;
  minimap: boolean;
  wordWrap: boolean;
}

const DEFAULTS: AppSettings = {
  model: "claude-sonnet-4-5",
  maxTokens: "8192",
  lang: "mn",
  autoRun: true,
  streaming: true,
  fontSize: "13",
  tabSize: "2",
  theme: "dark",
  autoSave: true,
  minimap: false,
  wordWrap: true,
};

const KEY = "kodu_settings";

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(s: AppSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

// Global listeners so multiple components update when settings change
const listeners = new Set<() => void>();

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(load);

  useEffect(() => {
    const notify = () => setSettingsState(load());
    listeners.add(notify);
    return () => { listeners.delete(notify); };
  }, []);

  const setSettings = (update: Partial<AppSettings>) => {
    const next = { ...settings, ...update };
    save(next);
    setSettingsState(next);
    listeners.forEach((fn) => fn());
  };

  return { settings, setSettings };
}
