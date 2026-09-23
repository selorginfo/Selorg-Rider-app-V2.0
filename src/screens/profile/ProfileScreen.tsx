import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {GradientView} from '../../components/common/GradientView';
import {SavedSummaryCard} from '../../components/common/SavedSummaryCard';
import {AppIcon, type AppIconName} from '../../components/common/AppIcon';
import {BottomSheet} from '../../components/bottomSheets/BottomSheet';
import {StatTile} from '../../components/cards/StatTile';
import {LabeledInput} from '../../components/inputs/LabeledInput';
import {RadioRow} from '../../components/inputs/RadioRow';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {profileApi} from '../../services/api';
import {
  pickFromCamera,
  pickFromGallery,
  type PickedDocumentImage,
} from '../../services/media/pickDocumentImage';
import {environment} from '../../config/environment';
import {
  emailError,
  NAME_MAX,
  nameError,
  normalizeEmail,
  normalizeVehicleReg,
  VEHICLE_REG_MAX,
  vehicleRegError,
} from '../../utils/validation';
import {colors, radius, shadow} from '../../theme';
import type {HubDto} from '../../types/api';
import type {RootStackParamList} from '../../types/navigation';

interface MenuItem {
  icon: AppIconName;
  bg: string;
  label: string;
  sub: string;
  route: keyof RootStackParamList;
}

type DetailsPhase = 'view' | 'edit';

interface AccountDetails {
  name: string;
  email: string;
  vehicle: string;
  vehicleLabel: string;
  deliveryType: string;
  hubId: string;
  hubName: string;
}

