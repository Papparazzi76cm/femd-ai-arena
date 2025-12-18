import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MatchTimerProps {
  isLive: boolean;
  onHalfEnd?: () => void;
}

export const MatchTimer = ({ isLive, onHalfEnd }: MatchTimerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [halfDuration, setHalfDuration] = useState(25); // Default 25 minutes per half
  const [currentHalf, setCurrentHalf] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const totalSecondsInHalf = halfDuration * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && isLive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          
          // Check if half is over
          if (newSeconds >= totalSecondsInHalf && currentHalf < 2) {
            setIsRunning(false);
            onHalfEnd?.();
          }
          
          return newSeconds;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isLive, totalSecondsInHalf, currentHalf, onHalfEnd]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePlayPause = () => {
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

  const handleDurationChange = (newDuration: number) => {
    setHalfDuration(Math.max(1, Math.min(60, newDuration)));
  };

  if (!isLive) return null;

  const progress = (seconds / totalSecondsInHalf) * 100;
  const isOvertime = seconds > totalSecondsInHalf;

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-lg p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium opacity-80">
            {currentHalf === 1 ? '1er Tiempo' : '2do Tiempo'}
          </span>
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/20"
              >
                <Settings className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <Label className="text-xs">Duración por tiempo (min)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={halfDuration}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  className="h-8"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
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
      </div>

      {/* Timer Display */}
      <div className={`text-4xl font-mono font-bold text-center mb-2 ${isOvertime ? 'text-yellow-300' : ''}`}>
        {formatTime(seconds)}
        {isOvertime && <span className="text-lg ml-1">+</span>}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isOvertime ? 'bg-yellow-400' : 'bg-white'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Half Controls */}
      {currentHalf === 1 && seconds >= totalSecondsInHalf && (
        <Button
          onClick={handleNextHalf}
          className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white"
          size="sm"
        >
          Iniciar 2do Tiempo
        </Button>
      )}

      <div className="text-xs text-center mt-2 opacity-70">
        {halfDuration} min por tiempo
      </div>
    </div>
  );
};
