import re

def update_data():
    with open('src/lib/data.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    start_idx = content.find('export const TEAM_MEMBERS: TeamMember[] = [')
    end_idx = content.find('];', start_idx) + 2

    new_team_members = """export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'u-sushil', name: 'Sushil Athithiyaa', email: 'sushilathithiyaa@invictusglobaltech.com', role: 'super_admin', department: 'Leadership', initials: 'SA', hoursThisWeek: 45, weeklyTarget: 50, color: 'bg-primary', permissions: ['all'], monthlySalaryINR: 40000, roleTag: 'leadership', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-anitha', name: 'Anitha Yogan', email: 'contact@invictusglobaltech.com', role: 'admin', department: 'Operations', initials: 'AY', hoursThisWeek: 42, weeklyTarget: 45, color: 'bg-emerald-500', permissions: ['manage_ops'], monthlySalaryINR: 30000, roleTag: 'ops', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-abhilash', name: 'Abhilash B Nair', email: 'connect@invictusglobaltech.com', role: 'ops', department: 'Operations', initials: 'AB', hoursThisWeek: 40, weeklyTarget: 45, color: 'bg-orange-500', permissions: ['manage_ops'], monthlySalaryINR: 25000, roleTag: 'ops', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-aiswarya', name: 'Aiswarya Saiju', email: 'aiswarya.saiju.igt@gmail.com', role: 'team', department: 'Performance Marketing', initials: 'AS', hoursThisWeek: 35, weeklyTarget: 40, color: 'bg-pink-500', permissions: ['manage_marketing'], monthlySalaryINR: 20000, roleTag: 'performance_marketer', password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-anju', name: 'Anju S', email: 'abhilashb.igt@gmail.com', role: 'team', department: 'Performance Marketing', initials: 'AJ', hoursThisWeek: 32, weeklyTarget: 40, color: 'bg-rose-500', permissions: ['manage_marketing'], monthlySalaryINR: 15000, roleTag: 'performance_marketer', password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-rutuja', name: 'Rutuja', email: 'rutuja.igt@gmail.com', role: 'team', department: 'Performance Marketing', initials: 'RU', hoursThisWeek: 36, weeklyTarget: 40, color: 'bg-teal-500', permissions: ['manage_marketing'], monthlySalaryINR: 20000, roleTag: 'performance_marketer', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-karan', name: 'Karan K', email: 'karan.igt@gmail.com', role: 'team', department: 'Design', initials: 'KA', hoursThisWeek: 39, weeklyTarget: 40, color: 'bg-violet-500', permissions: ['manage_design'], monthlySalaryINR: 25000, roleTag: 'designer', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-basheer', name: 'Basheer', email: 'basheerinvictus@gmail.com', role: 'team', department: 'Video', initials: 'BA', hoursThisWeek: 38, weeklyTarget: 40, color: 'bg-blue-500', permissions: ['manage_video'], monthlySalaryINR: 30000, roleTag: 'video_editor', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-pranesh', name: 'Pranesh Krishnan', email: 'praneshkrishnan.igt@gmail.com', role: 'team', department: 'Video', initials: 'PK', hoursThisWeek: 41, weeklyTarget: 40, color: 'bg-indigo-500', permissions: ['manage_video'], monthlySalaryINR: 35000, roleTag: 'video_editor', password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-iyyappan', name: 'Iyyappan', email: 'iyyappan.igt@gmail.com', role: 'team', department: 'Development', initials: 'IY', hoursThisWeek: 44, weeklyTarget: 40, color: 'bg-cyan-500', permissions: ['manage_dev'], monthlySalaryINR: 25000, roleTag: 'ai_developer', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-naveen', name: 'Naveen Raj', email: 'naveenraj.igt@gmail.com', role: 'team', department: 'Development', initials: 'NR', hoursThisWeek: 40, weeklyTarget: 40, color: 'bg-sky-500', permissions: ['manage_dev'], monthlySalaryINR: 20000, roleTag: 'developer', isHeadOfDepartment: true, password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-veeravel', name: 'Veeravel S', email: 'veeravel.igt@gmail.com', role: 'team', department: 'Web Development', initials: 'VE', hoursThisWeek: 38, weeklyTarget: 40, color: 'bg-fuchsia-500', permissions: ['manage_dev'], monthlySalaryINR: 20000, roleTag: 'web_developer', password: 'Invictus2026', mustChangePassword: true },
  { id: 'u-tania', name: 'Tania Viquar', email: 'tania.viquar.igt@gmail.com', role: 'team', department: 'Operations', initials: 'TV', hoursThisWeek: 20, weeklyTarget: 30, color: 'bg-amber-500', permissions: ['view_ops'], monthlySalaryINR: 8000, roleTag: 'ops', password: 'Invictus2026', mustChangePassword: true },
];"""

    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + new_team_members + content[end_idx:]
        with open('src/lib/data.ts', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated TEAM_MEMBERS")
    else:
        print("Could not find TEAM_MEMBERS")

if __name__ == '__main__':
    update_data()
