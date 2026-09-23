import {Alert, Platform} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraType,
  type ImageLibraryOptions,
  type PhotoQuality,
} from 'react-native-image-picker';

const PICKER_OPTS: ImageLibraryOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  quality: 0.8 as PhotoQuality,
  maxWidth: 2000,
  maxHeight: 2000,
  includeBase64: false,
  includeExtra: true,
};

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_EXT = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
]);

export type PickedDocumentImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

type PickOptions = {
  cameraType?: CameraType;
};

function extOf(name?: string): string {
  return (name || '').split('.').pop()?.toLowerCase() || '';
}

function mimeFromName(name?: string, fallback = 'image/jpeg'): string {
  const ext = extOf(name);
  if (ext === 'png') {
    return 'image/png';
  }
  if (ext === 'webp') {
    return 'image/webp';
  }
  if (ext === 'heic' || ext === 'heif') {
    return 'image/heic';
  }
  if (ext === 'jpg' || ext === 'jpeg') {
    return 'image/jpeg';
  }
  return fallback;
}

function validateAsset(asset?: Asset | null): PickedDocumentImage | null {
  if (!asset?.uri) {
    return null;
  }
  const fileName = asset.fileName || undefined;
  const mime = (asset.type || mimeFromName(fileName || asset.uri)).toLowerCase();
  const ext = extOf(fileName || asset.uri);
  const mimeOk = ALLOWED_MIME.has(mime);
  const extOk = ALLOWED_EXT.has(ext);
  if (!mimeOk && !extOk) {
    Alert.alert(
      'Unsupported file',
      'Please upload a JPG, JPEG, PNG, WEBP, or HEIC image.',
    );
    return null;
  }
  if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_BYTES) {
    Alert.alert('File too large', 'Please use an image smaller than 10 MB.');
    return null;
  }
  return {
    uri: asset.uri,
    fileName,
    mimeType: mimeOk ? mime : mimeFromName(fileName || asset.uri),
  };
}

/** Launch camera and return the captured image, or null if cancelled. */
export async function pickFromCamera(
  cameraType: CameraType = 'back',
): Promise<PickedDocumentImage | null> {
  const result = await launchCamera({
    ...PICKER_OPTS,
    saveToPhotos: false,
    cameraType,
  });
  if (result.didCancel || result.errorCode) {
    if (result.errorCode === 'permission') {
      Alert.alert(
        'Permission needed',
        'Allow camera access in Settings to take a photo.',
      );
    } else if (result.errorMessage) {
      Alert.alert('Camera', result.errorMessage);
    }
    return null;
  }
  return validateAsset(result.assets?.[0]);
}

/** Open gallery and return the selected image, or null if cancelled. */
export async function pickFromGallery(): Promise<PickedDocumentImage | null> {
  const result = await launchImageLibrary(PICKER_OPTS);
  if (result.didCancel || result.errorCode) {
    if (result.errorCode === 'permission') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access in Settings to choose a photo.',
      );
    } else if (result.errorMessage) {
      Alert.alert('Gallery', result.errorMessage);
    }
    return null;
  }
  return validateAsset(result.assets?.[0]);
}

/** Shows Camera / Gallery chooser and returns the selected image, or null if cancelled. */
export function pickDocumentImage(
  title = 'Upload document',
  opts?: PickOptions,
): Promise<PickedDocumentImage | null> {
  const cameraType = opts?.cameraType || 'back';
  return new Promise(resolve => {
    const buttons = [
      {
        text: 'Take photo',
        onPress: () => {
          void pickFromCamera(cameraType).then(resolve);
        },
      },
      {
        text: 'Choose from gallery',
        onPress: () => {
          void pickFromGallery().then(resolve);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel' as const,
        onPress: () => resolve(null),
      },
    ];

    Alert.alert(
      title,
      Platform.OS === 'ios'
        ? 'JPG, PNG, WEBP, or HEIC · max 10 MB'
        : 'JPG, PNG, WEBP, or HEIC · max 10 MB',
      buttons,
    );
  });
}
