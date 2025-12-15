import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CelebrationProps {
  message: string;
  onComplete: () => void;
}

// Confetti particle component
function Confetti({ index }: { index: number }) {
  const colors = ['#FF00FF', '#00FFFF', '#FFD700', '#FF6B9D', '#B026FF'];
  const color = colors[index % colors.length];

  const randomX = Math.random() * 100;
  const randomDelay = Math.random() * 0.5;
  const randomDuration = 2 + Math.random() * 2;
  const randomRotation = Math.random() * 720 - 360;

  return (
    <motion.div
      initial={{
        x: `${randomX}vw`,
        y: -20,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        y: '100vh',
        rotate: randomRotation,
        opacity: 0,
      }}
      transition={{
        duration: randomDuration,
        delay: randomDelay,
        ease: 'easeIn',
      }}
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: color,
        borderRadius: index % 2 === 0 ? '50%' : '0',
      }}
    />
  );
}

export function Celebration({ message, onComplete }: CelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 pointer-events-none z-50"
        onClick={onComplete}
      >
        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <Confetti key={i} index={i} />
          ))}
        </div>

        {/* Message */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="bg-vapor-dark/90 backdrop-blur-lg px-8 py-6 rounded-2xl border border-vapor-cyan/30"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="text-4xl text-center mb-2"
            >
              🎉
            </motion.div>
            <div className="text-xl font-display font-bold text-center text-white neon-text">
              {message}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
