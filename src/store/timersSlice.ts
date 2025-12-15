import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ActiveTimer } from '../types';
import * as timerService from '../services/timerService';

interface TimersState {
  activeTimers: ActiveTimer[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TimersState = {
  activeTimers: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const loadActiveTimers = createAsyncThunk('timers/loadActiveTimers', async () => {
  const timers = await timerService.getAllActiveTimers();
  return timers;
});

export const startTimer = createAsyncThunk('timers/startTimer', async (habitId: string) => {
  const timer = await timerService.startTimer(habitId);
  return timer;
});

export const pauseTimer = createAsyncThunk('timers/pauseTimer', async (habitId: string) => {
  const timer = await timerService.pauseTimer(habitId);
  return timer;
});

export const stopAndSaveTimer = createAsyncThunk(
  'timers/stopAndSaveTimer',
  async ({ habitId, autoRestart }: { habitId: string; autoRestart: boolean }) => {
    const elapsedMs = await timerService.stopTimer(habitId);

    // If autoRestart is true, start a new timer immediately
    let newTimer: ActiveTimer | null = null;
    if (autoRestart) {
      newTimer = await timerService.startTimer(habitId);
    }

    return { habitId, elapsedMs, newTimer };
  }
);

export const deleteTimer = createAsyncThunk('timers/deleteTimer', async (habitId: string) => {
  await timerService.deleteTimer(habitId);
  return habitId;
});

const timersSlice = createSlice({
  name: 'timers',
  initialState,
  reducers: {
    // Update timer display without DB write (for real-time display)
    tickTimers: (state) => {
      // This just triggers a re-render, actual time is calculated from startedAt
      state.activeTimers = [...state.activeTimers];
    },
    clearTimerError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load active timers
      .addCase(loadActiveTimers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadActiveTimers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeTimers = action.payload;
      })
      .addCase(loadActiveTimers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load timers';
      })

      // Start timer
      .addCase(startTimer.fulfilled, (state, action) => {
        const existingIndex = state.activeTimers.findIndex(
          (t) => t.habitId === action.payload.habitId
        );
        if (existingIndex !== -1) {
          state.activeTimers[existingIndex] = action.payload;
        } else {
          state.activeTimers.push(action.payload);
        }
      })

      // Pause timer
      .addCase(pauseTimer.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.activeTimers.findIndex(
            (t) => t.habitId === action.payload!.habitId
          );
          if (index !== -1) {
            state.activeTimers[index] = action.payload;
          }
        }
      })

      // Stop and save timer
      .addCase(stopAndSaveTimer.fulfilled, (state, action) => {
        const { habitId, newTimer } = action.payload;

        // Remove the old timer
        state.activeTimers = state.activeTimers.filter((t) => t.habitId !== habitId);

        // Add new timer if auto-restarted
        if (newTimer) {
          state.activeTimers.push(newTimer);
        }
      })

      // Delete timer
      .addCase(deleteTimer.fulfilled, (state, action) => {
        state.activeTimers = state.activeTimers.filter((t) => t.habitId !== action.payload);
      });
  },
});

export const { tickTimers, clearTimerError } = timersSlice.actions;
export default timersSlice.reducer;
