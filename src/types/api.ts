/** API contract DTOs — aligned with API_CONTRACT.md / selorg-service picker routes. */

export interface ApiErrorBody {
  message?: string;
  code?: number | string;
  appCode?: string;
  details?: unknown;
  detail?: string;
}

export interface ServiceEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiErrorBody | null;
  pagination?: unknown;
  timestamp?: string;
}

export interface AuthUserDto {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  loginMethod: string;
  status: string;
  onboardingCompleted: boolean;
  rejectedReason: string | null;
  role?: string;
  workforceRole?: 'picker' | 'rider' | null;
}

export interface VerifyOtpData {
  success?: boolean;
  message?: string;
  token: string;
  expiresAt?: string;
  isNewUser?: boolean;
  user: AuthUserDto;
  nextScreen: string;
}

export interface RefreshTokenData {
  token: string;
  expiresAt?: string;
  user?: {status: string};
}

export interface RiderProfileDto {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  photoUrl?: string | null;
  status: string;
  isOnline?: boolean;
  onlineSince?: string | null;
  vehicle?: {
    type?: string;
    registrationNumber?: string;
    label?: string;
  } | null;
  deliveryMode?: string;
  hub?: {id: string; name: string} | null;
  stats?: {
    totalTrips?: number;
    onTimePercent?: number;
    rating?: number;
  };
  floatCash?: number;
  kycVerified?: boolean;
  createdAt?: string;
}

export interface DashboardTodayDto {
  date: string;
  codCollected?: number;
  ordersDelivered?: number;
  onlineHours?: number;
  slotsCompleted?: number;
  earnings?: number;
  availableOrdersCount?: number;
  activeOrderId?: string | null;
  activeBatchId?: string | null;
  isOnline?: boolean;
  activeShift?: {timeDisplay?: string} | null;
}

export interface IncentiveTodayDto {
  hasIncentive: boolean;
  title?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  progressPercent?: number;
  progressLabel?: string;
  earnedAmount?: number;
  rewardAmount?: number;
  onTimeCount?: number;
  lateCount?: number;
  footnote?: string;
  expiresAt?: string | null;
}

export interface StartShiftResultDto {
  assignmentId?: string;
  shiftId?: string;
  status?: string;
  startedAt?: string;
  isOnline?: boolean;
  shift?: {timeDisplay?: string} | null;
}

export interface ShiftSlotDto {
  id: string;
  label?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  timeDisplay?: string;
  payDisplay?: string;
  basePayPerHour?: number;
  hasIncentive?: boolean;
  isSurge?: boolean;
  capacity?: number;
  bookedCount?: number;
  remainingSlots?: number;
  booked?: boolean;
  /** Alias of `booked` for some picker clients. */
  isBookedByMe?: boolean;
  status?: string;
  hubId?: string;
  hubName?: string;
  // legacy shape fallbacks
  time?: string;
  name?: string;
  basePay?: number;
  _id?: string;
}

export interface OrderListItemDto {
  id: string;
  num: string;
  raw?: string;
  payout: number;
  deliveryFee?: number;
  pickup: string;
  pickupAddress?: string | null;
  bay?: string;
  bagCode?: string | null;
  deliver: string;
  distanceKm?: number;
  distance?: string;
  etaMinutes?: number;
  time?: string;
  items: number;
  priority?: boolean;
  paymentMode?: string;
  codAmount?: number;
  assignedToMe?: boolean;
  riderStage?: string;
  expiresAt?: string | null;
}

