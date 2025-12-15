import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Zap, Trophy, Target } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { completeOnboarding } from '../store/uiSlice';
import { createHabitFromPreset } from '../store/habitsSlice';
import { PRESET_HABITS, PresetHabit } from '../types';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(0);
  const [selectedHabits, setSelectedHabits] = useState<PresetHabit[]>([]);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Create selected habits
    for (const habit of selectedHabits) {
      await dispatch(createHabitFromPreset(habit));
    }

    await dispatch(completeOnboarding());
    onComplete();
  };

  const toggleHabit = (habit: PresetHabit) => {
    setSelectedHabits((prev) =>
      prev.some((h) => h.name === habit.name)
        ? prev.filter((h) => h.name !== habit.name)
        : [...prev, habit]
    );
  };

  const steps = [
    // Step 0: Welcome
    <motion.div
      key="welcome"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="text-center px-6"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-8xl mb-6"
      >
        🏎️
      </motion.div>
      <h1 className="font-display text-3xl font-bold text-white mb-4">
        Welcome to <span className="text-vapor-cyan">HabitRacer</span>
      </h1>
      <p className="text-white/60 text-lg mb-8">
        Build better habits by racing against your own past performances. No more boring streak counters!
      </p>
      <div className="space-y-4 text-left max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vapor-pink/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-vapor-pink" />
          </div>
          <span className="text-white/80">Compete against yourself</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vapor-cyan/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-vapor-cyan" />
          </div>
          <span className="text-white/80">Earn trophies for streaks</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vapor-gold/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-vapor-gold" />
          </div>
          <span className="text-white/80">Track your progress visually</span>
        </div>
      </div>
    </motion.div>,

    // Step 1: Race explanation
    <motion.div
      key="race"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="text-center px-6"
    >
      <h2 className="font-display text-2xl font-bold text-white mb-6">
        How the Race Works
      </h2>
      <div className="bg-vapor-darker/50 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          {/* Demo race visualization */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-8 h-8 rounded bg-red-500"
            title="Ahead of you"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-8 h-8 rounded bg-red-500"
            title="Ahead of you"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="w-8 h-8 rounded bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] race-block-animate"
            title="You"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className="w-8 h-8 rounded bg-green-500"
            title="Behind you"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="w-8 h-8 rounded bg-green-500 ring-2 ring-vapor-gold"
            title="Your record"
          />
        </div>
        <div className="text-sm text-white/60">Position 3 of 5</div>
      </div>

      <div className="space-y-4 text-left max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-red-500 flex-shrink-0 mt-1" />
          <span className="text-white/80">
            <strong className="text-red-400">Red</strong> = Past performances you need to beat
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-yellow-400 flex-shrink-0 mt-1 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
          <span className="text-white/80">
            <strong className="text-yellow-400">Yellow</strong> = Your current position
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-green-500 flex-shrink-0 mt-1" />
          <span className="text-white/80">
            <strong className="text-green-400">Green</strong> = Performances you've beaten
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-green-500 ring-2 ring-vapor-gold flex-shrink-0 mt-1" />
          <span className="text-white/80">
            <strong className="text-vapor-gold">Gold ring</strong> = Your personal record
          </span>
        </div>
      </div>
    </motion.div>,

    // Step 2: Habit selection
    <motion.div
      key="habits"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="px-6"
    >
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold text-white mb-2">
          Choose Your First Habits
        </h2>
        <p className="text-white/60">
          Select some habits to get started, or skip to create custom ones later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pb-4">
        {PRESET_HABITS.map((habit, index) => {
          const isSelected = selectedHabits.some((h) => h.name === habit.name);
          return (
            <motion.button
              key={habit.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleHabit(habit)}
              className={`
                p-3 rounded-xl flex flex-col items-center gap-2 transition-all
                ${isSelected
                  ? 'bg-vapor-cyan/20 ring-2 ring-vapor-cyan'
                  : 'bg-vapor-darker/50 hover:bg-vapor-darker'
                }
              `}
            >
              <span className="text-2xl">{habit.emoji}</span>
              <span className="text-sm text-white font-medium">{habit.name}</span>
              <span className="text-xs text-white/40">
                {habit.type === 'boolean' ? 'Yes/No' : `${habit.goalValue} ${habit.unit}`}
              </span>
            </motion.button>
          );
        })}
      </div>

      {selectedHabits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-vapor-cyan mt-4"
        >
          {selectedHabits.length} habit{selectedHabits.length !== 1 ? 's' : ''} selected
        </motion.div>
      )}
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-vapor-gradient flex flex-col">
      <div className="grid-overlay" />

      {/* Progress dots */}
      <div className="pt-8 pb-4 flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === step ? 'w-8 bg-vapor-cyan' : i < step ? 'bg-vapor-cyan/50' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center py-8">
        <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="p-6 pb-8 safe-area-bottom">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-vapor-pink to-vapor-cyan text-white font-semibold rounded-xl glow-button flex items-center justify-center gap-2"
        >
          {step === 2 ? (
            selectedHabits.length > 0 ? (
              "Let's Race!"
            ) : (
              "Skip for now"
            )
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </motion.button>

        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-3 py-3 text-white/60 hover:text-white transition-colors"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
