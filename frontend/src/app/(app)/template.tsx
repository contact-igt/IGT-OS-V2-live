'use client';

export default function Template({ children }: { children: React.ReactNode }) {
  // Removed the artificial 500ms fake loading spinner (anti-slop rule).
  // The layout will render instantly, and data-fetching will trigger real Suspense boundaries if needed.
  return (
    <div className="animate-in fade-in duration-300 h-full">
      {children}
    </div>
  );
}
