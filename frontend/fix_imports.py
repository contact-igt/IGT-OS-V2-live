import os
import re

page_path = '/Users/sushil/Downloads/IGT OS v2-Final/IGT-OS-FRONTEND/src/app/(app)/dashboard/page.tsx'
with open(page_path, 'r') as f:
    content = f.read()

imports = """
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import TasksOverviewWidget from '@/components/dashboard/widgets/TasksOverviewWidget';
import TeamTasksWidget from '@/components/dashboard/widgets/TeamTasksWidget';
import TeamSnapshotWidget from '@/components/dashboard/widgets/TeamSnapshotWidget';
import ClientHealthWidget from '@/components/dashboard/widgets/ClientHealthWidget';
import PaymentsWidget from '@/components/dashboard/widgets/PaymentsWidget';
import SalesPipelineWidget from '@/components/dashboard/widgets/SalesPipelineWidget';
import MeetingsWidget from '@/components/dashboard/widgets/MeetingsWidget';
import CampaignsWidget from '@/components/dashboard/widgets/CampaignsWidget';
import DevActivityWidget from '@/components/dashboard/widgets/DevActivityWidget';
import SocialMediaWidget from '@/components/dashboard/widgets/SocialMediaWidget';
import FinancialsWidget from '@/components/dashboard/widgets/FinancialsWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);
"""

if "import { Eye, EyeOff } from 'lucide-react';" in content:
    content = content.replace("import { Eye, EyeOff } from 'lucide-react';", "import { Eye, EyeOff } from 'lucide-react';\n" + imports)
else:
    # Find last import
    last_import = re.findall(r"import .* from '.*';", content)[-1]
    content = content.replace(last_import, last_import + "\n" + imports)

with open(page_path, 'w') as f:
    f.write(content)
