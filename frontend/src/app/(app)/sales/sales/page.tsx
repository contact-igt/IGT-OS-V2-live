import { Metadata } from 'next';
import SalesContent from '@/components/sales/sales/SalesContent';

export const metadata: Metadata = {
  title: 'Sales | Invictus OS',
};

export default function SalesPage() {
  return <SalesContent />;
}
