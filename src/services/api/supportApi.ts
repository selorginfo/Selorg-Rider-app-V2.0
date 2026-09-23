import type {
  ChatMessageDto,
  CreateTicketResultDto,
  FaqDto,
  SupportChatDto,
  SupportTicketDto,
} from '../../types/api';
import {request, type ApiResult} from './client';

export const supportApi = {
  getFaqs(limit = 20): Promise<ApiResult<{faqs: FaqDto[]} | FaqDto[]>> {
    return request(`/picker/faq?limit=${limit}`, {skipAuth: true});
  },

  listTickets(
    status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'all' = 'all',
  ): Promise<ApiResult<SupportTicketDto[]>> {
    return request<SupportTicketDto[]>(
      `/picker/support/tickets?status=${status}&limit=20`,
    );
  },

  createTicket(body: {
    subject: string;
    message: string;
    category?: 'payment' | 'order' | 'account' | 'app' | 'other';
    orderId?: string;
    batchId?: string;
  }): Promise<ApiResult<CreateTicketResultDto>> {
    return request<CreateTicketResultDto>('/picker/support/tickets', {
      method: 'POST',
      body: JSON.stringify({
        subject: body.subject,
        message: body.message,
        description: body.message,
        category: body.category || 'other',
        orderId: body.orderId,
        batchId: body.batchId,
      }),
    });
  },

  getChatMessages(limit = 50): Promise<ApiResult<SupportChatDto>> {
    return request<SupportChatDto>(
      `/picker/support/chat/messages?limit=${limit}`,
    );
  },

  sendChatMessage(
    text: string,
    opts?: {orderId?: string; batchId?: string; clientMessageId?: string},
  ): Promise<ApiResult<ChatMessageDto>> {
    return request<ChatMessageDto>('/picker/support/chat/messages', {
      method: 'POST',
      body: JSON.stringify({text, ...opts}),
    });
  },
};
