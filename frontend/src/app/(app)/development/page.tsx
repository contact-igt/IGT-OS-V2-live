import DevContent from '@/components/development/DevContent';

export default function DevelopmentPage() {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 flex-none border-b" style={{ borderColor: 'var(--c-border)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--c-text)' }}>
          Development
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-2)' }}>
          Repositories, projects, and team activity
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <DevContent />
      </div>
    </div>
  );
}
