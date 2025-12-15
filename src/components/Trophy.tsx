import { motion } from 'framer-motion';
import { TROPHIES, TrophyLevel } from '../types';

interface TrophyProps {
  streakDays: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Trophy({ streakDays, showLabel = false, size = 'md' }: TrophyProps) {
  // Find the highest achieved trophy level
  const achievedTrophy = [...TROPHIES]
    .reverse()
    .find((trophy) => streakDays >= trophy.requiredDays);

  if (!achievedTrophy) {
    // No trophy yet - show progress to bronze
    return (
      <div className="flex items-center gap-2">
        <div className={`
          ${size === 'sm' ? 'w-6 h-6 text-sm' : size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-lg'}
          rounded-full bg-vapor-darker/50 flex items-center justify-center
          border border-dashed border-white/20
        `}>
          <span className="opacity-30">🏆</span>
        </div>
        {showLabel && (
          <div className="text-xs text-white/40">
            {3 - streakDays} days to 🥉
          </div>
        )}
      </div>
    );
  }

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  // Find next trophy
  const currentIndex = TROPHIES.findIndex((t) => t.level === achievedTrophy.level);
  const nextTrophy = TROPHIES[currentIndex + 1];
  const daysToNext = nextTrophy ? nextTrophy.requiredDays - streakDays : 0;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`${sizeClasses[size]} relative`}
      >
        <span className="trophy-shine inline-block">{achievedTrophy.emoji}</span>
        {achievedTrophy.level === 'diamond' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 10px rgba(255,215,0,0.3)',
                '0 0 20px rgba(255,215,0,0.6)',
                '0 0 10px rgba(255,215,0,0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
      {showLabel && (
        <div className="text-xs">
          <div className="text-white font-medium">{achievedTrophy.name}</div>
          {nextTrophy && (
            <div className="text-white/40">
              {daysToNext} days to {nextTrophy.emoji}
            </div>
          )}
          {!nextTrophy && (
            <div className="text-vapor-gold">Max level!</div>
          )}
        </div>
      )}
    </div>
  );
}

// Trophy unlock animation overlay
export function TrophyUnlockAnimation({
  trophyLevel,
  onComplete
}: {
  trophyLevel: TrophyLevel;
  onComplete: () => void;
}) {
  const trophy = TROPHIES.find((t) => t.level === trophyLevel);

  if (!trophy) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.2 }}
        className="text-center"
      >
        <motion.div
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 0.6, repeat: 3 }}
          className="text-8xl mb-4"
        >
          {trophy.emoji}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <div className="text-2xl font-display font-bold text-vapor-gold neon-text-gold">
            {trophy.name} Trophy!
          </div>
          <div className="text-white/60">
            {trophy.requiredDays} day streak achieved
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
