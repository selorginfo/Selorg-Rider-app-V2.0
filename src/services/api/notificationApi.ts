import type {NotificationDto} from '../../types/api';
import {request, type ApiResult} from './client';

export const notificationApi = {
  list(page = 1, limit = 20): Promise<ApiResult<NotificationDto[]>> {
    return request<NotificationDto[]>(
      `/picker/notifications?page=${page}&limit=${limit}`,
    );
  },

  markRead(notificationId: string): Promise<ApiResult<{message?: string}>> {
    return request(`/picker/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  markAllRead(): Promise<ApiResult<{modified?: number}>> {
    return request('/picker/notifications/read-all', {method: 'PUT'});
  },
};
