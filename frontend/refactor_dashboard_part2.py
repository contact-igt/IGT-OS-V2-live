import re
import os

filepath = 'src/app/(app)/dashboard/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Replace the grid container
grid_regex = r'<div className=\{`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start \$\{compactMode \? \'gap-4 p-4\' : \'gap-6 p-6\'\}`\}>'
if re.search(grid_regex, content):
    content = re.sub(grid_regex, r'<ResponsiveGridLayout className="layout" layouts={layouts} onLayoutChange={onLayoutChange} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }} rowHeight={150}>', content)

# 1. Tasks
content = content.replace('{/* Module 1: Tasks Overview */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 1: Tasks Overview */}\n        <div key="tasks" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 1.5 Team-wise
content = content.replace('{/* Module 1.5: Team-wise Task Overview */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 1.5: Team-wise Task Overview */}\n        <div key="team-tasks" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm overflow-y-auto custom-scrollbar ${compactMode ? \'p-3\' : \'p-5\'}`}>')

# 2. Team Snapshot
content = content.replace('{/* Module 2: Team Snapshot */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 2: Team Snapshot */}\n        <div key="snapshot" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 3. Client Health (remove row-span-2)
content = content.replace('{/* Module 3: Client Health */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5 row-span-2\'}`}', 
                          '{/* Module 3: Client Health */}\n        <div key="health" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 4. Payments (remove row-span-2)
content = content.replace('{/* Module 4: Payment Tracking */}\n        {isAdmin && (\n        <div \n          className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm relative overflow-hidden ${compactMode ? \'p-3 row-span-1\' : \'p-5 row-span-2\'}`}', 
                          '{/* Module 4: Payment Tracking */}\n        {isAdmin && (\n        <div key="payments"\n          className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm relative overflow-hidden ${compactMode ? \'p-3\' : \'p-5\'}`}')

# 5. Sales Pipeline (remove lg:col-span-2)
content = content.replace('{/* Module 5: Sales Pipeline */}\n        {!isOps && (\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm lg:col-span-2 ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 5: Sales Pipeline */}\n        {!isOps && (\n        <div key="sales" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 6. Meetings Today
content = content.replace('{/* Module 6: Meetings Today */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 6: Meetings Today */}\n        <div key="meetings" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 7. Campaigns
content = content.replace('{/* Module 7: Campaign Health (Simplified) */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 7: Campaign Health (Simplified) */}\n        <div key="campaigns" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 8. Dev Activity (remove xl:col-span-2)
content = content.replace('{/* Module 8: Dev Activity */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm xl:col-span-2 ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 8: Dev Activity */}\n        <div key="dev" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 8.5. Social
content = content.replace('{/* Module 8.5: Social Media Metrics */}\n        <div className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'}`}', 
                          '{/* Module 8.5: Social Media Metrics */}\n        <div key="social" className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm ${compactMode ? \'p-3\' : \'p-5\'} overflow-hidden`}>')

# 9. Financials (remove row-span-2)
content = content.replace('{/* Module 9: Financials */}\n        {isAdmin && (\n          <div \n            className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm relative overflow-hidden ${compactMode ? \'p-3 row-span-1\' : \'p-5 row-span-2\'}`}', 
                          '{/* Module 9: Financials */}\n        {isAdmin && (\n          <div key="financials"\n            className={`border border-[var(--c-border)] rounded-xl bg-[var(--c-surface-2)] flex flex-col shadow-sm relative overflow-hidden ${compactMode ? \'p-3\' : \'p-5\'}`}')

# Replace closing tag of the grid
content = content.replace('      </div>\n    </div>\n  );\n}', '      </ResponsiveGridLayout>\n    </div>\n  );\n}')

with open(filepath, 'w') as f:
    f.write(content)
