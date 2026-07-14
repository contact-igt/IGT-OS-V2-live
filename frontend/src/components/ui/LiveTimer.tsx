'use client';

import React, { useState, useEffect } from 'react';

interface LiveTimerProps {
  startedAt: number;
  accumulatedMinutes?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function LiveTimer({ startedAt, accumulatedMinutes = 0, className = '', style, format = 'default' }: LiveTimerProps & { format?: 'default' | 'hm' | 'hhmmss' }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000) + (accumulatedMinutes * 60));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000) + (accumulatedMinutes * 60));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startedAt, accumulatedMinutes]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const timeString = format === 'hm' 
    ? `${h}h ${m}m` 
    : format === 'hhmmss'
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return <span className={className} style={style}>{timeString}</span>;
}
