'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { STATUS_CONFIG } from '@/lib/data';

interface Props {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  allowAll?: boolean;
}

export default function StatusDropdown({ value, onChange, disabled, allowAll }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        ref.current && !ref.current.contains(event.target as Node) &&
        (!portalRef.current || !portalRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    }
    
    function handleScroll() {
      if (isOpen) setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const isAll = allowAll && value === 'all';
  const config = isAll ? { label: 'All Statuses', color: 'var(--c-text-2)' } : STATUS_CONFIG[value as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.todo;

  return (
    <div className="relative inline-block text-left w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between px-2 py-1.5 border rounded text-[12px] font-bold ${!isAll && 'uppercase'} transition-colors outline-none cursor-pointer`}
        style={{
          borderColor: isAll ? 'var(--c-border)' : config.color,
          color: isAll ? 'var(--c-text)' : config.color,
          backgroundColor: isAll ? 'var(--c-surface)' : `${config.color}15`
        }}
      >
        <span className="truncate">{config.label}</span>
        <ChevronDown className="w-4 h-4 text-app-text3 flex-shrink-0 ml-1" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={portalRef}
          className="absolute z-[9999] border border-app-border rounded-md shadow-lg py-1 min-w-[140px] flex flex-col gap-1 px-1"
          style={{ top: coords.top + 4, left: coords.left, width: Math.max(140, coords.width), backgroundColor: 'var(--c-surface)' }}
        >
          {allowAll && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-[12px] font-bold transition-colors flex items-center gap-2 rounded hover:bg-app-surface2 text-app-text"
              onClick={(e) => {
                e.stopPropagation();
                onChange('all');
                setIsOpen(false);
              }}
            >
              All Statuses
            </button>
          )}
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
            <button
              key={k}
              type="button"
              className="w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase transition-colors flex items-center gap-2 rounded hover:brightness-110"
              style={{ 
                color: cfg.color,
                backgroundColor: `${cfg.color}15`
              }}
              onClick={(e) => {
                e.stopPropagation();
                onChange(k);
                setIsOpen(false);
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
