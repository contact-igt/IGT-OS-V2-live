import re
path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/contexts/AppContext.tsx'
with open(path, 'r') as f: content = f.read()

# Fix TimeEntry
content = content.replace("export interface TimeEntry {", "export interface TimeEntry {\n  date?: string;")
# Fix AttendanceLog
content = content.replace("export interface AttendanceLog {", "export interface AttendanceLog {\n  id?: string;")

with open(path, 'w') as f: f.write(content)
print("AppContext.tsx fixed")
