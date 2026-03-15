import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface MatchTimerProps {
  isLive: boolean;
  matchDurationMinutes?: number; // duración total
  matchHalves?: number; // 1 o 2
  startedAt?: string; // ISO timestamp del inicio real
  onStartTimer?: () => void; // callback para guardar started_at en DB
  onHalfEnd?: () => void;
  readOnly?: boolean; // para vista pública sin controles
}

export const MatchTimer = ({ 
  isLive, 
  matchDurationMinutes = 40, 
  matchHalves = 1,
  startedAt,
  onStartTimer,
  onHalfEnd,
  readOnly = false,
}: MatchTimerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [currentHalf, setCurrentHalf] = useState(1);

  const halfDuration = matchHalves === 2 ? matchDurationMinutes / 2 : matchDurationMinutes;
  const totalSecondsInHalf = halfDuration * 60;

  // If startedAt is provided, calculate elapsed time from server
  useEffect(() => {
    if (startedAt && isLive) {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      
      if (matchHalves === 2 && elapsed > totalSecondsInHalf) {
        // We're in the 2nd half
        setCurrentHalf(2);
        setSeconds(elapsed - totalSecondsInHalf);
      } else {
        setSeconds(Math.max(0, elapsed));
      }
      setIsRunning(true);
    }
  }, [startedAt, isLive, totalSecondsInHalf, matchHalves]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && isLive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          if (newSeconds >= totalSecondsInHalf && matchHalves === 2 && currentHalf < 2) {
            // Auto-pause at half-time (only for admin)
            if (!readOnly) {
              setIsRunning(false);
              onHalfEnd?.();
            }
          }
          return newSeconds;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isLive, totalSecondsInHalf, currentHalf, matchHalves, onHalfEnd, readOnly]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePlayPause = () => {
    if (!isRunning && seconds === 0 && !startedAt) {
      // First start - save to DB
      onStartTimer?.();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  const handleNextHalf = () => {
    setCurrentHalf(2);
    setSeconds(0);
    setIsRunning(false);
  };

  if (!isLive) return null;

  const progress = (seconds / totalSecondsInHalf) * 100;
  const isOvertime = seconds > totalSecondsInHalf;

  // Calculate overall match minute for display
  const matchMinute = currentHalf === 2 
    ? Math.floor(totalSecondsInHalf / 60) + Math.floor(seconds / 60)
    : Math.floor(seconds / 60);

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-lg p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium opacity-80">
            {matchHalves === 1 
              ? 'Tiempo único' 
              : currentHalf === 1 ? '1er Tiempo' : '2do Tiempo'
            }
          </span>
          <span className="text-xs opacity-60">
            ({halfDuration} min{matchHalves === 2 ? ' por tiempo' : ''})
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Timer Display */}
      <div className={`text-4xl font-mono font-bold text-center mb-2 ${isOvertime ? 'text-yellow-300' : ''}`}>
        {formatTime(seconds)}
        {isOvertime && <span className="text-lg ml-1">+</span>}
      </div>

      {/* Match minute */}
      <div className="text-center text-sm opacity-80 mb-2">
        Min. {matchMinute}'
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isOvertime ? 'bg-yellow-400' : 'bg-white'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Half Controls - only for admin */}
      {!readOnly && matchHalves === 2 && currentHalf === 1 && seconds >= totalSecondsInHalf && (
        <Button
          onClick={handleNextHalf}
          className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white"
          size="sm"
        >
          Iniciar 2do Tiempo
        </Button>
      )}
    </div>
  );
};
