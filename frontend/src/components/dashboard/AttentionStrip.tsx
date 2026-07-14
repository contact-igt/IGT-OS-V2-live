import Link from 'next/link';

interface AttentionItem {
  id: string;
  text: string;
  actionText: string;
  actionHref: string;
}

interface AttentionStripProps {
  items: AttentionItem[];
}

export function AttentionStrip({ items }: AttentionStripProps) {
  if (items.length === 0) {
    return (
      <div className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4 mb-6">
        <p className="text-[var(--c-text-2)] text-sm font-medium">Nothing critical today.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-500 font-bold">⚠</span>
        <h3 className="font-syne font-bold text-amber-600 text-sm tracking-wide">NEEDS ATTENTION</h3>
      </div>
      
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-[var(--c-text)] font-medium">• {item.text}</span>
            <Link 
              href={item.actionHref}
              className="text-amber-600 hover:text-amber-700 font-semibold text-xs ml-4"
            >
              [{item.actionText} →]
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
