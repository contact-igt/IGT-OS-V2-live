import re

with open("src/app/(app)/home/page.tsx", "r") as f:
    content = f.read()

# Add useApp import
if "useApp" not in content:
    content = content.replace("import { RoleSwitcherCard } from '@/components/dashboard/RoleSwitcherCard';", "import { RoleSwitcherCard } from '@/components/dashboard/RoleSwitcherCard';\nimport { useApp } from '@/contexts/AppContext';")

# Remove hardcoded ROLES
content = re.sub(r'const ROLES = \[.*?\];', '', content, flags=re.DOTALL)

# Update HomePage component to use state.teamMembers
new_home_page = """export default function HomePage() {
  const { state } = useApp();
  
  const getRouteForRole = (role: string) => {
    switch (role) {
      case 'ceo': return '/dashboard';
      case 'ops': return '/dashboard/ops';
      case 'designer': return '/dashboard/designer';
      case 'developer': return '/dashboard/developer';
      case 'ai_developer': return '/dashboard/ai-developer';
      case 'video_editor': return '/dashboard/video-editor';
      case 'marketer': return '/dashboard/marketer';
      case 'sales': return '/dashboard/sales';
      default: return '/dashboard/team';
    }
  };

  const getIconForRole = (role: string) => {
    switch (role) {
      case 'ceo': return '👑';
      case 'ops': return '⚙️';
      case 'designer': return '🎨';
      case 'developer': return '💻';
      case 'ai_developer': return '🤖';
      case 'video_editor': return '🎬';
      case 'marketer': return '📊';
      case 'sales': return '🎯';
      default: return '👤';
    }
  };

  const getColorForRole = (role: string) => {
    switch (role) {
      case 'ceo': return '#2AB182';
      case 'ops': return '#7C3AED';
      case 'designer': return '#F97316';
      case 'developer': return '#3B82F6';
      case 'ai_developer': return '#06B6D4';
      case 'video_editor': return '#F59E0B';
      case 'marketer': return '#EC4899';
      case 'sales': return '#EF4444';
      default: return '#888888';
    }
  };

  const roles = state.teamMembers.map(member => ({
    id: member.id,
    label: member.role.toUpperCase(),
    name: member.name,
    initials: member.name.substring(0, 2).toUpperCase(),
    color: getColorForRole(member.role),
    description: member.department || 'Team Member',
    icon: getIconForRole(member.role),
    route: getRouteForRole(member.role),
  }));

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-8">
      <div className="max-w-6xl w-full mx-auto">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-[var(--c-text)] mb-2" style={{ fontFamily: 'var(--font-syne-var)' }}>
            INVICTUS OS
          </h1>
          <p className="text-[var(--c-text-2)] text-lg">
            Select a workspace to preview
          </p>
          <div className="h-px w-full max-w-sm bg-[var(--c-border)] mt-4"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {roles.map((role) => (
            <RoleSwitcherCard key={role.id} role={role} />
          ))}
        </div>
      </div>
    </div>
  );
}"""

content = re.sub(r'export default function HomePage\(\) \{.*\}', new_home_page, content, flags=re.DOTALL)

with open("src/app/(app)/home/page.tsx", "w") as f:
    f.write(content)
