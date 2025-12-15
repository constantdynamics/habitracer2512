import { configureStore } from '@reduxjs/toolkit';
import habitsReducer from './habitsSlice';
import uiReducer from './uiSlice';
import timersReducer from './timersSlice';

export const store = configureStore({
  reducer: {
    habits: habitsReducer,
    ui: uiReducer,
    timers: timersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
