'use client';

import React from 'react';

interface CircularPunchClockProps {
  clockInTime?: string | null;
  clockOutTime?: string | null;
  totalHoursWorked?: number;
  expectedHours?: number;
  size?: number;
}

export default function CircularPunchClock({
  clockInTime,
  clockOutTime,
  totalHoursWorked = 0,
  expectedHours = 8,
  size = 200
}: CircularPunchClockProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate percentage based on expected hours (max 100%)
  const percentage = Math.min(100, (totalHoursWorked / expectedHours) * 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isActive = clockInTime && !clockOutTime;
  const isComplete = clockInTime && clockOutTime;

  let color = '#64748B'; // Default (gray)
  if (isActive) color = '#3B82F6'; // Blue (working)
  if (isComplete) color = '#10B981'; // Green (done)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Track */}
      <svg className="absolute inset-0 transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--c-border)"
          strokeWidth="10"
          fill="none"
        />
        {/* Progress Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Inner Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {isActive && (
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse mb-1 shadow-[0_0_10px_#3B82F6]" />
        )}
        
        <span className="text-3xl font-bold font-mono tracking-tighter">
          {totalHoursWorked.toFixed(1)}<span className="text-sm text-[var(--c-text-3)] font-sans ml-0.5">h</span>
        </span>
        
        <div className="text-xs text-[var(--c-text-2)] mt-1">
          {isActive ? 'Currently Working' : isComplete ? 'Shift Complete' : 'Not Clocked In'}
        </div>
        
        {(clockInTime || clockOutTime) && (
          <div className="flex items-center gap-2 text-[10px] text-[var(--c-text-3)] mt-2 font-mono uppercase bg-[var(--c-surface)] px-2 py-1 rounded border border-[var(--c-border)]">
            <span>{clockInTime || '--:--'}</span>
            <span>→</span>
            <span>{clockOutTime || '--:--'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
