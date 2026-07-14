import re

# 1. ClientHealthWidget
path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/components/dashboard/widgets/ClientHealthWidget.tsx'
with open(path, 'r') as f: content = f.read()
# Replace number with any[] for the lists
content = content.replace('perfMarketingCount: number', 'perfMarketingCount: any[]')
content = content.replace('socialMediaCount: number', 'socialMediaCount: any[]')
content = content.replace('websiteCount: number', 'websiteCount: any[]')
content = content.replace('saasCount: number', 'saasCount: any[]')
with open(path, 'w') as f: f.write(content)

# 2. PaymentsWidget
path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/components/dashboard/widgets/PaymentsWidget.tsx'
with open(path, 'r') as f: content = f.read()
content = content.replace('currentCyclePayments: number', 'currentCyclePayments: any[]')
content = content.replace('olderUnpaidClaims: number', 'olderUnpaidClaims: any[]')
if 'financeBlur: string;' not in content:
    content = content.replace('renderMoney: (amount: number) => string;', 'renderMoney: (amount: number) => string; financeBlur: string;')
if 'financeBlur,' not in content:
    content = content.replace('renderMoney }', 'renderMoney, financeBlur }')
if 'totalOutstanding' in content:
    # We need to compute it
    content = content.replace('export default function PaymentsWidget', 'export default function PaymentsWidget')
    if 'const totalOutstanding' not in content:
        content = content.replace('return (', 'const totalOutstanding = currentCyclePayments.reduce((acc: number, c: any) => acc + c.amount, 0) + olderUnpaidClaims.reduce((acc: number, c: any) => acc + c.amount, 0);\n  return (')
with open(path, 'w') as f: f.write(content)

# 3. SocialMediaWidget
path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/components/dashboard/widgets/SocialMediaWidget.tsx'
with open(path, 'r') as f: content = f.read()
if 'state: any;' not in content:
    content = content.replace('compactMode: boolean;', 'compactMode: boolean; state?: any;')
if 'state }' not in content:
    content = content.replace('compactMode }', 'compactMode, state }')
content = content.replace('((acc, sm)', '((acc: number, sm: any)')
with open(path, 'w') as f: f.write(content)

# 4. TeamSnapshotWidget
path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/components/dashboard/widgets/TeamSnapshotWidget.tsx'
with open(path, 'r') as f: content = f.read()
content = content.replace('notClockedIn: number', 'notClockedIn: any[]')
with open(path, 'w') as f: f.write(content)

print("Widget TS errors fixed!")
