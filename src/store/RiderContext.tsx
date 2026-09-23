import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {authApi} from '../services/api/authApi';
import {
  clearToken,
  hydrateToken,
  setUnauthorizedHandler,
} from '../services/api/client';
import {profileApi} from '../services/api/profileApi';
import {configApi} from '../services/api/configApi';
import {supportApi} from '../services/api/supportApi';
import {bulkApi} from '../services/api/bulkApi';
import {riderApi} from '../services/api/riderApi';
import {storageService, STORAGE_KEYS} from '../services/storage/storageService';
import {resetTo} from '../navigation/navigationRef';
import {environment} from '../config/environment';
import {isSlotBooked} from './selectors';
import {
  applyRemoteConfig,
  configQueryParams,
  normalizeLanguage,
} from '../config/appConfig';
import {
  enableAndReadGps,
  setLocationSharingEnabled,
} from '../services/location/locationTracker';
import {registerPushTokenIfAvailable} from '../services/push/pushService';
import type {
  BulkExceptionReasonId,
  CancelReasonId,
  ContactVia,
  FlowScreen,
  LoginMethod,
  PayMethod,
} from '../types';
import type {AuthUserDto} from '../types/api';
import {reducer} from './reducer';
import {initialState, RiderState} from './state';
import {normalizeVehicleType} from '../constants/vehicles';
import {
  authTargetError,
  isValidOtp,
  normalizeEmail,
  OTP_LENGTH,
} from '../utils/validation';

type BulkReturn = 'BulkActive' | 'BulkOverview' | 'BulkAllStops';

function mapAccountStatus(user?: AuthUserDto | null): RiderState['accountStatus'] {
  if (!user) {
    return 'none';
  }
  const s = (user.status || '').toLowerCase();
  if (s === 'rejected') {
    return 'rejected';
  }
  if (s === 'pending' || s === 'under_review' || !user.onboardingCompleted) {
    return user.onboardingCompleted ? 'pending' : 'none';
  }
  if (s === 'active' || s === 'approved') {
    return 'approved';
  }
  return 'pending';
}

function nextRouteFromScreen(nextScreen?: string, user?: AuthUserDto | null): keyof import('../types/navigation').RootStackParamList {
  const ns = (nextScreen || '').toLowerCase();
  if (ns.includes('reject')) {
    return 'Rejected';
  }
  if (ns.includes('pending') || ns.includes('review')) {
    return 'Pending';
  }
  if (ns.includes('onboard') || ns.includes('welcome') || ns === 'obwelcome') {
    return 'ObWelcome';
  }
  if (ns === 'main' || ns === 'home') {
    return 'Main';
  }
  const status = (user?.status || '').toLowerCase();
  if (status === 'rejected') {
    return 'Rejected';
  }
  if (status === 'pending' || status === 'under_review') {
    return 'Pending';
  }
  if (!user?.onboardingCompleted) {
    return 'ObWelcome';
  }
  return 'Main';
}

interface RiderActions {
  patch(patch: Partial<RiderState>): void;

  setAuthIntent(i: 'login' | 'signup'): void;
  toggleAuthIntent(): void;
  setLoginMethod(m: LoginMethod): void;
  setPhone(v: string): void;
  setEmail(v: string): void;
  setOtp(v: string): void;
  setOtpDigit(index: number, digit: string): void;
  resetOtp(): void;
  sendOtp(): Promise<{ok: boolean; error?: string}>;
  resendOtp(): Promise<{ok: boolean; error?: string}>;
  verifyOtp(intentOverride?: 'login' | 'signup' | null): Promise<{ok: boolean; error?: string; route?: string}>;

  goOnline(): Promise<{ok: boolean; error?: string; appCode?: string}>;
  goOffline(): Promise<{ok: boolean; error?: string}>;
  openShiftSheet(): void;
  closeShiftSheet(): void;
  pickShift(id: string): void;
  startShift(): void;
  toggleBooked(id: string): Promise<{ok: boolean; error?: string}>;

  acceptOrder(orderId: string): void;
  setFlow(f: Exclude<FlowScreen, null>): void;
  toggleItem(index: number): void;
  togglePhoto(): void;
  finishFlow(): void;

