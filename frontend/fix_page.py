import re
path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/app/(app)/dashboard/page.tsx'
with open(path, 'r') as f: content = f.read()

# 1. Add compactMode
if 'const [compactMode' not in content:
    content = content.replace('const [financeVisible, setFinanceVisible] = useState(false);', 'const [financeVisible, setFinanceVisible] = useState(false);\n  const [compactMode, setCompactMode] = useState(false);')

# 2. Add isOps
if 'const isOps' not in content:
    content = content.replace('const { state } = useApp();', 'const { state } = useApp();\n  const isOps = state.user?.role === "ops";')

# 3. Add renderMoney
if 'const renderMoney =' not in content:
    content = content.replace('const isAdmin = state.user?.role === "admin" || state.user?.role === "superadmin";', 'const isAdmin = state.user?.role === "admin" || state.user?.role === "superadmin";\n  const renderMoney = (amount: number) => `₹${(amount/100000).toFixed(1)}L`;\n  const financeBlur = financeVisible ? "" : "blur-md pointer-events-none";')

with open(path, 'w') as f: f.write(content)
print("page.tsx fixed")
