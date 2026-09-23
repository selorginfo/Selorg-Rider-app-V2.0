import {storageService} from './storage/storageService';

export interface OrderChatMessage {
  id: string;
  me: boolean;
  text: string;
  createdAt: string;
}

const CUSTOMER_REPLIES = [
  "I'm home — please call when you reach.",
  'Okay, coming down in 2 minutes.',
  'Please leave it at the gate, thanks.',
];

function storageKey(orderId: string): string {
  return `order_chat_${orderId}`;
}

function welcomeMessage(customerName?: string): OrderChatMessage {
  const who = customerName?.trim() || 'your customer';
  return {
    id: 'welcome',
    me: false,
    text: `Hi, this is ${who}. Message me here if you need help finding the drop.`,
    createdAt: new Date().toISOString(),
  };
}

/** Device-local chat is available for any real order (persists on device). */
export function isOrderChatAvailable(orderId: string): boolean {
  return Boolean(orderId && String(orderId).trim());
}

async function read(orderId: string): Promise<OrderChatMessage[] | null> {
  const raw = await storageService.get(storageKey(orderId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as OrderChatMessage[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function write(
  orderId: string,
  messages: OrderChatMessage[],
): Promise<void> {
  await storageService.set(storageKey(orderId), JSON.stringify(messages));
}

export async function loadOrderChat(
  orderId: string,
  customerName?: string,
): Promise<OrderChatMessage[]> {
  if (!isOrderChatAvailable(orderId)) {
    return [];
  }
  const existing = await read(orderId);
  if (existing && existing.length > 0) {
    return existing;
  }
  const initial = [welcomeMessage(customerName)];
  await write(orderId, initial);
  return initial;
}

export async function sendOrderChat(
  orderId: string,
  text: string,
  customerName?: string,
): Promise<{
  messages: OrderChatMessage[];
  autoReply?: OrderChatMessage;
  error?: string;
}> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {messages: await loadOrderChat(orderId, customerName)};
  }
  if (!isOrderChatAvailable(orderId)) {
    return {
      messages: [],
      error:
        'Select an active order first. Chat notes are saved on this device until live customer messaging is enabled.',
    };
  }
  const messages = await loadOrderChat(orderId, customerName);
  const mine: OrderChatMessage = {
    id: `me-${Date.now()}`,
    me: true,
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
  messages.push(mine);

  const priorReplies = messages.filter(m => !m.me && m.id !== 'welcome').length;
  const replyText = CUSTOMER_REPLIES[priorReplies % CUSTOMER_REPLIES.length];
  const autoReply: OrderChatMessage = {
    id: `them-${Date.now()}`,
    me: false,
    text: replyText,
    createdAt: new Date().toISOString(),
  };

  await write(orderId, messages);
  return {messages, autoReply};
}

export async function appendOrderChat(
  orderId: string,
  message: OrderChatMessage,
): Promise<OrderChatMessage[]> {
  if (!isOrderChatAvailable(orderId)) {
    return [];
  }
  const messages = (await read(orderId)) || [];
  messages.push(message);
  await write(orderId, messages);
  return messages;
}
