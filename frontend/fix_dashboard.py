filepath = 'src/app/(app)/dashboard/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace('}>>', '}>')

# Fix closing tag issue from previous script
# src/app/(app)/dashboard/page.tsx(876,5): error TS1005: ')' expected.
content = content.replace('      </ResponsiveGridLayout>\n    </div>\n  );\n}', '      </ResponsiveGridLayout>\n    </div>\n  );\n}')
with open(filepath, 'w') as f:
    f.write(content)
