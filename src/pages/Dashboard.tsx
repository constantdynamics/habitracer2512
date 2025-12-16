import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, ChevronDown } from 'lucide-react';
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
import { setShowAddHabitModal, triggerCelebration, dismissCelebration, setSortOrder, updateSettings } from '../store/uiSlice';
import { AddHabitModal } from '../components/AddHabitModal';
import { CheckInModal } from '../components/CheckInModal';
import { Celebration } from '../components/Celebration';
import { RaceTile } from '../components/RaceTile';
import { getTodayDate } from '../db';
import { Habit, PresetHabit, SortOption } from '../types';
import { getCurrentStreak } from '../services/habitService';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Nieuwste eerst' },
  { value: 'oldest', label: 'Oudste eerst' },
  { value: 'name', label: 'Naam A-Z' },
  { value: 'streak', label: 'Streak' },
  { value: 'mostActive', label: 'Meest actief' },
  { value: 'custom', label: 'Aangepast' },
];

export function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { habits, raceData, entries } = useAppSelector((state) => state.habits);
  const { activeTimers } = useAppSelector((state) => state.timers);
  const { showAddHabitModal, showCelebration, celebrationMessage, settings } = useAppSelector(
    (state) => state.ui
  );

  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Load habits and active timers on mount
  useEffect(() => {
    dispatch(loadHabits());
    dispatch(loadActiveTimers());
  }, [dispatch]);

  // Load race data and streaks when habits change
  useEffect(() => {
    if (habits.length > 0) {
      dispatch(loadAllRaceData());
      // Load streaks
      Promise.all(
        habits.map(async (h) => {
          const streak = await getCurrentStreak(h.id);
          return { id: h.id, streak };
        })
      ).then((results) => {
        const streakMap: Record<string, number> = {};
        results.forEach((r) => {
          streakMap[r.id] = r.streak;
        });
        setStreaks(streakMap);
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

    // Update streaks
    const newStreak = await getCurrentStreak(habitId);
    setStreaks((prev) => ({ ...prev, [habitId]: newStreak }));

    dispatch(triggerCelebration(`${minutes} minuten opgeslagen!`));
  };

  const handleDeleteTimer = async (habitId: string) => {
    await dispatch(deleteTimer(habitId));
  };

  const today = getTodayDate();

  // Count active timers for header
  const activeTimerCount = activeTimers.filter(t => t.isRunning).length;

  // Sort habits based on selected sort option
  const sortedHabits = useMemo(() => {
    const sorted = [...habits];
    const sortOrder = settings?.sortOrder || 'newest';

    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'streak':
        return sorted.sort((a, b) => (streaks[b.id] || 0) - (streaks[a.id] || 0));
      case 'mostActive':
        return sorted.sort((a, b) => {
          const aEntries = entries[a.id]?.length || 0;
          const bEntries = entries[b.id]?.length || 0;
          return bEntries - aEntries;
        });
      case 'custom':
        const customOrder = settings?.customOrder || [];
        if (customOrder.length === 0) return sorted;
        return sorted.sort((a, b) => {
          const aIndex = customOrder.indexOf(a.id);
          const bIndex = customOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      default:
        return sorted;
    }
  }, [habits, settings?.sortOrder, settings?.customOrder, streaks, entries]);

  const handleSortChange = (option: SortOption) => {
    dispatch(setSortOrder(option));
    dispatch(updateSettings({ sortOrder: option }));
    setShowSortMenu(false);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === (settings?.sortOrder || 'newest'))?.label || 'Nieuwste eerst';

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
            {/* Sort dropdown and legend */}
            <div className="flex items-center justify-between mb-4">
              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-vapor-darker/50 rounded-lg text-sm text-white/70 hover:text-white transition-colors"
                >
                  {currentSortLabel}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-1 bg-vapor-dark border border-white/10 rounded-lg shadow-lg z-50 min-w-[160px]"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSortChange(option.value)}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            settings?.sortOrder === option.value
                              ? 'bg-vapor-cyan/20 text-vapor-cyan'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-red-500" /> Voor
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-yellow-400" /> Nu
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-green-500" /> Verslagen
                </span>
              </div>
            </div>

            {/* 2-column grid of race tiles */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {sortedHabits.map((habit) => {
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
