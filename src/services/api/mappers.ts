import type {FloatTxn, Hub} from '../../types';
import type {CashTxnDto, HubDto} from '../../types/api';

export function mapCashTxnToFloat(t: CashTxnDto): FloatTxn {
  const out =
    t.direction === 'out' ||
    t.direction === 'debit' ||
    t.type === 'deposit' ||
    (t.amount < 0 && !t.direction);
  const abs = Math.abs(t.amount);
  const amt =
    t.amountDisplay ??
    (out ? `−₹${abs.toLocaleString('en-IN')}` : `+₹${abs.toLocaleString('en-IN')}`);
  let time = t.time ?? '';
  if (!time && t.createdAt) {
    time = new Date(t.createdAt).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return {
    label: t.label ?? (t.orderId ? `COD · ${t.orderId}` : 'Transaction'),
    amt,
    pos: !out,
    time: time || '—',
  };
}

export function mapHubDto(h: HubDto): Hub {
  const bays =
    h.dispatchBays != null
      ? `${h.dispatchBays} dispatch bays`
      : 'Dispatch bays';
  return {
    id: h.id,
    name: h.name,
    dist: h.distanceDisplay ?? (h.distanceKm != null ? `${h.distanceKm} km` : '—'),
    addr: h.address ?? '',
    bays,
  };
}
