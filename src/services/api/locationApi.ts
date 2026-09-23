import type {LocationTrackDto} from '../../types/api';
import {request, type ApiResult} from './client';

export interface LocationPing {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  recordedAt?: string;
  orderId?: string;
  batchId?: string;
  batteryLevel?: number;
}

export const locationApi = {
  track(body: LocationPing): Promise<ApiResult<LocationTrackDto>> {
    return request<LocationTrackDto>('/picker/locations/track', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
