import type {
  DocumentDto,
  HubDto,
  OnboardingStateDto,
  RiderProfileDto,
  TrainingVideoDto,
  UploadFileDto,
} from '../../types/api';
import {request, requestMultipart, type ApiResult} from './client';

export type KycDocumentType = 'aadhar' | 'pan' | 'dl' | 'rc' | 'ins';
export type KycDocumentSide = 'front' | 'back';

export const profileApi = {
  /** Rider profile (name, vehicle, hub, float) — not the workforce `/user/profile` shape. */
  getProfile(opts?: {soft?: boolean}): Promise<ApiResult<RiderProfileDto>> {
    return request<RiderProfileDto>('/picker/profile', {
      // Soft mode avoids wiping a good session if profile alone 401s mid-hydrate.
      skipUnauthorized: opts?.soft === true,
    });
  },

  updateProfile(
    body: Partial<{
      name: string;
      email: string;
      photoUrl: string;
      vehicleType: string;
      vehicleRegistrationNumber: string;
      hubId: string;
      age: number;
      gender: string;
      upiId: string;
    }>,
  ): Promise<ApiResult<RiderProfileDto>> {
    return request<RiderProfileDto>('/picker/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  getOnboardingState(): Promise<ApiResult<OnboardingStateDto>> {
    return request<OnboardingStateDto>('/picker/onboarding/state');
  },

  submitOnboarding(body?: {
    acceptedTermsVersion?: string;
    acceptedPrivacyVersion?: string;
  }): Promise<
    ApiResult<{
      applicationId?: string;
      status?: 'under_review' | 'approved';
      submittedAt?: string;
      estimatedReviewHours?: number;
    }>
  > {
    return request('/picker/onboarding/submit', {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
      idempotent: true,
    });
  },

  acknowledgeKit(
    items: string[],
    hubId?: string,
  ): Promise<ApiResult<unknown>> {
    return request('/picker/onboarding/kit-ack', {
      method: 'POST',
      body: JSON.stringify({items, hubId}),
    });
  },

  listHubs(coords?: {
    lat: number;
    lng: number;
  }): Promise<ApiResult<HubDto[]>> {
    const q =
      coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
        ? `?lat=${coords.lat}&lng=${coords.lng}`
        : '';
    return request<HubDto[]>(`/picker/work-locations${q}`);
  },

  listDocuments(): Promise<ApiResult<DocumentDto[]>> {
    return request<DocumentDto[]>('/picker/documents');
  },

  /** Multipart KYC upload — form field `file`, plus `type` and `side` (Aadhaar / PAN). */
  uploadDocument(
    type: KycDocumentType,
    photoUri: string,
    opts?: {side?: KycDocumentSide; fileName?: string; mimeType?: string},
  ): Promise<ApiResult<DocumentDto>> {
    const ext = (opts?.fileName || photoUri).split('.').pop()?.toLowerCase();
    const mime =
      opts?.mimeType ||
      (ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'heic' || ext === 'heif'
            ? 'image/heic'
        : ext === 'pdf'
          ? 'application/pdf'
          : 'image/jpeg');
    const name =
      opts?.fileName ||
      `${type}${opts?.side ? `-${opts.side}` : ''}.${
        ext === 'png' || ext === 'pdf' || ext === 'webp' || ext === 'heic'
          ? ext
          : 'jpg'
      }`;

    const form = new FormData();
    form.append('file', {
      uri: photoUri,
      type: mime,
      name,
    } as unknown as Blob);
    // Send both keys — some RN FormData builds overwrite `type` with the file MIME.
    form.append('documentType', type);
    form.append('type', type);
    if (opts?.side) {
      form.append('side', opts.side);
    }
    form.append('fileName', name);

    return requestMultipart<DocumentDto>('/picker/documents', form);
  },

  /** Multipart avatar upload — field `file`, purpose `avatar`. */
  uploadAvatar(
    photoUri: string,
    opts?: {fileName?: string; mimeType?: string},
  ): Promise<ApiResult<UploadFileDto>> {
    const ext = (opts?.fileName || photoUri).split('.').pop()?.toLowerCase();
    const mime =
      opts?.mimeType ||
      (ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'heic' || ext === 'heif'
            ? 'image/heic'
            : 'image/jpeg');
    const name =
      opts?.fileName ||
      `avatar.${ext === 'png' || ext === 'webp' || ext === 'heic' ? ext : 'jpg'}`;
    const form = new FormData();
    form.append('file', {
      uri: photoUri,
      type: mime,
      name,
    } as unknown as Blob);
    form.append('purpose', 'avatar');
    return requestMultipart<UploadFileDto>('/picker/uploads', form);
  },

  listTrainingVideos(
    warehouseKey?: string,
  ): Promise<ApiResult<TrainingVideoDto[]>> {
    const q = warehouseKey
      ? `?warehouseKey=${encodeURIComponent(warehouseKey)}`
      : '';
    return request<TrainingVideoDto[]>(`/picker/training/videos${q}`, {
      skipAuth: true,
    });
  },

  updateTrainingProgress(
    videoId: string,
    progress: number,
  ): Promise<ApiResult<{trainingProgress?: number; trainingCompleted?: boolean}>> {
    return request('/picker/training/watch-progress', {
      method: 'PUT',
      body: JSON.stringify({videoId, progress}),
    });
  },
};