  setObName(v: string): void;
  setObEmail(v: string): void;
  setObVehicle(id: string): void;
  setObVehicleNo(v: string): void;
  setObHub(id: string): void;
  toggleObDoc(code: string): void;
  setObDocs(docs: Record<string, boolean>): void;
  toggleObKit(id: string): void;
  playVideo(): void;
  enableLocation(): Promise<void>;
  submitOnboard(): void;
  approveAccount(): void;
  resubmitDocs(): void;
  enterApp(): void;
  logout(): Promise<void>;

  setPrev(p: 'home' | 'profile'): void;

  openDeposit(): void;
  closeDeposit(): void;
  setDepositAmt(v: string): void;
  depositAll(): void;
  setPayMethod(m: PayMethod): void;
  confirmDeposit(ref: string, amount: number, methodName: string): void;

  setContactVia(v: ContactVia): void;
  setChatInput(v: string): void;
  sendChat(): Promise<{ok: boolean; error?: string} | void>;
  receiveChat(text: string): void;

  openCancel(): void;
  closeCancel(): void;
  setCancelReason(id: CancelReasonId): void;
  setCancelNote(v: string): void;
  confirmCancel(): void;
  finishCancel(): void;

  toggleSetting(
    id: 'push' | 'location' | 'sound',
  ): Promise<{ok: boolean; error?: string}>;
  openLang(): void;
  closeLang(): void;
  setLanguage(id: string): Promise<{ok: boolean; error?: string}>;

  setHistoryFilter(f: 'all' | 'standard' | 'bulk'): void;

  setBulkStatus(s: RiderState['bulkBatchStatus']): void;
  setBulkReturn(r: BulkReturn): void;
  toggleBulkBag(bag: string): Promise<boolean>;
  startBulkDelivery(): Promise<boolean>;
  bulkPhaseAdvance(): void;
  toggleBulkPhoto(): void;
  confirmBulkDelivery(): void;
  setBulkPhase(p: RiderState['bulkStopPhase']): void;
  openStopDetail(idx: number, ret: BulkReturn): void;
  setBulkSearch(v: string): void;
  setBulkFilter(f: RiderState['bulkFilter']): void;
  openException(target: number): void;
  closeException(): void;
  setExceptionReason(id: BulkExceptionReasonId): void;
  setExceptionNote(v: string): void;
  confirmException(): void;
  resetBulkBatch(): void;
}

interface RiderContextValue {
  state: RiderState;
  actions: RiderActions;
  otpRefs: React.MutableRefObject<Record<number, unknown>>;
}

const RiderContext = createContext<RiderContextValue | null>(null);

