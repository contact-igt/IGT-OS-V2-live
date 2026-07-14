'use client';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MoreHorizontal, Calendar, TrendingUp, Search, Plus, Building2, User, Building } from 'lucide-react';

import { FunnelItem } from '@/lib/data';

export interface FunnelStage {
  id: string;
  name: string;
  color: string; // Theme color (e.g. #3B82F6)
}

interface FunnelEngineProps {
  stages: FunnelStage[];
  initialItems: FunnelItem[];
  onItemMove?: (itemId: string, newStageId: string) => void;
  onItemClick?: (item: FunnelItem) => void;
  onAddDealClick?: () => void;
  funnelName?: string;
}

export default function FunnelEngine({
  stages,
  initialItems,
  onItemMove,
  onItemClick,
  onAddDealClick,
  funnelName = "Sales Pipeline"
}: FunnelEngineProps) {
  const [items, setItems] = useState<FunnelItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsBrowser(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(initialItems);
  }, [initialItems]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStageId = destination.droppableId;
    
    // Optimistic update
    setItems(prev => prev.map(item => 
      item.id === draggableId ? { ...item, stageId: newStageId } : item
    ));

    if (onItemMove) {
      onItemMove(draggableId, newStageId);
    }
  };

  const filteredItems = items.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.company.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (!isBrowser) return <div className="h-full w-full bg-app-surface animate-pulse rounded-xl"></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-app-bg">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 flex-shrink-0 px-8 pt-8">
        <div>
          <h1 className="text-[28px] font-bold text-app-text flex items-center gap-2" style={{ fontFamily: 'var(--font-syne-var)' }}>
            {funnelName}
          </h1>
          <p className="text-app-text2 text-[14px]">Drag and drop opportunities to update their stage.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-app-text3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search deals..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-app-surface border border-app-border rounded-lg text-[13px] font-medium text-app-text focus:outline-none focus:border-primary transition-colors w-[220px]"
            />
          </div>
          <button onClick={onAddDealClick} className="btn-primary py-2 px-4 flex items-center gap-2 text-[13px]">
            <Plus className="w-4 h-4" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto pb-8 px-8 custom-scrollbar">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex h-full gap-4 min-w-max items-start">
            {stages.map((stage) => {
              const stageItems = filteredItems.filter(i => i.stage === stage.id);
              const stageTotal = stageItems.reduce((acc, curr) => acc + curr.value, 0);

              return (
                <div key={stage.id} className="w-[320px] h-full flex flex-col flex-shrink-0">
                  {/* Stage Header */}
                  <div className="pb-2 mb-3 border-b-2 flex-shrink-0" style={{ borderBottomColor: stage.color }}>
                    
                    <div className="flex justify-between items-start mb-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                        <h3 className="font-bold text-text text-[13px] font-grotesk tracking-wide">{stage.name}</h3>
                      </div>
                      <span className="bg-surface text-text-2 text-[11px] font-bold px-2 py-0.5 rounded-full border border-border">
                        {stageItems.length}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold" style={{ color: stage.color }}>
                      {formatCurrency(stageTotal)}
                    </div>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto custom-scrollbar pb-6 px-1 transition-colors \${snapshot.isDraggingOver ? 'bg-surface-2/30' : ''}`}
                      >
                        {stageItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onItemClick && onItemClick(item)}
                                className={`bg-app-surface border p-4 rounded-xl mb-3 cursor-grab hover:border-app-border2 transition-all \${snapshot.isDragging ? 'shadow-2xl scale-[1.02] border-primary z-50 ring-2 ring-primary/20 rotate-1' : 'border-app-border shadow-sm'}`}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-[14px] text-app-text leading-tight group-hover:text-primary transition-colors">
                                    {item.title}
                                  </h4>
                                  <button className="text-app-text3 hover:text-app-text transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                <p className="text-[15px] font-bold mb-3" style={{ color: stage.color }}>
                                  {formatCurrency(item.value)}
                                </p>
                                
                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center gap-2 text-[12px] text-app-text2">
                                    <Building className="w-3.5 h-3.5 text-app-text3" />
                                    <span className="truncate">{item.company}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[12px] text-app-text2">
                                    <User className="w-3.5 h-3.5 text-app-text3" />
                                    <span className="truncate">{item.contactName}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-app-border/60">
                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text3">
                                    <Calendar className="w-3 h-3" />
                                    {item.lastActivity}
                                  </div>
                                  {item.isStale && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                      STALE
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  
                  {/* Footer add button */}
                  <div className="pt-2 flex-shrink-0">
                     <button className="w-full py-2 rounded-lg border border-dashed border-border text-text-3 hover:text-text hover:border-border-strong hover:bg-hover transition-colors flex items-center justify-center gap-1 text-[12px] font-medium">
                       <Plus className="w-4 h-4" /> Add Deal
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
