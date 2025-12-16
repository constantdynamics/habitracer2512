import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Habit, HabitEntry, RaceData, HabitStats, PresetHabit } from '../types';
import * as habitService from '../services/habitService';

interface HabitsState {
  habits: Habit[];
  entries: Record<string, HabitEntry[]>; // habitId -> entries
  raceData: Record<string, RaceData>; // habitId -> race data
  stats: Record<string, HabitStats>; // habitId -> stats
  isLoading: boolean;
  error: string | null;
}

const initialState: HabitsState = {
  habits: [],
  entries: {},
  raceData: {},
  stats: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const loadHabits = createAsyncThunk('habits/loadHabits', async () => {
  const habits = await habitService.getActiveHabits();
  return habits;
});

export const createHabit = createAsyncThunk(
  'habits/createHabit',
  async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => {
    const habit = await habitService.createHabit(habitData);
    return habit;
  }
);

export const createHabitFromPreset = createAsyncThunk(
  'habits/createHabitFromPreset',
  async (preset: PresetHabit) => {
    const habit = await habitService.createHabitFromPreset(preset);
    return habit;
  }
);

export const updateHabit = createAsyncThunk(
  'habits/updateHabit',
  async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
    await habitService.updateHabit(id, updates);
    const habit = await habitService.getHabit(id);
    return habit;
  }
);

export const deleteHabit = createAsyncThunk('habits/deleteHabit', async (id: string) => {
  await habitService.deleteHabit(id);
  return id;
});

export const loadEntriesForHabit = createAsyncThunk(
  'habits/loadEntriesForHabit',
  async (habitId: string) => {
    const entries = await habitService.getEntriesForHabit(habitId);
    return { habitId, entries };
  }
);

export const quickCheckIn = createAsyncThunk('habits/quickCheckIn', async (habitId: string) => {
  const entry = await habitService.quickCheckIn(habitId);
  return { habitId, entry };
});

export const checkInWithValue = createAsyncThunk(
  'habits/checkInWithValue',
  async ({ habitId, value, notes, date, isAttempt }: { habitId: string; value: number; notes?: string; date?: string; isAttempt?: boolean }) => {
    const entry = await habitService.checkInWithValue(habitId, value, notes, date, isAttempt);
    return { habitId, entry };
  }
);

export const deleteEntry = createAsyncThunk(
  'habits/deleteEntry',
  async ({ habitId, date }: { habitId: string; date: string }) => {
    await habitService.deleteEntry(habitId, date);
    return { habitId, date };
  }
);

export const loadRaceData = createAsyncThunk('habits/loadRaceData', async (habitId: string) => {
  const raceData = await habitService.calculateRaceData(habitId);
  return raceData;
});

export const loadStats = createAsyncThunk('habits/loadStats', async (habitId: string) => {
  const stats = await habitService.getHabitStats(habitId);
  return stats;
});

export const loadAllRaceData = createAsyncThunk(
  'habits/loadAllRaceData',
  async (_, { getState }) => {
    const state = getState() as { habits: HabitsState };
    const raceDataMap: Record<string, RaceData> = {};

    for (const habit of state.habits.habits) {
      try {
        raceDataMap[habit.id] = await habitService.calculateRaceData(habit.id);
      } catch {
        // Skip habits with errors
      }
    }

    return raceDataMap;
  }
);

const habitsSlice = createSlice({
  name: 'habits',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load habits
      .addCase(loadHabits.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadHabits.fulfilled, (state, action) => {
        state.isLoading = false;
        state.habits = action.payload;
      })
      .addCase(loadHabits.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load habits';
      })

      // Create habit
      .addCase(createHabit.fulfilled, (state, action) => {
        state.habits.unshift(action.payload);
      })

      // Create habit from preset
      .addCase(createHabitFromPreset.fulfilled, (state, action) => {
        state.habits.unshift(action.payload);
      })

      // Update habit
      .addCase(updateHabit.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.habits.findIndex((h) => h.id === action.payload!.id);
          if (index !== -1) {
            state.habits[index] = action.payload;
          }
        }
      })

      // Delete habit
      .addCase(deleteHabit.fulfilled, (state, action) => {
        state.habits = state.habits.filter((h) => h.id !== action.payload);
        delete state.entries[action.payload];
        delete state.raceData[action.payload];
        delete state.stats[action.payload];
      })

      // Load entries
      .addCase(loadEntriesForHabit.fulfilled, (state, action) => {
        state.entries[action.payload.habitId] = action.payload.entries;
      })

      // Quick check-in
      .addCase(quickCheckIn.fulfilled, (state, action) => {
        const { habitId, entry } = action.payload;
        if (!state.entries[habitId]) {
          state.entries[habitId] = [];
        }

        const existingIndex = state.entries[habitId].findIndex(
          (e) => e.date === entry.date
        );

        if (existingIndex !== -1) {
          state.entries[habitId][existingIndex] = entry;
        } else {
          state.entries[habitId].push(entry);
        }
      })

      // Check-in with value
      .addCase(checkInWithValue.fulfilled, (state, action) => {
        const { habitId, entry } = action.payload;
        if (!state.entries[habitId]) {
          state.entries[habitId] = [];
        }

        // For attempt entries, always add a new entry
        if (entry.isAttempt) {
          state.entries[habitId].push(entry);
        } else {
          const existingIndex = state.entries[habitId].findIndex(
            (e) => e.date === entry.date && !e.isAttempt
          );

          if (existingIndex !== -1) {
            state.entries[habitId][existingIndex] = entry;
          } else {
            state.entries[habitId].push(entry);
          }
        }
      })

      // Load race data
      .addCase(loadRaceData.fulfilled, (state, action) => {
        state.raceData[action.payload.habitId] = action.payload;
      })

      // Load stats
      .addCase(loadStats.fulfilled, (state, action) => {
        state.stats[action.payload.habitId] = action.payload;
      })

      // Load all race data
      .addCase(loadAllRaceData.fulfilled, (state, action: PayloadAction<Record<string, RaceData>>) => {
        state.raceData = { ...state.raceData, ...action.payload };
      })

      // Delete entry
      .addCase(deleteEntry.fulfilled, (state, action) => {
        const { habitId, date } = action.payload;
        if (state.entries[habitId]) {
          state.entries[habitId] = state.entries[habitId].filter((e) => e.date !== date);
        }
      });
  },
});

export const { clearError } = habitsSlice.actions;
export default habitsSlice.reducer;