export function RiderProvider({children}: {children: React.ReactNode}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const otpRefs = useRef<Record<number, unknown>>({});
  const stateRef = useRef(state);
  stateRef.current = state;
  /** True while cold-start session restore is in flight — skip nav resets. */
  const restoringRef = useRef(true);
  /** Bumped on forced logout so in-flight restore can abort safely. */
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Mid-hydrate 401s are owned by the restore effect (skipUnauthorized on
      // profile). Clearing here would wipe a valid token before profile lands.
      if (restoringRef.current) {
        return;
      }
      void clearToken();
      sessionEpochRef.current += 1;
      const wasAuthenticated = stateRef.current.isAuthenticated;
      dispatch({type: 'LOGOUT'});
      // Avoid resetting the stack mid-restore or while already on auth —
      // that remounts Login and looks like a page reload.
      if (!wasAuthenticated) {
        return;
      }
      resetTo('AuthLanding');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    restoringRef.current = true;
    const epochAtStart = sessionEpochRef.current;
    let hydratedToken: string | null = null;

    const finishUnauthenticated = () => {
      dispatch({
        type: 'PATCH',
        patch: {sessionReady: true, isAuthenticated: false},
      });
    };

    const finishFromCachedUser = (user: AuthUserDto) => {
      dispatch({
        type: 'PATCH',
        patch: {
          sessionReady: true,
          isAuthenticated: true,
          accountStatus: mapAccountStatus(user),
          epName: user.name || '',
          epEmail: user.email || '',
          phone: user.phone || '',
          email: user.email || '',
          onboarded: mapAccountStatus(user) === 'approved',
        },
      });
    };

    (async () => {
      let user: AuthUserDto | null = null;
      // Never leave the splash up forever (AsyncStorage / network hangs).
      // If a token was found, only clear the splash — do not force logout while
      // profile is still in flight (that race left riders on AuthLanding).
      const splashWatchdog = setTimeout(() => {
        if (cancelled || stateRef.current.sessionReady) {
          return;
        }
        if (hydratedToken) {
          dispatch({
            type: 'PATCH',
            patch: {sessionReady: true},
          });
          return;
        }
        finishUnauthenticated();
      }, 8000);
      try {
        const {platform, appVersion} = configQueryParams();
        // Do not block the splash on config — apply when it arrives.
        void configApi.getConfig(platform, appVersion).then(remoteConfig => {
          if (!cancelled && remoteConfig.ok) {
            applyRemoteConfig(remoteConfig.data);
          }
        });

        const token = await hydrateToken();
        hydratedToken = token;
        if (cancelled) {
          return;
        }
        if (!token) {
          finishUnauthenticated();
          return;
        }
        const storedUser = await storageService.get(STORAGE_KEYS.user);
        if (storedUser) {
          try {
            user = JSON.parse(storedUser) as AuthUserDto;
          } catch {
            user = null;
          }
        }
        const profile = await profileApi.getProfile({soft: true});
        if (cancelled || sessionEpochRef.current !== epochAtStart) {
          return;
        }
        if (!profile.ok || !profile.data) {
          // Only wipe the session on real auth expiry. Network/5xx must not
          // bounce the rider back to Login (felt as "login page reload").
          if (profile.status === 401) {
            await clearToken();
            finishUnauthenticated();
            return;
          }
          if (user) {
            finishFromCachedUser(user);
            return;
          }
          // Token present, profile unreachable, no cache — keep the token and
          // enter a minimal signed-in shell so a force-stop + slow API does
          // not strand the rider on Log In.
          dispatch({
            type: 'PATCH',
            patch: {
              sessionReady: true,
              isAuthenticated: true,
              onboarded: true,
              accountStatus: 'approved',
            },
          });
          return;
        }
        const p = profile.data;
        const vehicleType =
          normalizeVehicleType(p.vehicle?.type) ?? initialState.vehicleType;
        const prefs = await configApi.getPreferences({soft: true});
        if (cancelled || sessionEpochRef.current !== epochAtStart) {
          return;
        }
        const patch: Partial<RiderState> = {
          sessionReady: true,
          isAuthenticated: true,
          accountStatus: mapAccountStatus(
            user ??
              ({
                id: p.id,
                phone: p.phone,
                email: p.email,
                name: p.name,
                loginMethod: 'mobile',
                status: p.status,
                onboardingCompleted: true,
                rejectedReason: null,
              } as AuthUserDto),
          ),
          epName: p.name || user?.name || '',
          epEmail: p.email || user?.email || '',
          epVehicle: p.vehicle?.registrationNumber || p.vehicle?.label || '',
          epHubId: p.hub?.id || null,
          epHubName: p.hub?.name || null,
          phone: p.phone || user?.phone || '',
          email: p.email || user?.email || '',
          floatingCash: p.floatCash ?? 0,
          onboarded: true,
          vehicleType,
          isOnline: typeof p.isOnline === 'boolean' ? p.isOnline : false,
        };
        // Prefs are best-effort — a prefs 401 must not undo a good profile.
        if (prefs.ok && prefs.data) {
          patch.toggles = {
            push: prefs.data.pushNotifications,
            location: prefs.data.locationSharing,
            sound: prefs.data.orderSoundAlerts,
          };
          patch.language = normalizeLanguage(prefs.data.language);
        }
        dispatch({type: 'PATCH', patch});
      } catch {
        if (!cancelled && sessionEpochRef.current === epochAtStart) {
          // Prefer cached user so a transient error does not force login;
          // otherwise clear so a bad token cannot loop the login screen.
          if (user) {
            finishFromCachedUser(user);
          } else {
            await clearToken();
            finishUnauthenticated();
          }
        }
      } finally {
        clearTimeout(splashWatchdog);
        if (!cancelled) {
          restoringRef.current = false;
          // Ensure splash always clears even if a mid-restore logout raced.
          if (!stateRef.current.sessionReady) {
            dispatch({
              type: 'PATCH',
              patch: {sessionReady: true},
            });
          }
        }
      }
    })();
    return () => {
      cancelled = true;
      restoringRef.current = false;
    };
  }, []);

  const actions = useMemo<RiderActions>(() => {
    const p = (patch: Partial<RiderState>) => dispatch({type: 'PATCH', patch});
    return {
      patch: p,

      setAuthIntent: i => p({authIntent: i, loginNotFound: false}),
      toggleAuthIntent: () =>
        p({
          authIntent:
            stateRef.current.authIntent === 'signup' ? 'login' : 'signup',
          loginNotFound: false,
        }),
      setLoginMethod: m => p({loginMethod: m}),
      setPhone: v => p({phone: v.replace(/\D/g, '').slice(0, 10)}),
      setEmail: v => p({email: v.trim()}),
      setOtp: v =>
        p({
          otp: v.replace(/\D/g, '').slice(0, OTP_LENGTH),
          otpError: '',
        }),
      setOtpDigit: (index, digit) =>
        dispatch({type: 'SET_OTP_DIGIT', index, digit}),
      resetOtp: () => p({otp: '', otpError: ''}),

      sendOtp: async () => {
        const s = stateRef.current;
        const fieldError = authTargetError(s.loginMethod, s.email, s.phone);
        if (fieldError) {
          return {ok: false, error: fieldError};
        }
        p({
          authBusy: true,
          loginNotFound: false,
          otpError: '',
        });
        try {
          const target =
            s.loginMethod === 'email' ? normalizeEmail(s.email) : s.phone;
          const result = await authApi.sendOtp(s.loginMethod, target);
          if (!result.ok) {
            if (result.appCode === 'ACCOUNT_NOT_FOUND') {
              p({loginNotFound: true});
            }
            return {ok: false, error: result.error};
          }
          return {ok: true};
        } catch (err) {
          return {
            ok: false,
            error:
              err instanceof Error && err.message
                ? err.message
                : 'Network unavailable.',
          };
        } finally {
          p({authBusy: false});
        }
      },

      resendOtp: async () => {
        const s = stateRef.current;
        const fieldError = authTargetError(s.loginMethod, s.email, s.phone);
        if (fieldError) {
          return {ok: false, error: fieldError};
        }
        const target =
          s.loginMethod === 'email' ? normalizeEmail(s.email) : s.phone;
        const result = await authApi.resendOtp(s.loginMethod, target);
        if (!result.ok) {
          return {ok: false, error: result.error};
        }
        return {ok: true};
      },

      verifyOtp: async (intentOverride) => {
        const s = stateRef.current;
        const otpLen = OTP_LENGTH;
        if (!isValidOtp(s.otp, otpLen)) {
          return {ok: false, error: `Enter the ${otpLen}-digit code`};
        }
        const fieldError = authTargetError(s.loginMethod, s.email, s.phone);
        if (fieldError) {
          return {ok: false, error: fieldError};
        }
        const intent =
          intentOverride !== undefined
            ? intentOverride
            : s.authIntent || 'login';
        if (intentOverride === 'signup' || intentOverride === 'login') {
          p({authIntent: intentOverride, loginNotFound: false, otpError: ''});
        }
        p({authBusy: true, otpError: ''});
        try {
          const target =
            s.loginMethod === 'email' ? normalizeEmail(s.email) : s.phone;
          const result = await authApi.verifyOtp(
            s.loginMethod,
            target,
            s.otp,
            intent,
          );
          if (!result.ok || !result.data) {
            if (result.appCode === 'ACCOUNT_NOT_FOUND') {
              p({loginNotFound: true, otpError: result.error || ''});
            } else {
              p({
                otpError: result.error || 'Incorrect code. Please try again.',
                otp: '',
              });
            }
            return {ok: false, error: result.error};
          }
          const data = result.data;
          const route = nextRouteFromScreen(data.nextScreen, data.user);
          const patch: Partial<RiderState> = {
            sessionReady: true,
            isAuthenticated: true,
            accountStatus: mapAccountStatus(data.user),
            epName: data.user?.name || '',
            epEmail: data.user?.email || '',
            phone: data.user?.phone || s.phone,
            email: data.user?.email || s.email,
            otpError: '',
            onboarded: route === 'Main',
          };
          if (route === 'Main') {
            const profile = await profileApi.getProfile();
            if (profile.ok && profile.data) {
              const vehicleType = normalizeVehicleType(profile.data.vehicle?.type);
              if (vehicleType) {
                patch.vehicleType = vehicleType;
              }
              patch.epVehicle =
                profile.data.vehicle?.registrationNumber ||
                profile.data.vehicle?.label ||
                patch.epVehicle ||
                '';
              patch.epName = profile.data.name || patch.epName;
              patch.floatingCash = profile.data.floatCash ?? 0;
              if (profile.data.hub?.id) {
                patch.epHubId = profile.data.hub.id;
              } else {
                // Approved rider without a hub must pick one before going online.
                p({...patch, epHubId: null});
                return {ok: true, route: 'ObHub'};
              }
              if (!vehicleType) {
                p(patch);
                return {ok: true, route: 'ObVehicle'};
              }
              if (typeof profile.data.isOnline === 'boolean') {
                patch.isOnline = profile.data.isOnline;
              }
            }
          }
          p(patch);
          return {ok: true, route};
        } catch (err) {
          const message =
            err instanceof Error && err.message
              ? err.message
              : 'Network unavailable.';
          p({otpError: message, otp: ''});
          return {ok: false, error: message};
        } finally {
          p({authBusy: false});
        }
      },

      goOnline: async () => {
        try {
          let location: {latitude: number; longitude: number} | undefined;
          try {
            const {enableAndReadGps} = await import('../services/location/locationTracker');
            const point = await enableAndReadGps();
            location = {latitude: point.latitude, longitude: point.longitude};
          } catch {
            // GPS optional for go-online; backend geofence skips when omitted.
          }
          const result = await riderApi.goOnline(location);
          if (!result.ok) {
            return {
              ok: false,
              error: result.error || 'Could not go online.',
              appCode: result.appCode,
            };
          }
          dispatch({
            type: 'PATCH',
            patch: {
              isOnline: true,
              onlineSince: result.data?.onlineSince || new Date().toISOString(),
              shiftSheetOpen: false,
              epHubName: stateRef.current.epHubName,
            },
          });
          return {ok: true};
        } catch {
          return {ok: false, error: 'Could not go online. Try again.'};
        }
      },
      goOffline: async () => {
        const s = stateRef.current;
        if (s.activeShiftId) {
          const result = await riderApi.endShift(s.activeShiftId);
          if (!result.ok) {
            return {
              ok: false,
              error: result.error || 'Could not end shift. Try again.',
            };
          }
        } else {
          const result = await riderApi.goOffline();
          if (!result.ok) {
            return {
              ok: false,
              error: result.error || 'Could not go offline. Try again.',
            };
          }
        }
        dispatch({type: 'TOGGLE_ONLINE_OFF'});
        dispatch({type: 'PATCH', patch: {onlineSince: null}});
        return {ok: true};
      },
      openShiftSheet: () =>
        p({
          shiftSheetOpen: true,
          pickedShiftId:
            stateRef.current.activeShiftId ||
            stateRef.current.shifts[0]?.id ||
            null,
        }),
      closeShiftSheet: () => p({shiftSheetOpen: false}),
      pickShift: id => p({pickedShiftId: id}),
      startShift: () => dispatch({type: 'START_SHIFT'}),
      toggleBooked: async id => {
        const s = stateRef.current;
        const currentlyBooked = isSlotBooked(s, id);
        const isDummy = !id || !/^[a-f\d]{24}$/i.test(id);
        if (isDummy) {
          return {
            ok: false,
            error: 'Invalid shift. Refresh the list and try again.',
          };
        }
        try {
          const result = await riderApi.bookShift(id, !currentlyBooked);
          if (result.ok) {
            dispatch({type: 'TOGGLE_BOOKED', id});
            return {ok: true};
          }
          return {
            ok: false,
            error: result.error || 'Could not update shift booking',
          };
        } catch {
          return {ok: false, error: 'Could not update shift booking'};
        }
      },

      acceptOrder: orderId => dispatch({type: 'ACCEPT_ORDER', orderId}),
      setFlow: f => p({flowScreen: f}),
      toggleItem: index => dispatch({type: 'TOGGLE_ITEM', index}),
      togglePhoto: () => p({photoTaken: !stateRef.current.photoTaken}),
      finishFlow: () => dispatch({type: 'FINISH_FLOW'}),

      setObName: v => p({obName: v}),
      setObEmail: v => p({obEmail: v}),
      setObVehicle: id => {
        const vehicleType = normalizeVehicleType(id) ?? stateRef.current.vehicleType;
        p({obVehicle: id, vehicleType});
      },
      setObVehicleNo: v => p({obVehicleNo: v.toUpperCase()}),
      setObHub: id => p({obHub: id}),
      toggleObDoc: code => dispatch({type: 'TOGGLE_OB_DOC', code}),
      setObDocs: docs => p({obDocs: docs}),
      toggleObKit: id => dispatch({type: 'TOGGLE_OB_KIT', id}),
      playVideo: () => p({obVideo: true}),
      enableLocation: async () => {
        p({locStage: 'locating'});
        try {
          await enableAndReadGps();
          p({locStage: 'ready'});
        } catch {
          p({locStage: 'idle'});
        }
      },
      submitOnboard: () => p({accountStatus: 'pending'}),
      approveAccount: () => p({accountStatus: 'approved'}),
      resubmitDocs: () => dispatch({type: 'RESUBMIT_DOCS'}),
      enterApp: () => dispatch({type: 'ENTER_APP'}),
      logout: async () => {
        await authApi.logout();
        dispatch({type: 'LOGOUT'});
        resetTo('Login');
      },

      setPrev: pv => p({prev: pv}),

      openDeposit: () =>
        p({depositStage: 'form', depositAmt: '', depositError: ''}),
      closeDeposit: () => p({depositStage: null, depositError: ''}),
      setDepositAmt: v =>
        p({depositAmt: v.replace(/\D/g, '').slice(0, 5), depositError: ''}),
      depositAll: () =>
        p({
          depositAmt: String(stateRef.current.floatingCash),
          depositError: '',
        }),
      setPayMethod: m => p({payMethod: m}),
      confirmDeposit: (ref, amount, methodName) =>
        dispatch({type: 'CONFIRM_DEPOSIT', ref, amount, methodName}),

      setContactVia: v => p({contactVia: v}),
      setChatInput: v => p({chatInput: v}),
      sendChat: async () => {
        const s = stateRef.current;
        const t = s.chatInput.trim();
        if (!t) {
          return {ok: false, error: 'Enter a message.'};
        }
        if (t.length > 2000) {
          return {ok: false, error: 'Message must be at most 2000 characters.'};
        }
        const sent = await supportApi.sendChatMessage(t);
        if (!sent.ok) {
          return {ok: false, error: sent.error || 'Could not send message'};
        }
        const msgs = await supportApi.getChatMessages();
        if (msgs.ok && msgs.data?.messages) {
          p({
            chatInput: '',
            chat: msgs.data.messages.map(m => ({me: m.me, text: m.text})),
          });
        } else {
          p({
            chatInput: '',
            chat: [...s.chat, {me: true, text: t}],
          });
        }
        return {ok: true};
      },
      receiveChat: text => dispatch({type: 'RECEIVE_CHAT', text}),

      openCancel: () =>
        p({cancelStage: 'form', cancelReason: null, cancelNote: ''}),
      closeCancel: () => p({cancelStage: null}),
      setCancelReason: id => p({cancelReason: id}),
      setCancelNote: v => p({cancelNote: v}),
      confirmCancel: () => dispatch({type: 'CONFIRM_CANCEL'}),
      finishCancel: () => dispatch({type: 'FINISH_CANCEL'}),

      toggleSetting: async id => {
        const s = stateRef.current;
        const next = !s.toggles[id];
        dispatch({type: 'TOGGLE_SETTING', id});
        const toggles = {...s.toggles, [id]: next};
        if (id === 'location') {
          setLocationSharingEnabled(next);
        }
        if (id === 'push' && next) {
          void registerPushTokenIfAvailable();
        }
        const result = await configApi.updatePreferences({
          pushNotifications: toggles.push,
          locationSharing: toggles.location,
          orderSoundAlerts: toggles.sound,
        });
        if (result.ok && result.data) {
          p({
            toggles: {
              push: result.data.pushNotifications,
              location: result.data.locationSharing,
              sound: result.data.orderSoundAlerts,
            },
          });
          setLocationSharingEnabled(result.data.locationSharing);
          if (result.data.pushNotifications) {
            void registerPushTokenIfAvailable();
          }
          return {ok: true as const};
        }
        // Roll back optimistic toggle when API fails.
        dispatch({type: 'TOGGLE_SETTING', id});
        setLocationSharingEnabled(s.toggles.location);
        return {
          ok: false as const,
          error: result.error || 'Could not update settings. Try again.',
        };
      },
      openLang: () => p({langOpen: true}),
      closeLang: () => p({langOpen: false}),
      setLanguage: async id => {
        const prev = stateRef.current.language;
        const code = normalizeLanguage(id);
        if (code === prev) {
          p({langOpen: false});
          return {ok: true as const};
        }
        p({language: code});
        const result = await configApi.updatePreferences({language: code});
        if (!result.ok) {
          p({language: prev});
          return {
            ok: false as const,
            error: result.error || 'Could not update language. Try again.',
          };
        }
        if (result.data?.language) {
          p({language: normalizeLanguage(result.data.language)});
        }
        p({langOpen: false});
        return {ok: true as const};
      },

      setHistoryFilter: f => p({historyFilter: f}),

      setBulkStatus: st => p({bulkBatchStatus: st}),
      setBulkReturn: r => p({bulkReturnTo: r}),
      toggleBulkBag: async bag => {
        const s = stateRef.current;
        const willLoad = !s.bulkLoaded[bag];
        if (willLoad) {
          const result = await bulkApi.loadBag(
            bag,
            s.bulkBatchId || undefined,
          );
          if (!result.ok) {
            return false;
          }
        }
        dispatch({type: 'TOGGLE_BULK_BAG', bag});
        return true;
      },
      startBulkDelivery: async () => {
        const s = stateRef.current;
        const result = await bulkApi.startDelivery(
          s.bulkBatchId || undefined,
        );
        if (!result.ok) {
          return false;
        }
        dispatch({type: 'START_BULK_DELIVERY'});
        return true;
      },
      bulkPhaseAdvance: () => dispatch({type: 'BULK_PHASE_ADVANCE'}),
      toggleBulkPhoto: () =>
        p({bulkPhotoTaken: !stateRef.current.bulkPhotoTaken}),
      confirmBulkDelivery: () => dispatch({type: 'CONFIRM_BULK_DELIVERY'}),
      setBulkPhase: ph => p({bulkStopPhase: ph}),
      openStopDetail: (idx, ret) => p({bulkDetailIdx: idx, bulkReturnTo: ret}),
      setBulkSearch: v => p({bulkSearch: v}),
      setBulkFilter: f => p({bulkFilter: f}),
      openException: target =>
        p({
          bulkExceptionOpen: true,
          bulkExceptionTarget: target,
          bulkExceptionReason: null,
          bulkExceptionNote: '',
        }),
      closeException: () => p({bulkExceptionOpen: false}),
      setExceptionReason: id => p({bulkExceptionReason: id}),
      setExceptionNote: v => p({bulkExceptionNote: v}),
      confirmException: () => dispatch({type: 'CONFIRM_BULK_EXCEPTION'}),
      resetBulkBatch: () => dispatch({type: 'RESET_BULK_BATCH'}),
    };
  }, []);

  const value = useMemo<RiderContextValue>(
    () => ({state, actions, otpRefs}),
    [state, actions],
  );

  return (
    <RiderContext.Provider value={value}>{children}</RiderContext.Provider>
  );
}

export function useRider(): RiderContextValue {
  const ctx = useContext(RiderContext);
  if (!ctx) {
    throw new Error('useRider must be used within <RiderProvider>');
  }
  return ctx;
}

export {nextRouteFromScreen, mapAccountStatus};
