import React from 'react';
import { cn } from '@/lib/utils';

interface AudioLevelIndicatorProps {
  level: number; // 0-100
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AudioLevelIndicator: React.FC<AudioLevelIndicatorProps> = ({
  level,
  isActive,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const barCount = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
  const bars = Array.from({ length: barCount }, (_, index) => {
    const threshold = ((index + 1) / barCount) * 100;
    const isActive = level >= threshold;
    
    return (
      <div
        key={index}
        className={cn(
          'flex-1 rounded-sm transition-all duration-150',
          size === 'sm' ? 'h-1' : size === 'md' ? 'h-1.5' : 'h-2',
          isActive && level > 0
            ? index < barCount * 0.6
              ? 'bg-green-500'
              : index < barCount * 0.8
              ? 'bg-yellow-500'
              : 'bg-red-500'
            : 'bg-gray-300 dark:bg-gray-600'
        )}
        style={{
          opacity: isActive && level > 0 ? 1 : 0.3
        }}
      />
    );
  });

  if (!isActive) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-end gap-0.5',
      sizeClasses[size],
      className
    )}>
      {bars}
    </div>
  );
};

// Alternative circular audio level indicator
export const CircularAudioLevelIndicator: React.FC<AudioLevelIndicatorProps> = ({
  level,
  isActive,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  if (!isActive) {
    return null;
  }

  const radius = size === 'sm' ? 8 : size === 'md' ? 12 : 16;
  const strokeWidth = 2;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (level / 100) * circumference;

  const getColor = () => {
    if (level < 60) return '#10b981'; // green
    if (level < 80) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className={cn(sizeClasses[size], className)}>
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <circle
          stroke={getColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-150"
        />
      </svg>
    </div>
  );
}; 