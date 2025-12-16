import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadHabits,
  loadAllRaceData,
  quickCheckIn,
  loadRaceData,
  createHabitFromPreset,
  checkInWithValue,
  loadEntriesForHabit,
} from '../store/habitsSlice';
import {
  loadActiveTimers,
  startTimer,
  pauseTimer,
  stopAndSaveTimer,
  deleteTimer,
} from '../store/timersSlice';
import { setShowAddHabitModal, triggerCelebration, dismissCelebration } from '../store/uiSlice';
import { AddHabitModal } from '../components/AddHabitModal';
import { CheckInModal } from '../components/CheckInModal';
import { Celebration } from '../components/Celebration';
import { RaceTile } from '../components/RaceTile';
import { getTodayDate } from '../db';
import { Habit, PresetHabit } from '../types';
import { getCurrentStreak, getEntriesForHabit } from '../services/habitService';

export function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { habits, raceData, entries } = useAppSelector((state) => state.habits);
  const { activeTimers } = useAppSelector((state) => state.timers);
  const { showAddHabitModal, showCelebration, celebrationMessage } = useAppSelector(
    (state) => state.ui
  );

  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);
  const [bestValues, setBestValues] = useState<Record<string, number>>({});
  const [previousEntries, setPreviousEntries] = useState<Record<string, { value: number; date: string }>>({});

  // Load habits and active timers on mount
  useEffect(() => {
    dispatch(loadHabits());
    dispatch(loadActiveTimers());
  }, [dispatch]);

  // Load race data, streaks, and best values when habits change
  useEffect(() => {
    if (habits.length > 0) {
      dispatch(loadAllRaceData());
      // Load streaks, best values, and previous entries
      Promise.all(
        habits.map(async (h) => {
          const streak = await getCurrentStreak(h.id);
          const allEntries = await getEntriesForHabit(h.id);
          // Sort by createdAt to handle multiple entries per day correctly
          const sortedEntries = [...allEntries].sort((a, b) => b.createdAt - a.createdAt);
          // Best value depends on habit direction
          const best = allEntries.length > 0
            ? (h.direction === 'maximize'
                ? Math.max(...allEntries.map(e => e.value))
                : Math.min(...allEntries.map(e => e.value)))
            : 0;
          const previous = sortedEntries.length > 0 ? sortedEntries[0] : null;
          return { id: h.id, streak, best, previous };
        })
      ).then((results) => {
        const streakMap: Record<string, number> = {};
        const bestMap: Record<string, number> = {};
        const prevMap: Record<string, { value: number; date: string }> = {};
        results.forEach((r) => {
          streakMap[r.id] = r.streak;
          bestMap[r.id] = r.best;
          if (r.previous) {
            prevMap[r.id] = { value: r.previous.value, date: r.previous.date };
          }
        });
        setStreaks(streakMap);
        setBestValues(bestMap);
        setPreviousEntries(prevMap);
      });
    }
  }, [habits, dispatch]);

  const handleQuickCheckIn = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const todayEntry = entries[habitId]?.find((e) => e.date === getTodayDate());
    const wasCompleted = todayEntry?.value === 1;

    await dispatch(quickCheckIn(habitId));
    await dispatch(loadRaceData(habitId));

    // Update streaks
    const newStreak = await getCurrentStreak(habitId);
    setStreaks((prev) => ({ ...prev, [habitId]: newStreak }));

    // Trigger celebration if newly completed
    if (!wasCompleted) {
      const previousStreak = streaks[habitId] || 0;
      if (newStreak > previousStreak) {
        // Check for trophy milestones
        if (newStreak === 3) {
          dispatch(triggerCelebration('Bronzen trofee ontgrendeld! 🥉'));
        } else if (newStreak === 7) {
          dispatch(triggerCelebration('Zilveren trofee ontgrendeld! 🥈'));
        } else if (newStreak === 14) {
          dispatch(triggerCelebration('Gouden trofee ontgrendeld! 🥇'));
        } else if (newStreak === 30) {
          dispatch(triggerCelebration('Diamanten trofee ontgrendeld! 💎'));
        } else {
          dispatch(triggerCelebration(`${newStreak} dagen streak! 🔥`));
        }
      }
    }
  };

  const handleCheckInWithValue = async (value: number, notes?: string) => {
    if (!checkInHabit) return;

    await dispatch(checkInWithValue({ habitId: checkInHabit.id, value, notes }));
    await dispatch(loadRaceData(checkInHabit.id));

    // Update streaks
    const newStreak = await getCurrentStreak(checkInHabit.id);
    setStreaks((prev) => ({ ...prev, [checkInHabit.id]: newStreak }));

    // Reload entries to update best/previous
    const allEntries = await getEntriesForHabit(checkInHabit.id);
    const sortedEntries = [...allEntries].sort((a, b) => b.date.localeCompare(a.date));
    const best = allEntries.length > 0 ? Math.max(...allEntries.map(e => e.value)) : 0;
    setBestValues((prev) => ({ ...prev, [checkInHabit.id]: best }));
    if (sortedEntries.length > 0) {
      setPreviousEntries((prev) => ({
        ...prev,
        [checkInHabit.id]: { value: sortedEntries[0].value, date: sortedEntries[0].date }
      }));
    }

    // Celebration for goal reached
    if (checkInHabit.goalValue && value >= checkInHabit.goalValue) {
      dispatch(triggerCelebration('Doel behaald! 🎯'));
    }

    setCheckInHabit(null);
  };

  const handleAddHabit = async (preset: PresetHabit) => {
    await dispatch(createHabitFromPreset(preset));
    dispatch(setShowAddHabitModal(false));
    dispatch(triggerCelebration(`${preset.name} toegevoegd! Let's go! 🚀`));
  };

  const handleViewDetails = (habit: Habit) => {
    if (habit.type === 'quantifiable' && habit.metricType !== 'duration') {
      setCheckInHabit(habit);
    } else {
      navigate(`/habit/${habit.id}`);
    }
  };

  // Timer handlers
  const handleStartTimer = async (habitId: string) => {
    await dispatch(startTimer(habitId));
  };

  const handlePauseTimer = async (habitId: string) => {
    await dispatch(pauseTimer(habitId));
  };

  const handleResumeTimer = async (habitId: string) => {
    await dispatch(startTimer(habitId));
  };

  const handleSaveTimer = async (habitId: string, elapsedMs: number) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Convert ms to minutes with 1 decimal place
    const minutes = Math.round(elapsedMs / 1000 / 60 * 10) / 10;

    // Stop timer WITHOUT auto-restart
    await dispatch(stopAndSaveTimer({ habitId, autoRestart: false }));
    // isAttempt: true allows multiple entries per day for timer-based habits
    await dispatch(checkInWithValue({ habitId, value: minutes, isAttempt: true }));
    await dispatch(loadRaceData(habitId));
    await dispatch(loadEntriesForHabit(habitId));

    // Update streaks and best values
    const newStreak = await getCurrentStreak(habitId);
    setStreaks((prev) => ({ ...prev, [habitId]: newStreak }));

    const allEntries = await getEntriesForHabit(habitId);
    const sortedEntries = [...allEntries].sort((a, b) => b.date.localeCompare(a.date));
    const best = allEntries.length > 0 ? Math.max(...allEntries.map(e => e.value)) : 0;
    setBestValues((prev) => ({ ...prev, [habitId]: best }));
    if (sortedEntries.length > 0) {
      setPreviousEntries((prev) => ({
        ...prev,
        [habitId]: { value: sortedEntries[0].value, date: sortedEntries[0].date }
      }));
    }

    dispatch(triggerCelebration(`${minutes} minuten opgeslagen!`));
  };

  const handleDeleteTimer = async (habitId: string) => {
    await dispatch(deleteTimer(habitId));
  };

  const today = getTodayDate();

  // Count active timers for header
  const activeTimerCount = activeTimers.filter(t => t.isRunning).length;

  return (
    <div className="min-h-screen pb-24">
      {/* Background effects */}
      <div className="grid-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-vapor-dark/80 backdrop-blur-lg border-b border-white/10 safe-area-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-left hover:opacity-80 transition-opacity">
            <h1 className="font-display font-bold text-xl text-white">
              Habit<span className="text-vapor-cyan">Racer</span>
            </h1>
          </button>
          <div className="flex items-center gap-2">
            {activeTimerCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">{activeTimerCount}</span>
              </div>
            )}
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-3 py-4">
        {habits.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🏁</div>
            <h2 className="text-lg font-semibold text-white mb-2">Klaar om te racen?</h2>
            <p className="text-white/60 text-sm mb-6">
              Voeg je eerste gewoonte toe
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch(setShowAddHabitModal(true))}
              className="px-5 py-2.5 bg-gradient-to-r from-vapor-pink to-vapor-cyan text-white text-sm font-semibold rounded-xl glow-button"
            >
              Voeg je eerste gewoonte toe
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-white/40 mb-3">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-red-500" /> Voor
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-yellow-400" /> Nu
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-green-500" /> Verslagen
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm ring-1 ring-vapor-gold bg-transparent" /> PR
              </span>
            </div>

            {/* 2-column grid of race tiles */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {habits.map((habit) => {
                  const habitEntries = entries[habit.id] || [];
                  const todayEntry = habitEntries.find((e) => e.date === today);
                  const habitRaceData = raceData[habit.id];
                  const streak = streaks[habit.id] || 0;
                  const timer = activeTimers.find(t => t.habitId === habit.id);

                  return (
                    <RaceTile
                      key={habit.id}
                      habit={habit}
                      raceData={habitRaceData}
                      todayEntry={todayEntry}
                      currentStreak={streak}
                      activeTimer={timer}
                      previousBest={bestValues[habit.id]}
                      previousEntry={previousEntries[habit.id]}
                      onQuickCheckIn={() => handleQuickCheckIn(habit.id)}
                      onStartTimer={() => handleStartTimer(habit.id)}
                      onPauseTimer={() => handlePauseTimer(habit.id)}
                      onResumeTimer={() => handleResumeTimer(habit.id)}
                      onSaveTimer={(elapsedMs) => handleSaveTimer(habit.id, elapsedMs)}
                      onDeleteTimer={() => handleDeleteTimer(habit.id)}
                      onClick={() => handleViewDetails(habit)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      {/* FAB - Add habit button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => dispatch(setShowAddHabitModal(true))}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-vapor-pink to-vapor-cyan rounded-full flex items-center justify-center shadow-neon-pink z-40 safe-area-bottom"
      >
        <Plus className="w-5 h-5 text-white" />
      </motion.button>

      {/* Modals */}
      <AnimatePresence>
        {showAddHabitModal && (
          <AddHabitModal
            onAddPreset={handleAddHabit}
            onAddCustom={handleAddHabit}
            onClose={() => dispatch(setShowAddHabitModal(false))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkInHabit && (
          <CheckInModal
            habit={checkInHabit}
            currentValue={
              entries[checkInHabit.id]?.find((e) => e.date === today)?.value || 0
            }
            onCheckIn={handleCheckInWithValue}
            onClose={() => setCheckInHabit(null)}
          />
        )}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <Celebration
            message={celebrationMessage}
            onComplete={() => dispatch(dismissCelebration())}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