export function ProfileScreen() {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const {state, actions} = useRider();
  const [trips, setTrips] = useState('—');
  const [onTime, setOnTime] = useState('—');
  const [rating, setRating] = useState('—');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [kycVerified, setKycVerified] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [detailsPhase, setDetailsPhase] = useState<DetailsPhase>('view');
  const [savedDetails, setSavedDetails] = useState<AccountDetails | null>(null);
  const [draft, setDraft] = useState<AccountDetails>({
    name: '',
    email: '',
    vehicle: '',
    vehicleLabel: '',
    deliveryType: '',
    hubId: '',
    hubName: '',
  });
  const [hubs, setHubs] = useState<{id: string; name: string; addr: string}[]>(
    [],
  );
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    vehicle: false,
  });

  const applyAccountFromProfile = useCallback(
    (p: {
      name?: string | null;
      email?: string | null;
      deliveryMode?: string | null;
      vehicle?: {
        type?: string | null;
        registrationNumber?: string;
        label?: string;
      } | null;
      hub?: {id: string; name: string} | null;
      floatCash?: number;
    }) => {
      const mode =
        p.deliveryMode === 'bulk' ||
        String(p.vehicle?.type || '').match(/auto|van/i)
          ? 'Bulk Delivery'
          : 'Standard Delivery';
      const next: AccountDetails = {
        name: (p.name || '').trim(),
        email: (p.email || '').trim(),
        vehicle: (
          p.vehicle?.registrationNumber ||
          p.vehicle?.label ||
          ''
        ).trim(),
        vehicleLabel: (p.vehicle?.label || p.vehicle?.type || '').trim(),
        deliveryType: mode,
        hubId: p.hub?.id || '',
        hubName: p.hub?.name || '',
      };
      actions.patch({
        epName: next.name,
        epEmail: next.email,
        epVehicle: next.vehicle,
        epHubId: next.hubId || null,
        ...(p.floatCash != null ? {floatingCash: p.floatCash} : {}),
      });
      setSavedDetails(next);
      setDraft(next);
      return next;
    },
    [actions],
  );

  const loadProfile = useCallback(async () => {
    const result = await profileApi.getProfile();
    if (!result.ok || !result.data) {
      return;
    }
    const p = result.data;
    applyAccountFromProfile(p);
    setPhotoUrl(p.photoUrl || null);
    setKycVerified(!!p.kycVerified);
    if (p.stats?.totalTrips != null) {
      setTrips(p.stats.totalTrips.toLocaleString('en-IN'));
    }
    if (p.stats?.onTimePercent != null) {
      setOnTime(`${p.stats.onTimePercent}%`);
    }
    if (p.stats?.rating != null) {
      setRating(String(p.stats.rating));
    }
  }, [applyAccountFromProfile]);

  useFocusEffect(
    useCallback(() => {
      if (detailsPhase === 'edit') {
        return;
      }
      void loadProfile();
    }, [loadProfile, detailsPhase]),
  );

  const nameMsg = nameError(draft.name);
  const emailMsg = emailError(draft.email);
  const vehicleMsg = vehicleRegError(draft.vehicle);
  const detailsValid =
    !nameMsg && !emailMsg && !vehicleMsg && !!draft.hubId;

  const startEditDetails = async () => {
    setDetailsError('');
    setTouched({name: false, email: false, vehicle: false});
    setSavingDetails(true);
    const [profileRes, hubsRes] = await Promise.all([
      profileApi.getProfile(),
      profileApi.listHubs(),
    ]);
    setSavingDetails(false);
    if (profileRes.ok && profileRes.data) {
      applyAccountFromProfile(profileRes.data);
    } else if (savedDetails) {
      setDraft({...savedDetails});
    }
    if (hubsRes.ok && Array.isArray(hubsRes.data)) {
      setHubs(
        hubsRes.data.map((h: HubDto) => ({
          id: h.id,
          name: h.name,
          addr: h.address || h.name,
        })),
      );
    }
    setDetailsPhase('edit');
  };

  const cancelEditDetails = () => {
    setDetailsError('');
    if (savedDetails) {
      setDraft({...savedDetails});
      actions.patch({
        epName: savedDetails.name,
        epEmail: savedDetails.email,
        epVehicle: savedDetails.vehicle,
        epHubId: savedDetails.hubId || null,
      });
    }
    setDetailsPhase('view');
  };

  const saveDetails = async () => {
    setTouched({name: true, email: true, vehicle: true});
    if (!detailsValid || savingDetails) {
      return;
    }
    setSavingDetails(true);
    setDetailsError('');
    const body = {
      name: draft.name.trim(),
      email: normalizeEmail(draft.email),
      vehicleRegistrationNumber: normalizeVehicleReg(draft.vehicle),
      hubId: draft.hubId,
    };
    const result = await profileApi.updateProfile(body);
    setSavingDetails(false);
    if (!result.ok || !result.data) {
      setDetailsError(result.error || 'Could not update profile');
      return;
    }
    applyAccountFromProfile(result.data);
    setDetailsPhase('view');
  };

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const confirmLogout = useCallback(() => {
    setLogoutOpen(true);
  }, []);

  const closeLogout = useCallback(() => {
    if (loggingOut) {
      return;
    }
    setLogoutOpen(false);
  }, [loggingOut]);

  const performLogout = useCallback(async () => {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await actions.logout();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  }, [actions, loggingOut]);

  const uploadPickedPhoto = useCallback(
    async (picked: PickedDocumentImage) => {
      setUploadingPhoto(true);
      setPhotoError('');
      try {
        const result = await profileApi.uploadAvatar(picked.uri, {
          fileName: picked.fileName,
          mimeType: picked.mimeType,
        });
        if (result.ok && result.data?.url) {
          setPhotoUrl(result.data.url);
        } else {
          setPhotoError(result.error || 'Could not upload photo');
        }
      } finally {
        setUploadingPhoto(false);
      }
    },
    [],
  );

  const openPhotoSheet = useCallback(() => {
    if (uploadingPhoto) {
      return;
    }
    setPhotoError('');
    setPhotoSheetOpen(true);
  }, [uploadingPhoto]);

  const closePhotoSheet = useCallback(() => {
    if (uploadingPhoto) {
      return;
    }
    setPhotoSheetOpen(false);
  }, [uploadingPhoto]);

  const choosePhotoSource = useCallback(
    async (source: 'camera' | 'gallery') => {
      if (uploadingPhoto) {
        return;
      }
      setPhotoSheetOpen(false);
      const picked =
        source === 'camera'
          ? await pickFromCamera('front')
          : await pickFromGallery();
      if (!picked) {
        return;
      }
      await uploadPickedPhoto(picked);
    },
    [uploadPickedPhoto, uploadingPhoto],
  );

  const groups: {title: string; items: MenuItem[]}[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'documents',
          bg: colors.primaryTint,
          label: 'Documents & KYC',
          sub: 'View document status',
          route: 'Docs',
        },
        {
          icon: 'shifts',
          bg: colors.infoBg,
          label: 'Shifts',
          sub: 'Book and view your slots',
          route: 'Shifts',
        },
        {
          icon: 'cash',
          bg: colors.warnBg,
          label: 'Floating Cash & Deposits',
          sub: `Cash in hand ₹${state.floatingCash}`,
          route: 'FloatCash',
        },
        {
          icon: 'wallet',
          bg: colors.primaryTint,
          label: 'Wallet',
          sub: 'Balance and payouts',
          route: 'Wallet',
        },
      ],
    },
    {
      title: 'Support & Settings',
      items: [
        {
          icon: 'bell',
          bg: colors.infoBg,
          label: 'Notifications',
          sub: 'Order and account alerts',
          route: 'Notifications',
        },
        {
          icon: 'support',
          bg: colors.purpleChipBg,
          label: 'Help & Support',
          sub: 'Chat with our team',
          route: 'Support',
        },
        {
          icon: 'settings',
          bg: '#F1F3F5',
          label: 'Settings',
          sub: 'Notifications and preferences',
          route: 'Settings',
        },
      ],
    },
  ];

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <GradientView
          colors={[colors.primary, colors.primaryDark]}
          angle={150}
          style={[styles.header, {paddingTop: insets.top + 24}]}>
          <View style={styles.headerTop}>
            <AppText style={styles.headerTitle}>Profile</AppText>
          </View>
          <View style={styles.identity}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={openPhotoSheet}
              style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {photoUrl ? (
                  <Image source={{uri: photoUrl}} style={styles.avatarImage} />
                ) : (
                  <AppText style={styles.avatarText}>
                    {(state.epName || 'A').trim().charAt(0).toUpperCase()}
                  </AppText>
                )}
                {uploadingPhoto && (
                  <View style={styles.avatarBusy}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                )}
              </View>
              {!uploadingPhoto && (
                <View style={styles.avatarCamBadge}>
                  <AppIcon name="camera" size={12} color={colors.white} />
                </View>
              )}
            </Pressable>
            <View style={styles.identityText}>
              <AppText style={styles.name} numberOfLines={1}>
                {state.epName || '—'}
              </AppText>
              <AppText style={styles.email} numberOfLines={1}>
                {state.epEmail || '—'}
              </AppText>
              <View style={styles.ratingPill}>
                <AppText style={styles.ratingText}>
                  {rating !== '—' ? `★ ${rating}` : '★ —'}
                  {kycVerified ? ' · KYC verified' : ''}
                </AppText>
              </View>
              {!!photoError && (
                <AppText style={styles.photoError}>{photoError}</AppText>
              )}
            </View>
          </View>
        </GradientView>

        <View style={styles.content}>
          <View style={styles.tiles}>
            <StatTile style={styles.tile} value={trips} label="Total trips" />
            <StatTile style={styles.tile} value={onTime} label="On-time" />
            <StatTile
              style={styles.tile}
              value={`₹${state.floatingCash.toLocaleString('en-IN')}`}
              label="Float cash"
              valueColor={colors.primary}
            />
          </View>

          <AppText style={styles.groupTitle}>Account details</AppText>
          {detailsPhase === 'view' && savedDetails ? (
            <View style={styles.detailsBlock}>
              <SavedSummaryCard
                title="Saved details"
                fields={[
                  {label: 'Name', value: savedDetails.name},
                  {label: 'Email', value: savedDetails.email},
                  {
                    label: 'Vehicle',
                    value: [savedDetails.vehicleLabel, savedDetails.vehicle]
                      .filter(Boolean)
                      .join(' · ') || '—',
                  },
                  {label: 'Delivery Type', value: savedDetails.deliveryType || '—'},
                  {label: 'Hub', value: savedDetails.hubName || savedDetails.hubId},
                ]}
              />
              <OutlineButton
                label={savingDetails ? 'Loading…' : 'Edit details'}
                tone="neutral"
                onPress={() => {
                  if (savingDetails) {
                    return;
                  }
                  void startEditDetails();
                }}
                style={styles.detailsEditBtn}
              />
            </View>
          ) : detailsPhase === 'edit' ? (
            <View style={styles.detailsBlock}>
              {!!detailsError && (
                <AppText style={styles.detailsError}>{detailsError}</AppText>
              )}
              <View>
                <LabeledInput
                  label="Full name"
                  value={draft.name}
                  onChangeText={v => {
                    setDraft(d => ({...d, name: v.slice(0, NAME_MAX)}));
                    setTouched(t => ({...t, name: true}));
                    setDetailsError('');
                  }}
                  maxLength={NAME_MAX}
                  style={
                    touched.name && nameMsg ? styles.inputInvalid : undefined
                  }
                />
                {touched.name && nameMsg ? (
                  <AppText style={styles.fieldError}>{nameMsg}</AppText>
                ) : null}
              </View>
              <View>
                <LabeledInput
                  label="Email"
                  value={draft.email}
                  onChangeText={v => {
                    setDraft(d => ({...d, email: v}));
                    setTouched(t => ({...t, email: true}));
                    setDetailsError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={
                    touched.email && emailMsg ? styles.inputInvalid : undefined
                  }
                />
                {touched.email && emailMsg ? (
                  <AppText style={styles.fieldError}>{emailMsg}</AppText>
                ) : null}
              </View>
              <View>
                <LabeledInput
                  label="Vehicle registration"
                  value={draft.vehicle}
                  onChangeText={v => {
                    setDraft(d => ({
                      ...d,
                      vehicle: normalizeVehicleReg(v),
                    }));
                    setTouched(t => ({...t, vehicle: true}));
                    setDetailsError('');
                  }}
                  autoCapitalize="characters"
                  maxLength={VEHICLE_REG_MAX}
                  style={
                    touched.vehicle && vehicleMsg
                      ? styles.inputInvalid
                      : undefined
                  }
                />
                {touched.vehicle && vehicleMsg ? (
                  <AppText style={styles.fieldError}>{vehicleMsg}</AppText>
                ) : null}
              </View>
              <AppText style={styles.hubLabel}>Home hub</AppText>
              <View style={styles.hubList}>
                {hubs.length === 0 ? (
                  <AppText style={styles.hubEmpty}>
                    {savingDetails
                      ? 'Loading hubs…'
                      : 'No hubs available. Try again.'}
                  </AppText>
                ) : (
                  hubs.map(h => (
                    <RadioRow
                      key={h.id}
                      title={h.name}
                      subtitle={h.addr}
                      selected={draft.hubId === h.id}
                      onPress={() => {
                        setDraft(d => ({
                          ...d,
                          hubId: h.id,
                          hubName: h.name,
                        }));
                        setDetailsError('');
                      }}
                    />
                  ))
                )}
              </View>
              <PrimaryButton
                label={savingDetails ? 'Saving…' : 'Save changes'}
                onPress={() => void saveDetails()}
                disabled={!detailsValid || savingDetails}
              />
              <OutlineButton
                label="Cancel"
                tone="neutral"
                onPress={() => {
                  if (savingDetails) {
                    return;
                  }
                  cancelEditDetails();
                }}
                style={styles.detailsEditBtn}
              />
            </View>
          ) : (
            <View style={styles.detailsBlock}>
              <AppText style={styles.hubEmpty}>Loading account details…</AppText>
            </View>
          )}

          {groups.map(g => (
            <View key={g.title}>
              <AppText style={styles.groupTitle}>{g.title}</AppText>
              <View style={styles.menuCard}>
                {g.items.map((m, i) => (
                  <Pressable
                    key={m.label}
                    onPress={() => {
                      actions.setPrev('profile');
                      nav.navigate(m.route as never);
                    }}
                    style={[
                      styles.menuRow,
                      i < g.items.length - 1 && styles.menuRowBorder,
                    ]}>
                    <AppIcon
                      name={m.icon}
                      size={18}
                      color={colors.primary}
                      tile={{size: 38, radius: 11, bg: m.bg}}
                    />
                    <View style={styles.menuText}>
                      <AppText style={styles.menuLabel}>{m.label}</AppText>
                      <AppText style={styles.menuSub}>{m.sub}</AppText>
                    </View>
                    <AppText style={styles.chev}>›</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <OutlineButton
            label="Logout"
            tone="danger"
            leading={<AppIcon name="logout" size={18} color={colors.danger} />}
            onPress={confirmLogout}
            style={styles.logout}
          />
          <AppText style={styles.version}>Selorg Rider · {environment.appVersion}</AppText>
        </View>
      </ScrollView>

      <BottomSheet visible={photoSheetOpen} onClose={closePhotoSheet}>
        <AppText style={styles.photoSheetTitle}>Change profile photo</AppText>
        <AppText style={styles.photoSheetSub}>
          JPG, PNG, WEBP, or HEIC · max 10 MB
        </AppText>
        <Pressable
          accessibilityRole="button"
          style={styles.photoOption}
          onPress={() => {
            void choosePhotoSource('camera');
          }}>
          <AppIcon
            name="camera"
            size={18}
            color={colors.primary}
            tile={{size: 40, radius: 10, bg: colors.primaryTint}}
          />
          <View style={styles.photoOptionText}>
            <AppText style={styles.photoOptionTitle}>Take photo</AppText>
            <AppText style={styles.photoOptionSub}>
              Use front camera for a clear selfie
            </AppText>
          </View>
          <AppText style={styles.photoOptionChev}>›</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.photoOption, styles.photoOptionLast]}
          onPress={() => {
            void choosePhotoSource('gallery');
          }}>
          <AppIcon
            name="image"
            size={18}
            color={colors.primary}
            tile={{size: 40, radius: 10, bg: colors.primaryTint}}
          />
          <View style={styles.photoOptionText}>
            <AppText style={styles.photoOptionTitle}>
              Choose from gallery
            </AppText>
            <AppText style={styles.photoOptionSub}>
              Pick an existing photo from your device
            </AppText>
          </View>
          <AppText style={styles.photoOptionChev}>›</AppText>
        </Pressable>
        <OutlineButton
          label="Cancel"
          tone="neutral"
          onPress={closePhotoSheet}
          style={styles.photoCancelBtn}
        />
      </BottomSheet>

      <Modal
        visible={logoutOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeLogout}>
        <View style={styles.logoutScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeLogout} />
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconWrap}>
              <AppIcon name="logout" size={28} color={colors.danger} />
            </View>
            <AppText style={styles.logoutTitle}>
              Are you sure you want to logout?
            </AppText>
            <AppText style={styles.logoutCopy}>
              You will need your mobile number and OTP to sign back in.
            </AppText>
            <View style={styles.logoutActions}>
              <OutlineButton
                label="Cancel"
                tone="neutral"
                height={50}
                borderRadius={radius.md}
                onPress={closeLogout}
                style={styles.logoutBtn}
              />
              <Pressable
                accessibilityRole="button"
                disabled={loggingOut}
                onPress={() => {
                  void performLogout();
                }}
                style={({pressed}) => [
                  styles.logoutConfirmBtn,
                  {
                    opacity: loggingOut ? 0.7 : pressed ? 0.9 : 1,
                  },
                ]}>
                {loggingOut ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <AppText style={styles.logoutConfirmText}>Logout</AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  scroll: {paddingBottom: 24},
  header: {paddingHorizontal: 20, paddingBottom: 58},
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.3,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 20,
  },
  avatarWrap: {
    width: 66,
    height: 66,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {width: '100%', height: '100%'},
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCamBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontWeight: '800', fontSize: 26, color: colors.white},
  identityText: {flex: 1, minWidth: 0},
  photoSheetTitle: {
    fontWeight: '800',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  photoSheetSub: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  photoOptionLast: {borderBottomWidth: 0},
  photoOptionText: {flex: 1, minWidth: 0},
  photoOptionTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  photoOptionSub: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  photoOptionChev: {fontWeight: '700', fontSize: 18, color: '#D1D5DB'},
  photoCancelBtn: {marginTop: 8},
  name: {
    fontWeight: '800',
    fontSize: 19,
    color: colors.white,
    letterSpacing: -0.3,
    minWidth: 0,
  },
  email: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.onPrimarySoft,
    marginTop: 2,
    minWidth: 0,
  },
  ratingPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 7,
  },
  ratingText: {fontWeight: '700', fontSize: 10, color: colors.white},
  photoError: {
    fontWeight: '600',
    fontSize: 10,
    color: '#FECACA',
    marginTop: 6,
  },
  content: {paddingHorizontal: 16, marginTop: -36},
  tiles: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  tile: {flexGrow: 1, flexBasis: '30%', minWidth: 96},
  detailsBlock: {gap: 12},
  detailsEditBtn: {marginTop: 0},
  detailsError: {fontWeight: '600', fontSize: 13, color: colors.danger},
  fieldError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
  inputInvalid: {borderColor: colors.danger},
  hubLabel: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  hubList: {gap: 9},
  hubEmpty: {fontWeight: '600', fontSize: 13, color: colors.textMuted},
  groupTitle: {
    fontWeight: '700',
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow('sm'),
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowBorder: {borderBottomWidth: 1, borderBottomColor: colors.divider},
  menuText: {flex: 1, minWidth: 0},
  menuLabel: {fontWeight: '600', fontSize: 14, color: colors.ink},
  menuSub: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 1,
  },
  chev: {fontWeight: '700', fontSize: 18, color: '#D1D5DB'},
  logout: {marginTop: 22},
  version: {
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 11,
    color: colors.textFaint2,
    marginTop: 14,
  },
  logoutScrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoutCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    ...shadow('lg'),
  },
  logoutIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutTitle: {
    fontWeight: '800',
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  logoutCopy: {
    fontWeight: '400',
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  logoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  logoutBtn: {flex: 1},
  logoutConfirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmText: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.white,
  },
});
