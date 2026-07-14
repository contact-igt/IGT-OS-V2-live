'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useApp } from '@/contexts/AppContext';

interface Props {
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export default function ExportDropdown({ onExportCSV, onExportPDF }: Props) {
  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, right: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
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
        width: rect.width,
        right: window.innerWidth - rect.right
      });
    }
    setIsOpen(!isOpen);
  };

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  if (currentUser?.role === 'team') return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button 
        onClick={handleOpen}
        className="px-3 py-1.5 border border-border rounded bg-surface text-text-2 hover:text-text hover:border-primary transition-colors flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-sm">download</span>
        <span className="text-sm">Export</span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="absolute z-[9999] bg-surface border border-border rounded shadow-lg py-1 w-32"
          style={{ top: coords.top + 4, right: coords.right }}
        >
          <button 
            onClick={() => { setIsOpen(false); onExportCSV(); }} 
            className="w-full text-left px-4 py-2 text-sm text-text-2 hover:text-text hover:bg-surface-2 transition-colors"
          >
            CSV
          </button>
          <button 
            onClick={() => { setIsOpen(false); onExportPDF(); }} 
            className="w-full text-left px-4 py-2 text-sm text-text-2 hover:text-text hover:bg-surface-2 transition-colors"
          >
            PDF (Print)
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
