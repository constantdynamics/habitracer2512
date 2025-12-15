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
} from '../store/habitsSlice';
import { setShowAddHabitModal, triggerCelebration, dismissCelebration } from '../store/uiSlice';
import { HabitCard } from '../components/HabitCard';
import { AddHabitModal } from '../components/AddHabitModal';
import { CheckInModal } from '../components/CheckInModal';
import { Celebration } from '../components/Celebration';
import { getTodayDate } from '../db';
import { Habit, PresetHabit } from '../types';
import { getCurrentStreak } from '../services/habitService';

export function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { habits, raceData, entries } = useAppSelector((state) => state.habits);
  const { showAddHabitModal, showCelebration, celebrationMessage } = useAppSelector(
    (state) => state.ui
  );

  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);

  // Load habits on mount
  useEffect(() => {
    dispatch(loadHabits());
  }, [dispatch]);

  // Load race data when habits change
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
          dispatch(triggerCelebration('Bronze Trophy Unlocked! 🥉'));
        } else if (newStreak === 7) {
          dispatch(triggerCelebration('Silver Trophy Unlocked! 🥈'));
        } else if (newStreak === 14) {
          dispatch(triggerCelebration('Gold Trophy Unlocked! 🥇'));
        } else if (newStreak === 30) {
          dispatch(triggerCelebration('Diamond Trophy Unlocked! 💎'));
        } else {
          dispatch(triggerCelebration(`${newStreak} day streak! 🔥`));
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
      dispatch(triggerCelebration('Goal reached! 🎯'));
    }

    setCheckInHabit(null);
  };

  const handleAddHabit = async (preset: PresetHabit) => {
    await dispatch(createHabitFromPreset(preset));
    dispatch(setShowAddHabitModal(false));
    dispatch(triggerCelebration(`${preset.name} added! Let's go! 🚀`));
  };

  const handleViewDetails = (habit: Habit) => {
    if (habit.type === 'quantifiable') {
      setCheckInHabit(habit);
    } else {
      navigate(`/habit/${habit.id}`);
    }
  };

  const today = getTodayDate();

  return (
    <div className="min-h-screen pb-24">
      {/* Background effects */}
      <div className="grid-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-vapor-dark/80 backdrop-blur-lg border-b border-white/10 safe-area-top">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-white">
              Habit<span className="text-vapor-cyan">Racer</span>
            </h1>
            <p className="text-sm text-white/40">Race against yourself</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6">
        {habits.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-xl font-semibold text-white mb-2">Ready to race?</h2>
            <p className="text-white/60 mb-6">
              Add your first habit to start competing against yourself
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch(setShowAddHabitModal(true))}
              className="px-6 py-3 bg-gradient-to-r from-vapor-pink to-vapor-cyan text-white font-semibold rounded-xl glow-button"
            >
              Add Your First Habit
            </motion.button>
          </motion.div>
        ) : (
          // Habits list
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {habits.map((habit) => {
                const habitEntries = entries[habit.id] || [];
                const todayEntry = habitEntries.find((e) => e.date === today);

                return (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    raceData={raceData[habit.id]}
                    todayEntry={todayEntry}
                    currentStreak={streaks[habit.id] || 0}
                    onQuickCheckIn={() => handleQuickCheckIn(habit.id)}
                    onViewDetails={() => handleViewDetails(habit)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FAB - Add habit button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => dispatch(setShowAddHabitModal(true))}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-vapor-pink to-vapor-cyan rounded-full flex items-center justify-center shadow-neon-pink z-40 safe-area-bottom"
      >
        <Plus className="w-6 h-6 text-white" />
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
