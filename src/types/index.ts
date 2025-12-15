// Habit Types
export type HabitType = 'boolean' | 'quantifiable';

export type MetricType = 'count' | 'duration' | 'distance' | 'weight' | 'percentage' | 'custom';

export type HabitDirection = 'maximize' | 'minimize';

export type FrequencyType = 'daily' | 'weekly' | 'specific_days';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  type: HabitType;
  metricType?: MetricType;
  direction: HabitDirection;
  goalValue?: number;
  unit?: string;
  frequency: FrequencyType;
  specificDays?: DayOfWeek[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  color?: string;
}

// Entry Types
export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD format
  value: number; // For boolean: 1 = completed, 0 = not completed
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Streak Types
export interface Streak {
  id: string;
  habitId: string;
  startDate: string;
  endDate?: string;
  length: number;
  isActive: boolean;
  isPersonalRecord: boolean;
}

// Trophy Types
export type TrophyLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Trophy {
  level: TrophyLevel;
  name: string;
  requiredDays: number;
  emoji: string;
}

export const TROPHIES: Trophy[] = [
  { level: 'bronze', name: 'Bronze', requiredDays: 3, emoji: '🥉' },
  { level: 'silver', name: 'Silver', requiredDays: 7, emoji: '🥈' },
  { level: 'gold', name: 'Gold', requiredDays: 14, emoji: '🥇' },
  { level: 'diamond', name: 'Diamond', requiredDays: 30, emoji: '💎' },
];

// Race Types
export interface RacePosition {
  value: number;
  date: string;
  isPersonalRecord: boolean;
  isCurrent: boolean;
  position: number; // 1-based position in race
}

export interface RaceData {
  habitId: string;
  currentValue: number;
  currentPosition: number; // 1-based
  totalPositions: number;
  positions: RacePosition[];
  nextTarget?: {
    value: number;
    position: number;
    estimatedDate?: string;
  };
  previousRecord?: {
    value: number;
    date: string;
  };
}

// Statistics Types
export interface HabitStats {
  habitId: string;
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  averageValue: number;
  totalValue: number;
  completionRate: number; // For boolean habits
  bestValue: number;
  worstValue: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
}

// App State Types
export interface OnboardingState {
  completed: boolean;
  currentStep: number;
}

export interface AppSettings {
  theme: 'dark'; // Only dark vaporwave theme for now
  notifications: boolean;
  notificationTime?: string; // HH:MM format
  hapticFeedback: boolean;
  soundEffects: boolean;
}

// UI State Types
export interface UIState {
  onboarding: OnboardingState;
  settings: AppSettings;
  selectedHabitId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Common preset habits for onboarding
export interface PresetHabit {
  name: string;
  emoji: string;
  type: HabitType;
  metricType?: MetricType;
  direction: HabitDirection;
  goalValue?: number;
  unit?: string;
  frequency: FrequencyType;
}

export const PRESET_HABITS: PresetHabit[] = [
  {
    name: 'Meditation',
    emoji: '🧘',
    type: 'quantifiable',
    metricType: 'duration',
    direction: 'maximize',
    goalValue: 10,
    unit: 'minutes',
    frequency: 'daily',
  },
  {
    name: 'Reading',
    emoji: '📚',
    type: 'quantifiable',
    metricType: 'duration',
    direction: 'maximize',
    goalValue: 30,
    unit: 'minutes',
    frequency: 'daily',
  },
  {
    name: 'Exercise',
    emoji: '💪',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Water Intake',
    emoji: '💧',
    type: 'quantifiable',
    metricType: 'count',
    direction: 'maximize',
    goalValue: 8,
    unit: 'glasses',
    frequency: 'daily',
  },
  {
    name: 'Sleep',
    emoji: '😴',
    type: 'quantifiable',
    metricType: 'duration',
    direction: 'maximize',
    goalValue: 8,
    unit: 'hours',
    frequency: 'daily',
  },
  {
    name: 'No Social Media',
    emoji: '📵',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Journaling',
    emoji: '✍️',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Walking',
    emoji: '🚶',
    type: 'quantifiable',
    metricType: 'count',
    direction: 'maximize',
    goalValue: 10000,
    unit: 'steps',
    frequency: 'daily',
  },
  {
    name: 'Healthy Eating',
    emoji: '🥗',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Learning',
    emoji: '🎓',
    type: 'quantifiable',
    metricType: 'duration',
    direction: 'maximize',
    goalValue: 30,
    unit: 'minutes',
    frequency: 'daily',
  },
];
