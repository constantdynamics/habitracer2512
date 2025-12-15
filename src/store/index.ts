import { configureStore } from '@reduxjs/toolkit';
import habitsReducer from './habitsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    habits: habitsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
