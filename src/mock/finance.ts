import type {PayMethod} from '../types';

export const PAY_METHODS: Array<{
  id: PayMethod;
  icon: string;
  iconBg: string;
  label: string;
  sub: string;
}> = [
  {
    id: 'upi',
    icon: '📲',
    iconBg: 'rgba(35,114,39,.1)',
    label: 'UPI',
    sub: 'GPay, PhonePe, Paytm & more',
  },
  {
    id: 'bank',
    icon: '🏦',
    iconBg: 'rgba(37,99,235,.1)',
    label: 'Bank transfer',
    sub: 'NEFT / IMPS to hub account',
  },
  {
    id: 'card',
    icon: '💳',
    iconBg: 'rgba(124,58,237,.1)',
    label: 'Card',
    sub: 'Debit or credit at the hub',
  },
];

export function payMethodName(id: string): string {
  return PAY_METHODS.find(m => m.id === id)?.label ?? id;
}

export function depositBtnLabel(method: string): string {
  if (method === 'bank') {
    return 'Confirm bank deposit';
  }
  if (method === 'card') {
    return 'Confirm card deposit';
  }
  return 'Confirm UPI deposit';
}
