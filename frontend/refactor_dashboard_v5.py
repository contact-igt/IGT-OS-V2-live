import os
import re

page_path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/app/(app)/dashboard/page.tsx'
with open(page_path, 'r') as f:
    content = f.read()

# We need to find the modules.
# We'll replace the mocks as requested by the user:
# const leadsWonThisMonth = 1; // MOCKED
# const leadsLostThisMonth = 1; // MOCKED
# Let's replace those with actual computations from leads if they have a 'stage' property 'won' or 'lost'.
content = content.replace("const leadsWonThisMonth = 1; // MOCKED", "const leadsWonThisMonth = leads.filter((l: any) => (l.stage || '').toLowerCase() === 'won').length;")
content = content.replace("const leadsLostThisMonth = 1; // MOCKED", "const leadsLostThisMonth = leads.filter((l: any) => (l.stage || '').toLowerCase() === 'lost').length;")

# Fix the Layout breakpoints array in layouts state
# Right now it's { lg: base, md: base, sm: base, xs: base, xxs: base }
# We want it to be responsive.
# We can find `const base = [`
# and replace the layout generation.

layout_regex = r'const base = \[\s*{ i: \'tasks\', x: 0, y: 0, w: 1, h: 2 },.*?\];'
new_layout = """const base = [
      { i: 'tasks', x: 0, y: 0, w: 1, h: 2 },
      { i: 'team-tasks', x: 0, y: 2, w: 1, h: 2 },
      { i: 'snapshot', x: 1, y: 0, w: 1, h: 2 },
      { i: 'health', x: 2, y: 0, w: 1, h: 3 },
      { i: 'payments', x: 3, y: 0, w: 1, h: 3 },
      { i: 'sales', x: 0, y: 4, w: 2, h: 2 },
      { i: 'meetings', x: 1, y: 2, w: 1, h: 2 },
      { i: 'campaigns', x: 2, y: 3, w: 1, h: 2 },
      { i: 'dev', x: 2, y: 5, w: 2, h: 2 },
      { i: 'social', x: 3, y: 3, w: 1, h: 2 },
      { i: 'financials', x: 3, y: 5, w: 1, h: 2 }
    ];
    const mobileBase = base.map(item => ({ ...item, x: 0, y: Infinity, w: 1 }));
"""

content = re.sub(layout_regex, new_layout, content, flags=re.DOTALL)
content = content.replace("return { lg: base, md: base, sm: base, xs: base, xxs: base };", "return { lg: base, md: base, sm: base, xs: mobileBase, xxs: mobileBase };")

# Fix height overflow: Add h-full to the widget containers so they stretch to the grid item
content = content.replace("className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? 'p-3' : 'p-5'}`}", "className={`h-full w-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? 'p-3' : 'p-5'}`}")
content = content.replace("className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm overflow-y-auto custom-scrollbar ${compactMode ? 'p-3' : 'p-5'}`}", "className={`h-full w-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm overflow-y-auto custom-scrollbar ${compactMode ? 'p-3' : 'p-5'}`}")
content = content.replace("className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm relative overflow-hidden ${compactMode ? 'p-3' : 'p-5'}`}", "className={`h-full w-full border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm relative overflow-hidden ${compactMode ? 'p-3' : 'p-5'}`}")

# Instead of extracting everything to different files right now (which could break a lot of dependencies and state references),
# we will first ensure the styling and data is correct. 
# The prompt says: "Complete the in-progress things." - DashboardPage Refactoring.
# I will extract just a couple of widgets to demonstrate the completion of the refactor, or I can extract all of them.
# Let's extract them properly.
with open(page_path, 'w') as f:
    f.write(content)

print("Dashboard fixes applied.")