export interface OrderDetailDto {
  id: string;
  num: string;
  raw?: string;
  payout: number;
  deliveryFee?: number;
  /** String label or structured hub object from backend. */
  pickup?:
    | string
    | {
        name?: string;
        address?: string | null;
        latitude?: number | null;
        longitude?: number | null;
      };
  bay?: string;
  deliver: string;
  distanceKm?: number;
  distance?: string;
  etaMinutes?: number;
  time?: string;
  priority?: boolean;
  paymentMode?: string;
  codAmount?: number;
  assignedToMe?: boolean;
  riderStage?: string;
  expiresAt?: string | null;
  status?: string;
  bagCode?: string;
  itemsList?: Array<{name: string; qty: string}>;
  items?: number | Array<{name: string; qty?: string; quantity?: string}>;
  customer?: {
    name?: string;
    phoneMasked?: string;
    maskedPhone?: string;
    phone?: string;
  };
  delivery?: {
    address?: string;
    lat?: number;
    lng?: number;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface OrderStatusUpdateDto {
  id: string;
  riderStage?: string;
  status?: string;
  updatedAt?: string;
  num?: string;
  raw?: string;
  payout?: number;
  deliveryFee?: number;
  distanceKm?: number | null;
  bay?: string | null;
  bagCode?: string | null;
  pickup?:
    | string
    | {
        name?: string;
        address?: string | null;
        latitude?: number | null;
        longitude?: number | null;
      };
  deliver?: string;
  cancellation?: {reason?: string; note?: string; reassigned?: boolean};
}

export interface CompleteDeliveryDto {
  orderId: string;
  completed: boolean;
  deliveredAt?: string;
  summary?: {
    payout?: number;
    tripMinutes?: number;
    distanceKm?: number;
    tripsToday?: number;
  };
  cash?: {collected?: number; cashInHand?: number};
  paymentStatus?: string;
}

export interface ProofPhotoDto {
  photoId: string;
  url?: string;
  orderId?: string;
  stopId?: string;
  uploadedAt?: string;
}

export interface EarningsBreakdownDto {
  period?: {from?: string; to?: string} | string;
  total: number;
  totalDisplay?: string;
  deliveries?: number;
  avgPerOrder?: number;
  onlineHours?: number;
  breakdown?: Array<{
    key?: string;
    label: string;
    amount: number;
    amountDisplay?: string;
  }>;
  nextPayout?: {
    amount?: number;
    dueAt?: string;
    scheduleDisplay?: string;
  };
}

export interface EarningsHistoryDayDto {
  date?: string;
  day?: string;
  dateDisplay?: string;
  orders: number;
  hours?: string;
  hoursDecimal?: number;
  amount?: string;
  amountValue?: number;
}

export interface HistoryOrderDto {
  id: string;
  num: string;
  deliveredAt?: string;
  time?: string;
  addr?: string;
  items?: number;
  dist?: string;
  distanceKm?: number;
  payout: number;
  type?: string;
  batchId?: string | null;
  status?: string;
  codCollected?: number;
}

export interface CashSummaryDto {
  cashInHand: number;
  cashInHandDisplay?: string;
  depositLimit?: number;
  limitExceeded?: boolean;
  depositDueBy?: string | null;
  depositDueDisplay?: string | null;
  collectedToday?: number;
  depositedToday?: number;
  pendingDeposits?: number;
  canGoOffline?: boolean;
  canGoOnline?: boolean;
  codTransferRequired?: boolean;
  transferStatus?: 'clear' | 'pending_transfer' | 'blocked';
  transferMessage?: string | null;
}

export interface CashTxnDto {
  id?: string;
  type?: string;
  amount: number;
  direction?: string;
  label?: string;
  amountDisplay?: string;
  time?: string;
  createdAt?: string;
  orderId?: string | null;
  ref?: string | null;
  method?: string | null;
  status?: string;
}

export interface DepositResultDto {
  ref: string;
  depositId?: string;
  amount: number;
  method?: string;
  methodLabel?: string;
  status?: string;
  createdAt?: string;
  cashInHand?: number;
  cashInHandDisplay?: string;
  receiptUrl?: string | null;
}

export interface BulkStopDto {
  id: string;
  stopId?: string;
  idx?: number;
  customer?: string;
  num?: string;
  addr?: string;
  bag?: string;
  dist?: string;
  eta?: string;
  items?: number;
  status?: string;
  phase?: string;
  bagLoaded?: boolean;
  phone?: string;
  paymentMode?: string;
  codAmount?: number | null;
}

export interface BulkBatchDto {
  id: string;
  status: string;
  vehicle?: string;
  hub?: {id?: string; name?: string};
  totals?: {
    stops?: number;
    orders?: number;
    delivered?: number;
    failed?: number;
    pending?: number;
    remaining?: number;
    bags?: number;
    loadedBags?: number;
    distanceKm?: number;
    estimatedMinutes?: number;
  };
  currentStopId?: string | null;
  currentStopPhase?: string | null;
  orders: BulkStopDto[];
}

export interface BulkBatchListItemDto {
  id: string;
  completedAt?: string;
  whenDisplay?: string;
  route?: string;
  orders?: number;
  delivered?: number;
  failed?: number;
  distanceKm?: number;
  summaryLine?: string;
  earnings?: number;
}

export interface FaqDto {
  id?: string;
  q: string;
  a: string;
  category?: string;
  order?: number;
}

export interface CancelReasonDto {
  id: string;
  label: string;
  subtitle?: string;
  requiresNote?: boolean;
  order?: number;
}

export interface LegalDocumentDto {
  version?: string;
  effectiveDate?: string;
  effectiveDateDisplay?: string;
  lastUpdatedDisplay?: string;
  title?: string;
  sections: Array<{h: string; b: string}>;
  contentHtml?: string;
}

export interface PreferencesDto {
  pushNotifications: boolean;
  locationSharing: boolean;
  orderSoundAlerts: boolean;
  language: string;
  updatedAt?: string;
}

export interface ChatMessageDto {
  id?: string;
  me: boolean;
  text: string;
  senderName?: string;
  createdAt?: string;
  readAt?: string | null;
}

export interface SupportChatDto {
  conversationId?: string;
  status?: string;
  agentOnline?: boolean;
  messages: ChatMessageDto[];
  unreadCount?: number;
}

export interface HubDto {
  id: string;
  name: string;
  address?: string;
  type?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
    latitude?: number | null;
    longitude?: number | null;
  };
  distanceKm?: number;
  distanceDisplay?: string;
  dispatchBays?: number | string;
  isActive?: boolean;
}

export interface DocumentDto {
  _id?: string;
  id?: string;
  type: string;
  side?: 'front' | 'back' | null;
  url?: string;
  fileName?: string;
  status: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  uploadedAt?: string;
}

export interface OnboardingStateDto {
  applicationId?: string;
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  hub?: {id?: string; name?: string} | null;
  steps?: Array<{
    key: string;
    label: string;
    completed: boolean;
    blockedReason?: string | null;
  }>;
  documents?: Array<{
    type: string;
    status: string;
    rejectionReason?: string | null;
  }>;
  kit?: {acknowledged?: boolean};
  training?: {completed?: boolean; progressPercent?: number};
}

export interface TrainingVideoDto {
  videoId: string;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  order?: number;
  isActive?: boolean;
}

export interface LocationTrackDto {
  tracked: boolean;
  recordedAt?: string;
  nextPingSeconds?: number;
}

export interface AppConfigDto {
  otpLength?: number;
  otpResendSeconds?: number;
  codDepositLimit?: number;
  support?: {
    phone?: string;
    email?: string;
    hours?: string;
    emailSlaHours?: number;
  };
  app?: {
    minSupportedVersion?: string;
    latestVersion?: string;
    forceUpdate?: boolean;
    updateUrl?: string | null;
  };
  features?: {
    bulkDelivery?: boolean;
    emailLogin?: boolean;
    [key: string]: boolean | undefined;
  };
  locationPingSeconds?: number;
  languages?: Array<{
    code?: string;
    native?: string;
    english?: string;
    id?: string;
    en?: string;
  }>;
}

export interface NotificationDto {
  id: string;
  type?: string;
  icon?: string;
  color?: string;
  bg?: string;
  title: string;
  body?: string;
  time?: string;
  createdAt?: string;
  read: boolean;
}

export interface WalletBalanceDto {
  availableBalance: number;
  pendingBalance: number;
  reservedBalance: number;
  totalEarnings: number;
  currency?: string;
}

export interface WalletTransactionDto {
  id?: string;
  _id?: string;
  type?: string;
  amount?: number;
  amt?: string;
  description?: string;
  date?: string;
  mode?: string;
  status?: string;
  createdAt?: string;
  currency?: string;
  referenceId?: string;
}

export interface SupportTicketDto {
  id: string;
  ticketNumber?: string;
  subject: string;
  category?: string | null;
  status: string;
  orderId?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  createdAt?: string;
  estimatedResponseHours?: number;
}

export interface CreateTicketResultDto {
  ok?: boolean;
  id: string;
  ticketNumber?: string;
  subject?: string;
  status?: string;
  createdAt?: string;
  estimatedResponseHours?: number;
}

export interface UploadFileDto {
  url: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  purpose?: string;
}
