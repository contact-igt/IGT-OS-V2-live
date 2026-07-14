import re
import os

filepath = 'src/app/(app)/dashboard/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add imports for react-grid-layout
import_str = """
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
"""
content = re.sub(r"(import Link from 'next/link';\nimport { Eye, EyeOff } from 'lucide-react';)", r"\1\n" + import_str, content)

# Replace the grid container
# Find the line: {/* Grid */}
# Followed by <div className={`grid ...`}>
grid_start_idx = content.find('{/* Grid */}')
if grid_start_idx != -1:
    # Find the start of the div
    div_start = content.find('<div className={`grid', grid_start_idx)
    div_end = content.find('>', div_start) + 1
    
    # We need to add state for layouts
    state_str = """
  const [layouts, setLayouts] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_layouts');
      if (saved) return JSON.parse(saved);
    }
    // Default layout
    const base = [
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
    return { lg: base, md: base, sm: base, xs: base, xxs: base };
  });

  const onLayoutChange = (layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_layouts', JSON.stringify(allLayouts));
    }
  };
"""
    # Insert state before return
    return_idx = content.rfind('return (')
    content = content[:return_idx] + state_str + content[return_idx:]

    # Now replace the grid div with ResponsiveGridLayout
    # And we also need to wrap each module in a div with a key.
    # It's easier to just do it manually with multi_replace_file_content... 
    pass

# We will just write a script to add `key` to all modules and change the wrapper.
