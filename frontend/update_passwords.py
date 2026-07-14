import re

def update_data():
    with open('src/lib/data.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    start_idx = content.find('export const TEAM_MEMBERS: TeamMember[] = [')
    end_idx = content.find('];', start_idx) + 2

    team_members_str = content[start_idx:end_idx]
    
    # regex to match each team member object and add the two fields right before the closing brace
    updated_str = re.sub(r'(?<=, )(?=\})', r"password: 'Invictus2026', mustChangePassword: true ", team_members_str)
    
    content = content[:start_idx] + updated_str + content[end_idx:]
    
    with open('src/lib/data.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    update_data()
