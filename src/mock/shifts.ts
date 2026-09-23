import type {ShiftSlot} from '../types';

/** Design / fallback slots for My Shifts when the API returns none. */
export const SLOTS: ShiftSlot[] = [
  {
    id: 's1',
    time: '6:00 AM – 10:00 AM',
    label: 'Morning',
    pay: '₹120/hr + incentives',
    booked: true,
  },
  {
    id: 's2',
    time: '10:00 AM – 2:00 PM',
    label: 'Midday',
    pay: '₹120/hr',
    booked: false,
  },
  {
    id: 's3',
    time: '2:00 PM – 6:00 PM',
    label: 'Afternoon',
    pay: '₹130/hr + surge',
    booked: false,
  },
  {
    id: 's4',
    time: '6:00 PM – 10:00 PM',
    label: 'Evening',
    pay: '₹140/hr + incentives',
    booked: false,
  },
];
