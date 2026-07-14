import { PaymentRecord } from './data';

export const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-1',
    clientId: 'CLI-001',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-001',
    amountDue: 62000,
    amountPaid: 62000,
    dueDate: '2026-07-01T00:00:00Z',
    paidDate: '2026-07-03T00:00:00Z',
    status: 'paid',
    overduedays: 0
  },
  {
    id: 'pay-2',
    clientId: 'CLI-004',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-002',
    amountDue: 44000,
    amountPaid: 44000,
    dueDate: '2026-07-01T00:00:00Z',
    paidDate: '2026-07-05T00:00:00Z',
    status: 'paid',
    overduedays: 0
  },
  {
    id: 'pay-3',
    clientId: 'CLI-005',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-003',
    amountDue: 30000,
    amountPaid: 30000,
    dueDate: '2026-07-01T00:00:00Z',
    paidDate: '2026-07-02T00:00:00Z',
    status: 'paid',
    overduedays: 0
  },
  {
    id: 'pay-4',
    clientId: 'CLI-007',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-004',
    amountDue: 58000,
    amountPaid: 29000,
    dueDate: '2026-07-01T00:00:00Z',
    status: 'partial',
    overduedays: 11
  },
  {
    id: 'pay-5',
    clientId: 'CLI-002',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-005',
    amountDue: 20000,
    amountPaid: 0,
    dueDate: '2026-07-05T00:00:00Z',
    status: 'pending',
    overduedays: 7
  },
  {
    id: 'pay-6',
    clientId: 'CLI-003',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-006',
    amountDue: 40000,
    amountPaid: 0,
    dueDate: '2026-07-01T00:00:00Z',
    status: 'overdue',
    overduedays: 11
  },
  {
    id: 'pay-7',
    clientId: 'CLI-003',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-007',
    amountDue: 40000,
    amountPaid: 0,
    dueDate: '2026-07-01T00:00:00Z',
    status: 'overdue',
    overduedays: 11
  },
  {
    id: 'pay-8',
    clientId: 'CLI-008',
    cycleMonth: '2026-07',
    invoiceNumber: 'INV-2026-07-008',
    amountDue: 20000,
    amountPaid: 0,
    dueDate: '2026-07-01T00:00:00Z',
    status: 'pending',
    overduedays: 11
  },
  {
    id: 'pay-9',
    clientId: 'CLI-009',
    cycleMonth: '2026-06',
    invoiceNumber: 'INV-2026-06-009',
    amountDue: 15000,
    amountPaid: 0,
    dueDate: '2026-06-02T00:00:00Z',
    status: 'overdue',
    overduedays: 40
  },
  {
    id: 'pay-10',
    clientId: 'CLI-010',
    cycleMonth: '2026-05',
    invoiceNumber: 'INV-2026-05-010',
    amountDue: 20000,
    amountPaid: 0,
    dueDate: '2026-05-01T00:00:00Z',
    status: 'overdue',
    overduedays: 72
  }
];
