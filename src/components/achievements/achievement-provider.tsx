"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { syncAchievements } from "@/actions/achievements";
import { AchievementToastStack } from "@/components/achievements/achievement-toast";
import type { UnlockedAchievement } from "@/types/database";

interface AchievementContextValue {
  showUnlocks: (achievements: UnlockedAchievement[]) => void;
}

const AchievementContext = createContext<AchievementContextValue | null>(null);

const TOAST_DURATION_MS = 5000;

interface AchievementProviderProps {
  children: ReactNode;
  isLoggedIn: boolean;
}

export function AchievementProvider({ children, isLoggedIn }: AchievementProviderProps) {
  const [toasts, setToasts] = useState<
    Array<{ id: string; achievement: UnlockedAchievement }>
  >([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const syncedRef = useRef(false);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showUnlocks = useCallback(
    (achievements: UnlockedAchievement[]) => {
      if (achievements.length === 0) return;

      achievements.forEach((achievement, index) => {
        const id = `${achievement.code}-${achievement.unlockedAt}-${index}`;
        setToasts((prev) => [...prev, { id, achievement }]);

        const timer = setTimeout(() => dismiss(id), TOAST_DURATION_MS);
        timersRef.current.set(id, timer);
      });
    },
    [dismiss]
  );

  useEffect(() => {
    if (!isLoggedIn || syncedRef.current) return;
    syncedRef.current = true;

    syncAchievements()
      .then((unlocked) => showUnlocks(unlocked))
      .catch(() => {
        syncedRef.current = false;
      });
  }, [isLoggedIn, showUnlocks]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <AchievementContext.Provider value={{ showUnlocks }}>
      {children}
      <AchievementToastStack toasts={toasts} onDismiss={dismiss} />
    </AchievementContext.Provider>
  );
}

export function useAchievementToast(): AchievementContextValue {
  const ctx = useContext(AchievementContext);
  if (!ctx) {
    return { showUnlocks: () => {} };
  }
  return ctx;
}
