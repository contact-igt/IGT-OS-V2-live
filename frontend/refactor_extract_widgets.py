import os
import re

page_path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/app/(app)/dashboard/page.tsx'
with open(page_path, 'r') as f:
    content = f.read()

# Define extraction regex and replacement for each module
modules = [
    {
        "name": "TasksOverviewWidget",
        "start_marker": "{/* Module 1: Tasks Overview */}",
        "end_marker": "{/* Module 1.5: Team-wise Task Overview */}",
        "component_usage": '<TasksOverviewWidget compactMode={compactMode} activeTasks={activeTasks} tasksDueToday={tasksDueToday} tasksOverdue={tasksOverdue} tasksInReview={tasksInReview} />'
    },
    {
        "name": "TeamTasksWidget",
        "start_marker": "{/* Module 1.5: Team-wise Task Overview */}",
        "end_marker": "{/* Module 2: Team Snapshot */}",
        "component_usage": '<TeamTasksWidget compactMode={compactMode} teamMembers={teamMembers} activeTasks={activeTasks} today={today} />'
    },
    {
        "name": "TeamSnapshotWidget",
        "start_marker": "{/* Module 2: Team Snapshot */}",
        "end_marker": "{/* Module 3: Client Health */}",
        "component_usage": '<TeamSnapshotWidget compactMode={compactMode} presentCount={presentCount} totalTeam={totalTeam} notClockedIn={notClockedIn} presentUserIds={presentUserIds} teamMembers={teamMembers} />'
    },
    {
        "name": "ClientHealthWidget",
        "start_marker": "{/* Module 3: Client Health */}",
        "end_marker": "{/* Module 4: Payment Tracking */}",
        "component_usage": '<ClientHealthWidget compactMode={compactMode} clients={clients} activeHealthyCount={activeHealthyCount} onHoldPaused={onHoldPaused} delayedAtRisk={delayedAtRisk} churnedQtr={churnedQtr} perfMarketingCount={perfMarketingCount} socialMediaCount={socialMediaCount} websiteCount={websiteCount} saasCount={saasCount} />'
    },
    {
        "name": "PaymentsWidget",
        "start_marker": "{/* Module 4: Payment Tracking */}",
        "end_marker": "{/* Module 5: Sales Pipeline */}",
        "component_usage": '{isAdmin && <PaymentsWidget compactMode={compactMode} clients={clients} currentCyclePayments={currentCyclePayments} olderUnpaidClaims={olderUnpaidClaims} totalCollected={totalCollected} totalDue={totalDue} financeVisible={financeVisible} screenShareMode={state.screenShareMode} setFinanceIdleTimer={setFinanceIdleTimer} toggleFinanceVisible={toggleFinanceVisible} renderMoney={renderMoney} /> }'
    },
    {
        "name": "SalesPipelineWidget",
        "start_marker": "{/* Module 5: Sales Pipeline */}",
        "end_marker": "{/* Module 6: Meetings Today */}",
        "component_usage": '{!isOps && <SalesPipelineWidget compactMode={compactMode} router={router} leads={leads} pipelineValue={pipelineValue} leadsInDiscovery={leadsInDiscovery} leadsInProposal={leadsInProposal} leadsInReview={leadsInReview} leadsWonThisMonth={leadsWonThisMonth} leadsLostThisMonth={leadsLostThisMonth} /> }'
    },
    {
        "name": "MeetingsWidget",
        "start_marker": "{/* Module 6: Meetings Today */}",
        "end_marker": "{/* Module 7: Campaign Health (Simplified) */}",
        "component_usage": '<MeetingsWidget compactMode={compactMode} router={router} todayMeetings={todayMeetings} />'
    },
    {
        "name": "CampaignsWidget",
        "start_marker": "{/* Module 7: Campaign Health (Simplified) */}",
        "end_marker": "{/* Module 8: Dev Activity */}",
        "component_usage": '<CampaignsWidget compactMode={compactMode} router={router} />'
    },
    {
        "name": "DevActivityWidget",
        "start_marker": "{/* Module 8: Dev Activity */}",
        "end_marker": "{/* Module 8.5: Social Media Metrics */}",
        "component_usage": '<DevActivityWidget compactMode={compactMode} githubActivity={githubActivity} githubRepos={githubRepos} teamMembers={teamMembers} />'
    },
    {
        "name": "SocialMediaWidget",
        "start_marker": "{/* Module 8.5: Social Media Metrics */}",
        "end_marker": "{/* Module 9: Financials */}",
        "component_usage": '<SocialMediaWidget compactMode={compactMode} />'
    },
    {
        "name": "FinancialsWidget",
        "start_marker": "{/* Module 9: Financials */}",
        "end_marker": "</ResponsiveGridLayout>",
        "component_usage": '{isAdmin && <FinancialsWidget compactMode={compactMode} financeVisible={financeVisible} screenShareMode={state.screenShareMode} renderMoney={renderMoney} financeBlur={financeBlur} /> }'
    }
]

imports_needed = ""

for mod in modules:
    start_idx = content.find(mod["start_marker"])
    end_idx = content.find(mod["end_marker"])
    
    if start_idx != -1 and end_idx != -1:
        extracted_code = content[start_idx:end_idx]
        
        # Check if it has a conditional render wrapper
        # if mod["name"] in ["PaymentsWidget", "SalesPipelineWidget", "FinancialsWidget"]:
        #    # the logic is slightly trickier because we need to extract the JSX out of the conditional
        #    pass
            
        # We will not create the widget files automatically right now because they need imports like `Link`, `GripHorizontal`, `React` etc.
        # But we can replace it in page.tsx
        
        # Replace the code with the component usage
        content = content[:start_idx] + mod["start_marker"] + "\n        <div key=\"" + mod.get("key", mod["name"].lower().replace("widget", "")) + "\">\n          " + mod["component_usage"] + "\n        </div>\n        " + content[end_idx:]
        
        imports_needed += f"import {mod['name']} from '@/components/dashboard/widgets/{mod['name']}';\n"
        
# Add imports to page.tsx
content = content.replace("import 'react-resizable/css/styles.css';", f"import 'react-resizable/css/styles.css';\n{imports_needed}")

with open(page_path, 'w') as f:
    f.write(content)

print("page.tsx updated with widget references!")
