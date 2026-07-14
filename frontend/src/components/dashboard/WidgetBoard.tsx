'use client';
import { useState, useEffect } from 'react';
import { Responsive, useContainerWidth, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Settings, X, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export interface WidgetConfig {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
}

interface WidgetBoardProps {
  boardId: string;
  availableWidgets: WidgetConfig[];
  defaultLayout: Layout;
}

export default function WidgetBoard({ boardId, availableWidgets, defaultLayout }: WidgetBoardProps) {
  const { state } = useApp();
  const { width, containerRef, mounted } = useContainerWidth();
  const [editMode, setEditMode] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  
  // Load layout from localStorage
  const getSavedLayout = (): Layout => {
    if (typeof window === 'undefined') return defaultLayout;
    const saved = localStorage.getItem(`invictus-dashboard-${boardId}-${state.currentUserId}`);
    return saved ? JSON.parse(saved) : defaultLayout;
  };
  
  const [layouts, setLayouts] = useState<{ lg: Layout }>({ lg: [] });
  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>([]);
  
  useEffect(() => {
    const initialLayout = getSavedLayout();
    setLayouts({ lg: initialLayout });
    setActiveWidgetIds(initialLayout.map(l => l.i));
    setIsClientMounted(true);
  }, [state.currentUserId, boardId]);
  
  const handleLayoutChange = (layout: Layout, allLayouts: any) => {
    if (!isClientMounted) return;
    setLayouts({ lg: layout });
    localStorage.setItem(`invictus-dashboard-${boardId}-${state.currentUserId}`, JSON.stringify(layout));
  };
  
  const removeWidget = (id: string) => {
    const newLayout = layouts.lg.filter(l => l.i !== id);
    setLayouts({ lg: newLayout });
    setActiveWidgetIds(newLayout.map(l => l.i));
    localStorage.setItem(`invictus-dashboard-${boardId}-${state.currentUserId}`, JSON.stringify(newLayout));
  };
  
  const addWidget = (widget: WidgetConfig) => {
    const newLayout = [
      ...layouts.lg, 
      { i: widget.id, x: 0, y: Infinity, w: widget.defaultW, h: widget.defaultH, minW: widget.minW || 2, minH: widget.minH || 2 }
    ];
    setLayouts({ lg: newLayout });
    setActiveWidgetIds([...activeWidgetIds, widget.id]);
    localStorage.setItem(`invictus-dashboard-${boardId}-${state.currentUserId}`, JSON.stringify(newLayout));
    setShowAddWidget(false);
  };
  
  const resetLayout = () => {
    setLayouts({ lg: defaultLayout });
    setActiveWidgetIds(defaultLayout.map(l => l.i));
    localStorage.removeItem(`invictus-dashboard-${boardId}-${state.currentUserId}`);
  };

  if (!isClientMounted) return null;

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <div></div>
        <div className="flex gap-2 relative z-20">
          {editMode && (
            <>
              <button 
                onClick={() => setShowAddWidget(!showAddWidget)}
                className="px-3 py-1.5 bg-primary text-white rounded text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Widget
              </button>
              <button 
                onClick={resetLayout}
                className="px-3 py-1.5 bg-surface-2 text-text-2 border border-border rounded text-xs font-bold hover:text-text"
              >
                Reset Default
              </button>
            </>
          )}
          <button 
            onClick={() => {
              setEditMode(!editMode);
              setShowAddWidget(false);
            }}
            className={`px-3 py-1.5 border rounded text-xs font-bold flex items-center gap-1 transition-colors ${editMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-surface-2 border-border text-text-2 hover:text-text'}`}
          >
            <Settings className="w-3 h-3" />
            {editMode ? 'Done Editing' : 'Edit Layout'}
          </button>
        </div>
      </div>
      
      {showAddWidget && editMode && (
        <div className="mb-6 p-4 border border-border bg-surface rounded-xl shadow-lg relative z-20">
          <h4 className="font-bold text-sm mb-3">Available Widgets</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableWidgets.map(widget => {
              const isAdded = activeWidgetIds.includes(widget.id);
              return (
                <button
                  key={widget.id}
                  disabled={isAdded}
                  onClick={() => addWidget(widget)}
                  className={`p-3 rounded text-left border ${isAdded ? 'opacity-50 cursor-not-allowed bg-surface-2 border-border' : 'hover:border-primary border-border bg-app-surface'}`}
                >
                  <div className="font-bold text-xs">{widget.title}</div>
                  <div className="text-[10px] text-text-3 mt-1">{isAdded ? 'Added' : 'Click to add'}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div 
        ref={containerRef} 
        className={editMode ? 'bg-surface-2/30 rounded-xl border border-dashed border-border p-2 -mx-2' : ''}
      >
        {mounted && (
          <Responsive
            className="layout"
            width={width}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            onLayoutChange={handleLayoutChange}
            dragConfig={{ enabled: editMode }}
            resizeConfig={{ enabled: editMode }}
            margin={[16, 16]}
          >
            {layouts.lg.map(l => {
              const widget = availableWidgets.find(w => w.id === l.i);
              if (!widget) return <div key={l.i}></div>;
              return (
                <div key={l.i} className="flex flex-col relative group">
                  <div className="flex-1 bg-app-surface rounded-xl border border-app-border shadow-sm flex flex-col h-full w-full">
                    {editMode && (
                      <div className="absolute top-2 right-2 z-50 flex gap-1 opacity-100">
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeWidget(l.i); }}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Remove Widget"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {editMode && (
                      <div className="absolute inset-0 bg-primary/5 border-2 border-primary border-dashed rounded-xl z-40 pointer-events-none transition-opacity"></div>
                    )}
                    <div className={`flex-1 flex flex-col overflow-hidden h-full ${editMode ? 'pointer-events-none opacity-50' : ''}`}>
                      {widget.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </Responsive>
        )}
      </div>
    </div>
  );
}
