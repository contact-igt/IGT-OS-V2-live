import os

page_path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/app/(app)/dashboard/page.tsx'
with open(page_path, 'r') as f:
    content = f.read()

# Define widgets and props
modules = [
    {
        "name": "TeamSnapshotWidget",
        "start_marker": "{/* Module 2: Team Snapshot */}",
        "end_marker": "{/* Module 3: Client Health */}",
        "props": "compactMode: boolean; presentCount: number; totalTeam: number; notClockedIn: number; presentUserIds: string[]; teamMembers: any[];",
        "prop_names": "compactMode, presentCount, totalTeam, notClockedIn, presentUserIds, teamMembers"
    },
    {
        "name": "ClientHealthWidget",
        "start_marker": "{/* Module 3: Client Health */}",
        "end_marker": "{/* Module 4: Payment Tracking */}",
        "props": "compactMode: boolean; clients: any[]; activeHealthyCount: number; onHoldPaused: number; delayedAtRisk: number; churnedQtr: number; perfMarketingCount: number; socialMediaCount: number; websiteCount: number; saasCount: number;",
        "prop_names": "compactMode, clients, activeHealthyCount, onHoldPaused, delayedAtRisk, churnedQtr, perfMarketingCount, socialMediaCount, websiteCount, saasCount"
    },
    {
        "name": "PaymentsWidget",
        "start_marker": "{/* Module 4: Payment Tracking */}",
        "end_marker": "{/* Module 5: Sales Pipeline */}",
        "props": "compactMode: boolean; clients: any[]; currentCyclePayments: number; olderUnpaidClaims: number; totalCollected: number; totalDue: number; financeVisible: boolean; screenShareMode: boolean; setFinanceIdleTimer: (val: number) => void; toggleFinanceVisible: () => void; renderMoney: (amount: number) => string;",
        "prop_names": "compactMode, clients, currentCyclePayments, olderUnpaidClaims, totalCollected, totalDue, financeVisible, screenShareMode, setFinanceIdleTimer, toggleFinanceVisible, renderMoney"
    },
    {
        "name": "SalesPipelineWidget",
        "start_marker": "{/* Module 5: Sales Pipeline */}",
        "end_marker": "{/* Module 6: Meetings Today */}",
        "props": "compactMode: boolean; router: any; leads: any[]; pipelineValue: number; leadsInDiscovery: number; leadsInProposal: number; leadsInReview: number; leadsWonThisMonth: number; leadsLostThisMonth: number;",
        "prop_names": "compactMode, router, leads, pipelineValue, leadsInDiscovery, leadsInProposal, leadsInReview, leadsWonThisMonth, leadsLostThisMonth"
    },
    {
        "name": "MeetingsWidget",
        "start_marker": "{/* Module 6: Meetings Today */}",
        "end_marker": "{/* Module 7: Campaign Health (Simplified) */}",
        "props": "compactMode: boolean; router: any; todayMeetings: any[];",
        "prop_names": "compactMode, router, todayMeetings"
    },
    {
        "name": "CampaignsWidget",
        "start_marker": "{/* Module 7: Campaign Health (Simplified) */}",
        "end_marker": "{/* Module 8: Dev Activity */}",
        "props": "compactMode: boolean; router: any;",
        "prop_names": "compactMode, router"
    },
    {
        "name": "DevActivityWidget",
        "start_marker": "{/* Module 8: Dev Activity */}",
        "end_marker": "{/* Module 8.5: Social Media Metrics */}",
        "props": "compactMode: boolean; githubActivity: any[]; githubRepos: any[]; teamMembers: any[];",
        "prop_names": "compactMode, githubActivity, githubRepos, teamMembers"
    },
    {
        "name": "SocialMediaWidget",
        "start_marker": "{/* Module 8.5: Social Media Metrics */}",
        "end_marker": "{/* Module 9: Financials */}",
        "props": "compactMode: boolean;",
        "prop_names": "compactMode"
    },
    {
        "name": "FinancialsWidget",
        "start_marker": "{/* Module 9: Financials */}",
        "end_marker": "</ResponsiveGridLayout>",
        "props": "compactMode: boolean; financeVisible: boolean; screenShareMode: boolean; renderMoney: (amount: number) => string; financeBlur: string;",
        "prop_names": "compactMode, financeVisible, screenShareMode, renderMoney, financeBlur"
    }
]

for mod in modules:
    start_idx = content.find(mod["start_marker"])
    end_idx = content.find(mod["end_marker"])
    
    if start_idx != -1 and end_idx != -1:
        extracted_code = content[start_idx:end_idx]
        
        # Remove conditional rendering wrapper if it's there
        if mod["name"] == "PaymentsWidget":
            if "isAdmin ? (" in extracted_code:
                extracted_code = extracted_code.split("isAdmin ? (")[1].split(") : (")[0]
        elif mod["name"] == "SalesPipelineWidget":
            if "!isOps ? (" in extracted_code:
                extracted_code = extracted_code.split("!isOps ? (")[1].split(") : (")[0]
        elif mod["name"] == "FinancialsWidget":
            if "isAdmin ? (" in extracted_code:
                extracted_code = extracted_code.split("isAdmin ? (")[1].split(") : (")[0]
            
        # Write the component
        file_path = f"/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/components/dashboard/widgets/{mod['name']}.tsx"
        with open(file_path, "w") as out:
            out.write("import React from 'react';\n")
            out.write("import Link from 'next/link';\n")
            out.write("import { GripHorizontal } from 'lucide-react';\n\n")
            
            props_str = mod['props'].replace('; ', ';\n  ')
            
            out.write(f"interface Props {{\n  {props_str}\n}}\n\n")
            out.write(f"export default function {mod['name']}({{ {mod['prop_names']} }}: Props) {{\n")
            out.write("  return (\n")
            out.write(f"    <>\n{extracted_code}\n    </>\n")
            out.write("  );\n")
            out.write("}\n")
            
print("Widgets generated from local page.tsx!")
