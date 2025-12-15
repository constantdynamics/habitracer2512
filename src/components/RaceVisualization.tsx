import { motion } from 'framer-motion';
import { RaceData } from '../types';

interface RaceVisualizationProps {
  raceData: RaceData | undefined;
  compact?: boolean;
  showLabels?: boolean;
}

export function RaceVisualization({ raceData, compact = false, showLabels = true }: RaceVisualizationProps) {
  if (!raceData || raceData.positions.length === 0) {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} rounded bg-vapor-darker/50`}
          />
        ))}
      </div>
    );
  }

  const maxDisplay = compact ? 5 : 10;
  const positions = raceData.positions.slice(0, maxDisplay);

  // Ensure we always show the current position
  const currentPosition = raceData.currentPosition;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {positions.map((pos, index) => {
          const isAhead = pos.position < currentPosition;
          const isCurrent = pos.isCurrent || pos.position === currentPosition;
          const isPR = pos.isPersonalRecord;

          let bgColor = 'bg-green-500'; // Behind (beaten)
          let glowClass = '';

          if (isAhead) {
            bgColor = 'bg-red-500'; // Ahead (need to catch)
          } else if (isCurrent) {
            bgColor = 'bg-yellow-400';
            glowClass = 'shadow-[0_0_10px_rgba(250,204,21,0.8)]';
          }

          if (isPR) {
            glowClass = 'ring-2 ring-vapor-gold shadow-neon-gold';
          }

          return (
            <motion.div
              key={pos.position}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
              className={`
                ${compact ? 'w-4 h-4' : 'w-8 h-8'}
                rounded
                ${bgColor}
                ${glowClass}
                ${isCurrent ? 'race-block-animate' : ''}
                transition-all duration-300
                relative
                group
              `}
              title={`Position ${pos.position}: ${pos.value}`}
            >
              {/* Tooltip on hover for non-compact */}
              {!compact && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-vapor-darkest rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="text-white font-medium">{pos.value}</div>
                  <div className="text-white/60 text-[10px]">{pos.date}</div>
                  {isPR && <div className="text-vapor-gold text-[10px]">Personal Record</div>}
                </div>
              )}

              {/* PR indicator */}
              {isPR && !compact && (
                <span className="absolute -top-1 -right-1 text-xs">👑</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Position label */}
      {showLabels && !compact && (
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>Position {currentPosition} of {raceData.totalPositions}</span>
          {raceData.nextTarget && (
            <span className="text-vapor-cyan">
              {raceData.nextTarget.value - raceData.currentValue > 0 ? '+' : ''}
              {Math.abs(raceData.nextTarget.value - raceData.currentValue).toFixed(0)} to #{raceData.nextTarget.position}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Mini version for dashboard cards
export function RaceVisualizationMini({ raceData }: { raceData: RaceData | undefined }) {
  return <RaceVisualization raceData={raceData} compact showLabels={false} />;
}
