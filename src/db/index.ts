import Dexie, { Table } from 'dexie';
import { Habit, HabitEntry, Streak, AppSettings, OnboardingState, ActiveTimer } from '../types';

export class HabitRacerDB extends Dexie {
  habits!: Table<Habit>;
  entries!: Table<HabitEntry>;
  streaks!: Table<Streak>;
  settings!: Table<AppSettings & { id: string }>;
  onboarding!: Table<OnboardingState & { id: string }>;
  activeTimers!: Table<ActiveTimer>;

  constructor() {
    super('HabitRacerDB');

    this.version(1).stores({
      habits: 'id, name, createdAt, updatedAt, archived',
      entries: 'id, habitId, date, [habitId+date], createdAt',
      streaks: 'id, habitId, startDate, isActive, [habitId+isActive]',
      settings: 'id',
      onboarding: 'id',
    });

    // Version 2: Add activeTimers table for persistent timers
    this.version(2).stores({
      habits: 'id, name, createdAt, updatedAt, archived',
      entries: 'id, habitId, date, [habitId+date], createdAt',
      streaks: 'id, habitId, startDate, isActive, [habitId+isActive]',
      settings: 'id',
      onboarding: 'id',
      activeTimers: 'id, habitId, isRunning',
    });
  }
}

export const db = new HabitRacerDB();

// Helper functions for database operations

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Parse date string to Date object
export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

// Get dates between two dates
export function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Check if a date should have an entry based on habit frequency
export function shouldHaveEntry(habit: Habit, date: string): boolean {
  const dayOfWeek = parseDate(date).getDay();
  const dayMap: Record<number, string> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };

  if (habit.frequency === 'daily') {
    return true;
  }

  if (habit.frequency === 'specific_days' && habit.specificDays) {
    return habit.specificDays.includes(dayMap[dayOfWeek] as any);
  }

  // For weekly, we'll consider any day valid
  return true;
}

// Initialize default settings if not exist
export async function initializeSettings(): Promise<void> {
  const existingSettings = await db.settings.get('default');
  if (!existingSettings) {
    await db.settings.put({
      id: 'default',
      theme: 'dark',
      notifications: false,
      hapticFeedback: true,
      soundEffects: true,
    });
  }
}

// Initialize onboarding state if not exist
export async function initializeOnboarding(): Promise<void> {
  const existingOnboarding = await db.onboarding.get('default');
  if (!existingOnboarding) {
    await db.onboarding.put({
      id: 'default',
      completed: false,
      currentStep: 0,
    });
  }
}

// Initialize database with default values
export async function initializeDatabase(): Promise<void> {
  await initializeSettings();
  await initializeOnboarding();
}
