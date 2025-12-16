// Habit Types
export type HabitType = 'boolean' | 'quantifiable';

export type MetricType = 'count' | 'duration' | 'distance' | 'weight' | 'percentage' | 'custom';

// Automatische tracking types
export type AutoTrackType = 'manual' | 'gps' | 'screentime' | 'steps';

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
  autoTrack?: AutoTrackType; // Type automatische tracking
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
  isAttempt?: boolean; // True for timer-based entries that allow multiple per day
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
  { level: 'bronze', name: 'Brons', requiredDays: 3, emoji: '🥉' },
  { level: 'silver', name: 'Zilver', requiredDays: 7, emoji: '🥈' },
  { level: 'gold', name: 'Goud', requiredDays: 14, emoji: '🥇' },
  { level: 'diamond', name: 'Diamant', requiredDays: 30, emoji: '💎' },
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

// Active Timer Types (persistent, survives app close)
export interface ActiveTimer {
  id: string;
  habitId: string;
  startedAt: number; // Unix timestamp when timer started
  pausedAt?: number; // Unix timestamp when paused (if paused)
  accumulatedMs: number; // Total accumulated time before current session
  isRunning: boolean;
}

// App State Types
export interface OnboardingState {
  completed: boolean;
  currentStep: number;
}

export type SortOption = 'custom' | 'newest' | 'oldest' | 'name' | 'streak' | 'mostActive';

export interface AppSettings {
  theme: 'dark'; // Only dark vaporwave theme for now
  notifications: boolean;
  notificationTime?: string; // HH:MM format
  hapticFeedback: boolean;
  soundEffects: boolean;
  sortOrder: SortOption;
  customOrder: string[]; // Array of habit IDs in custom order
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
    name: 'Tandenstoken',
    emoji: '🦷',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Sportschool',
    emoji: '🏋️',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Hardlopen',
    emoji: '🏃',
    type: 'quantifiable',
    metricType: 'distance',
    direction: 'maximize',
    goalValue: 5,
    unit: 'km',
    frequency: 'daily',
  },
  {
    name: 'Boek lezen',
    emoji: '📚',
    type: 'quantifiable',
    metricType: 'duration',
    direction: 'maximize',
    goalValue: 30,
    unit: 'minuten',
    frequency: 'daily',
  },
  {
    name: 'Telefoon wegleggen',
    emoji: '📵',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Meditatie',
    emoji: '🧘',
    type: 'quantifiable',
    metricType: 'duration',
    direction: 'maximize',
    goalValue: 10,
    unit: 'minuten',
    frequency: 'daily',
  },
  {
    name: 'Water drinken',
    emoji: '💧',
    type: 'quantifiable',
    metricType: 'count',
    direction: 'maximize',
    goalValue: 8,
    unit: 'glazen',
    frequency: 'daily',
  },
  {
    name: 'Slaap',
    emoji: '😴',
    type: 'quantifiable',
    metricType: 'duration',
    direction: 'maximize',
    goalValue: 8,
    unit: 'uur',
    frequency: 'daily',
  },
  {
    name: 'Gezond eten',
    emoji: '🥗',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
  {
    name: 'Dagboek schrijven',
    emoji: '✍️',
    type: 'boolean',
    direction: 'maximize',
    frequency: 'daily',
  },
];
