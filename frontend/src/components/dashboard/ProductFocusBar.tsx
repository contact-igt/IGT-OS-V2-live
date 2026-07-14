interface ProductFocusBarProps {
  productPercent: number;
  clientPercent: number;
}

export function ProductFocusBar({ productPercent, clientPercent }: ProductFocusBarProps) {
  const isOffTrack = productPercent < 80;

  return (
    <div className={`w-full bg-[var(--c-surface)] border rounded-xl p-6 mb-6 transition-colors ${isOffTrack ? 'border-amber-500' : 'border-[var(--c-border)]'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-syne font-bold text-[var(--c-text)] text-sm tracking-wider uppercase">
          PRODUCT FOCUS — This Week
        </h3>
        {isOffTrack && (
          <span className="text-amber-500 font-bold text-xs bg-amber-500/10 px-2 py-1 rounded">
            ⚠ NEEDS ATTENTION
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {/* Product Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-[var(--c-surface-3)] rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${productPercent}%` }}
            />
          </div>
          <div className="w-48 text-sm flex items-center justify-between">
            <span className="font-bold text-[var(--c-text)]">{productPercent}%</span>
            <span className="text-[var(--c-text-2)]">WhatsNexus product</span>
          </div>
        </div>

        {/* Client Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-[var(--c-surface-3)] rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-slate-500 transition-all duration-500"
              style={{ width: `${clientPercent}%` }}
            />
          </div>
          <div className="w-48 text-sm flex items-center justify-between">
            <span className="font-bold text-[var(--c-text)]">{clientPercent}%</span>
            <span className="text-[var(--c-text-2)]">Client delivery</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--c-border)] flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[var(--c-text-2)]">Target: ≥80% product focus</span>
          {isOffTrack ? (
            <span className="text-amber-500 font-bold">⚠ OFF TRACK</span>
          ) : (
            <span className="text-emerald-500 font-bold">✅ ON TRACK</span>
          )}
        </div>
        <div className="text-[var(--c-text-3)] text-xs">
          ⚡ Any week under 80% triggers an alert to Sushil
        </div>
      </div>
    </div>
  );
}
