import { db, generateId } from '../db';
import { ActiveTimer } from '../types';

// Get all active timers
export async function getAllActiveTimers(): Promise<ActiveTimer[]> {
  return db.activeTimers.toArray();
}

// Get active timer for a specific habit
export async function getActiveTimer(habitId: string): Promise<ActiveTimer | undefined> {
  return db.activeTimers.where('habitId').equals(habitId).first();
}

// Get all running timers
export async function getRunningTimers(): Promise<ActiveTimer[]> {
  return db.activeTimers.where('isRunning').equals(1).toArray();
}

// Start a new timer for a habit
export async function startTimer(habitId: string): Promise<ActiveTimer> {
  // Check if there's already an active timer for this habit
  const existing = await getActiveTimer(habitId);

  if (existing) {
    // Resume existing timer
    if (!existing.isRunning) {
      const now = Date.now();
      await db.activeTimers.update(existing.id, {
        startedAt: now,
        isRunning: true,
        pausedAt: undefined,
      });
      return { ...existing, startedAt: now, isRunning: true, pausedAt: undefined };
    }
    return existing;
  }

  // Create new timer
  const timer: ActiveTimer = {
    id: generateId(),
    habitId,
    startedAt: Date.now(),
    accumulatedMs: 0,
    isRunning: true,
  };

  await db.activeTimers.add(timer);
  return timer;
}

// Pause a timer
export async function pauseTimer(habitId: string): Promise<ActiveTimer | undefined> {
  const timer = await getActiveTimer(habitId);
  if (!timer || !timer.isRunning) return timer;

  const now = Date.now();
  const elapsedSinceStart = now - timer.startedAt;
  const newAccumulated = timer.accumulatedMs + elapsedSinceStart;

  await db.activeTimers.update(timer.id, {
    pausedAt: now,
    accumulatedMs: newAccumulated,
    isRunning: false,
  });

  return {
    ...timer,
    pausedAt: now,
    accumulatedMs: newAccumulated,
    isRunning: false,
  };
}

// Stop and remove a timer (when saving entry)
export async function stopTimer(habitId: string): Promise<number> {
  const timer = await getActiveTimer(habitId);
  if (!timer) return 0;

  // Calculate total elapsed time
  let totalMs = timer.accumulatedMs;
  if (timer.isRunning) {
    totalMs += Date.now() - timer.startedAt;
  }

  // Remove the timer
  await db.activeTimers.delete(timer.id);

  return totalMs;
}

// Get current elapsed time for a timer (without stopping it)
export function getElapsedMs(timer: ActiveTimer): number {
  let totalMs = timer.accumulatedMs;
  if (timer.isRunning) {
    totalMs += Date.now() - timer.startedAt;
  }
  return totalMs;
}

// Delete a timer without saving
export async function deleteTimer(habitId: string): Promise<void> {
  const timer = await getActiveTimer(habitId);
  if (timer) {
    await db.activeTimers.delete(timer.id);
  }
}

// Format milliseconds to display string
export function formatElapsedTime(ms: number): {
  display: string;
  centis: string;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);

  return {
    display: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    centis: `.${centis.toString().padStart(2, '0')}`,
    minutes,
    seconds,
  };
}
