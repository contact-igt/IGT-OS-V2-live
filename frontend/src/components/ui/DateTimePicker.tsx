'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DateTimePickerProps {
  value: string; // ISO format or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date & time...',
  className = '',
  error = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 280 });

  // Internal state for calendar navigation & selection
  const initialDate = value ? new Date(value) : new Date();
  const validInitial = !isNaN(initialDate.getTime()) ? initialDate : new Date();

  const [currentMonth, setCurrentMonth] = useState(validInitial.getMonth());
  const [currentYear, setCurrentYear] = useState(validInitial.getFullYear());

  const [selectedDay, setSelectedDay] = useState<number>(validInitial.getDate());
  const [selectedHours, setSelectedHours] = useState<number>(validInitial.getHours());
  const [selectedMinutes, setSelectedMinutes] = useState<number>(validInitial.getMinutes());

  // Sync internal state when prop value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
        setSelectedDay(d.getDate());
        setSelectedHours(d.getHours());
        setSelectedMinutes(d.getMinutes());
      }
    }
  }, [value]);

  // Position popover relative to trigger element
  const handleOpenPopover = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      const left = Math.min(rect.left + window.scrollX, window.innerWidth - popoverWidth - 16);
      
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: Math.max(16, left),
        width: popoverWidth,
      });
    }
    setIsOpen(!isOpen);
  };

  // Close popover when clicking outside trigger or popover
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScroll(event: Event) {
      if (popoverRef.current && event.target instanceof Node && popoverRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  // Helper calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Construct selected date
    const d = new Date(currentYear, currentMonth, selectedDay, selectedHours, selectedMinutes);
    const isoString = d.toISOString();
    onChange(isoString);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
    setIsOpen(false);
  };

  // Format display string
  const formatDisplay = () => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Convert hours to 12h format for UI display
  const isPM = selectedHours >= 12;
  const displayHours12 = selectedHours % 12 === 0 ? 12 : selectedHours % 12;

  return (
    <div className="relative w-full" onClick={e => e.stopPropagation()}>
      {/* Input trigger box */}
      <div
        ref={triggerRef}
        onClick={handleOpenPopover}
        className={`input-base flex items-center justify-between cursor-pointer select-none ${
          error ? 'border-red-500' : ''
        } ${className}`}
      >
        <span className={`text-[13px] ${value ? 'text-[var(--c-text)] font-medium' : 'text-[var(--c-text-3)]'}`}>
          {value ? formatDisplay() : placeholder}
        </span>
        <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--c-text-3)' }}>
          calendar_today
        </span>
      </div>

      {/* Floating Popover Portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={e => e.stopPropagation()}
            className="fixed z-[999] rounded-2xl shadow-2xl p-4 border flex flex-col"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              background: 'var(--c-surface)',
              borderColor: 'var(--c-border-strong)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header: Month & Year navigation with scrollable selectors */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--c-border)]">
              <div className="flex items-center gap-1">
                <select
                  value={currentMonth}
                  onChange={e => {
                    e.stopPropagation();
                    setCurrentMonth(Number(e.target.value));
                  }}
                  className="bg-transparent font-bold text-[13px] text-[var(--c-text)] cursor-pointer outline-none hover:text-[#2563EB] transition-colors"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx} className="bg-[var(--c-surface)] text-[var(--c-text)]">
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={e => {
                    e.stopPropagation();
                    setCurrentYear(Number(e.target.value));
                  }}
                  className="bg-transparent font-bold text-[13px] text-[var(--c-text)] cursor-pointer outline-none hover:text-[#2563EB] transition-colors"
                >
                  {Array.from({ length: 20 }).map((_, idx) => {
                    const yr = 2020 + idx;
                    return (
                      <option key={yr} value={yr} className="bg-[var(--c-surface)] text-[var(--c-text)]">
                        {yr}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-[var(--c-surface-2)] text-[var(--c-text-2)] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-[var(--c-surface-2)] text-[var(--c-text-2)] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Scrollable Calendar Body */}
            <div className="overflow-y-auto max-h-[340px] custom-scrollbar pr-1">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-bold text-[var(--c-text-3)]">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 text-center gap-1 mb-4">
              {/* Empty padding cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = selectedDay === day;
                const today = new Date();
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === currentMonth &&
                  today.getFullYear() === currentYear;

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedDay(day);
                    }}
                    className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-[12px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#2563EB] text-white font-bold shadow'
                        : isToday
                        ? 'border border-[#2563EB] text-[#2563EB]'
                        : 'text-[var(--c-text)] hover:bg-[var(--c-surface-2)]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time Selector Section */}
            <div className="pt-3 border-t border-[var(--c-border)] mb-4 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--c-text-3)]">
                Time
              </span>
              <div className="flex items-center gap-1">
                {/* Hours selector */}
                <select
                  value={displayHours12}
                  onChange={e => {
                    e.stopPropagation();
                    const h12 = parseInt(e.target.value, 10);
                    const newH = isPM ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
                    setSelectedHours(newH);
                  }}
                  className="input-base text-[12px] py-1 px-1.5 w-14 text-center"
                >
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const h = idx + 1;
                    return (
                      <option key={`h-${h}`} value={h}>
                        {String(h).padStart(2, '0')}
                      </option>
                    );
                  })}
                </select>

                <span className="font-bold text-[14px] text-[var(--c-text-2)]">:</span>

                {/* Minutes selector */}
                <select
                  value={selectedMinutes}
                  onChange={e => {
                    e.stopPropagation();
                    setSelectedMinutes(parseInt(e.target.value, 10));
                  }}
                  className="input-base text-[12px] py-1 px-1.5 w-14 text-center"
                >
                  {Array.from({ length: 60 }).map((_, m) => (
                    <option key={`m-${m}`} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (isPM) {
                      setSelectedHours(selectedHours - 12);
                    } else {
                      setSelectedHours(selectedHours + 12);
                    }
                  }}
                  className="ml-1 px-2 py-1 rounded-lg text-[11px] font-bold uppercase border border-[var(--c-border)] bg-[var(--c-surface-2)] text-[var(--c-text)] hover:border-[#2563EB]"
                >
                  {isPM ? 'PM' : 'AM'}
                </button>
              </div>
            </div>
          </div>

            {/* Bottom Footer Actions: Clear & Confirm */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--c-border)]">
              <button
                type="button"
                onClick={handleClear}
                className="text-[12px] font-semibold text-red-500 hover:underline px-2 py-1"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="btn-primary text-[12px] font-bold px-4 py-1.5 rounded-lg shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
