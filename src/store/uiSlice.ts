import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../db';
import { AppSettings, OnboardingState } from '../types';

interface UIState {
  onboarding: OnboardingState;
  settings: AppSettings;
  selectedHabitId: string | null;
  isLoading: boolean;
  showAddHabitModal: boolean;
  showCheckInModal: boolean;
  showCelebration: boolean;
  celebrationMessage: string;
}

const initialState: UIState = {
  onboarding: {
    completed: false,
    currentStep: 0,
  },
  settings: {
    theme: 'dark',
    notifications: false,
    hapticFeedback: true,
    soundEffects: true,
  },
  selectedHabitId: null,
  isLoading: true,
  showAddHabitModal: false,
  showCheckInModal: false,
  showCelebration: false,
  celebrationMessage: '',
};

// Async thunks
export const loadOnboardingState = createAsyncThunk('ui/loadOnboardingState', async () => {
  const onboarding = await db.onboarding.get('default');
  return onboarding || { completed: false, currentStep: 0 };
});

export const loadSettings = createAsyncThunk('ui/loadSettings', async () => {
  const settings = await db.settings.get('default');
  return settings || initialState.settings;
});

export const completeOnboarding = createAsyncThunk('ui/completeOnboarding', async () => {
  await db.onboarding.put({
    id: 'default',
    completed: true,
    currentStep: 3,
  });
  return true;
});

export const updateOnboardingStep = createAsyncThunk(
  'ui/updateOnboardingStep',
  async (step: number) => {
    await db.onboarding.update('default', { currentStep: step });
    return step;
  }
);

export const updateSettings = createAsyncThunk(
  'ui/updateSettings',
  async (settings: Partial<AppSettings>) => {
    const current = await db.settings.get('default');
    const updated = { ...current, ...settings, id: 'default' };
    await db.settings.put(updated as AppSettings & { id: string });
    return updated as AppSettings;
  }
);

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedHabit: (state, action: PayloadAction<string | null>) => {
      state.selectedHabitId = action.payload;
    },
    setShowAddHabitModal: (state, action: PayloadAction<boolean>) => {
      state.showAddHabitModal = action.payload;
    },
    setShowCheckInModal: (state, action: PayloadAction<boolean>) => {
      state.showCheckInModal = action.payload;
    },
    triggerCelebration: (state, action: PayloadAction<string>) => {
      state.showCelebration = true;
      state.celebrationMessage = action.payload;
    },
    dismissCelebration: (state) => {
      state.showCelebration = false;
      state.celebrationMessage = '';
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load onboarding state
      .addCase(loadOnboardingState.fulfilled, (state, action) => {
        state.onboarding = {
          completed: action.payload.completed,
          currentStep: action.payload.currentStep,
        };
        state.isLoading = false;
      })

      // Load settings
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.settings = action.payload as AppSettings;
      })

      // Complete onboarding
      .addCase(completeOnboarding.fulfilled, (state) => {
        state.onboarding.completed = true;
        state.onboarding.currentStep = 3;
      })

      // Update onboarding step
      .addCase(updateOnboardingStep.fulfilled, (state, action) => {
        state.onboarding.currentStep = action.payload;
      })

      // Update settings
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      });
  },
});

export const {
  setSelectedHabit,
  setShowAddHabitModal,
  setShowCheckInModal,
  triggerCelebration,
  dismissCelebration,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
