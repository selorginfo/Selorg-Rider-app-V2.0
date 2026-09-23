import {Alert, Linking, Platform} from 'react-native';

/** E.164-ish Indian mobile for `tel:` / `sms:` URIs. */
export function dialablePhone(phone?: string | null): string | null {
  if (!phone) {
    return null;
  }
  const trimmed = String(phone).trim();
  if (!trimmed || trimmed.includes('X')) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  return null;
}

export async function openDialer(
  phone?: string | null,
  missingMessage = 'Customer phone is not available for this order.',
): Promise<boolean> {
  const tel = dialablePhone(phone);
  if (!tel) {
    Alert.alert('Unable to call', missingMessage);
    return false;
  }
  const url = `tel:${tel}`;
  try {
    const supported =
      Platform.OS === 'android' ? true : await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unable to call', `Dial ${tel} from your phone.`);
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Unable to call', `Dial ${tel} from your phone.`);
    return false;
  }
}
