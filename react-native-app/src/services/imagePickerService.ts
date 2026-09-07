import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';

/**
 * Request runtime camera permission for Android
 */
export async function requestNativeCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'AutoParts India needs access to your camera so you can take photos of your vehicle parts or profile picture.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Grant Permission',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Camera permission request error:', err);
    return false;
  }
}

/**
 * Request runtime storage/media permission for Android (Android 13+ READ_MEDIA_IMAGES or legacy storage)
 */
export async function requestNativeStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    // Android 13+ (API 33+) uses READ_MEDIA_IMAGES
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        'android.permission.READ_MEDIA_IMAGES' as any
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Photo Library Permission',
        message: 'AutoParts India needs access to your gallery so you can select auto part photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Storage permission request error:', err);
    return true; // proceed with default intent picker
  }
}

/**
 * Open native hardware camera to capture a new photo
 */
export async function openNativeCamera(options?: Partial<CameraOptions>): Promise<string | null> {
  const hasPermission = await requestNativeCameraPermission();
  if (!hasPermission) {
    Alert.alert(
      'Camera Permission Denied',
      'Please allow camera permission in your Android device settings to take photos directly.'
    );
    return null;
  }

  const cameraOptions: CameraOptions = {
    mediaType: 'photo',
    cameraType: 'back',
    quality: 0.8 as any,
    maxWidth: 1280,
    maxHeight: 1280,
    saveToPhotos: false,
    includeBase64: false,
    ...options,
  };

  return new Promise((resolve) => {
    launchCamera(cameraOptions, (response) => {
      if (response.didCancel) {
        resolve(null);
        return;
      }
      if (response.errorCode) {
        console.warn('[Camera] Error:', response.errorMessage);
        Alert.alert('Camera Error', response.errorMessage || 'Unable to open native camera.');
        resolve(null);
        return;
      }
      const asset = response.assets?.[0];
      resolve(asset?.uri || null);
    });
  });
}

/**
 * Open native gallery / media library to select an existing photo
 */
export async function openNativeGallery(options?: Partial<ImageLibraryOptions>): Promise<string | null> {
  await requestNativeStoragePermission();

  const libraryOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    quality: 0.8 as any,
    maxWidth: 1280,
    maxHeight: 1280,
    selectionLimit: 1,
    includeBase64: false,
    ...options,
  };

  return new Promise((resolve) => {
    launchImageLibrary(libraryOptions, (response) => {
      if (response.didCancel) {
        resolve(null);
        return;
      }
      if (response.errorCode) {
        console.warn('[Gallery] Error:', response.errorMessage);
        Alert.alert('Gallery Error', response.errorMessage || 'Unable to open image gallery.');
        resolve(null);
        return;
      }
      const asset = response.assets?.[0];
      resolve(asset?.uri || null);
    });
  });
}

/**
 * Open native gallery to select multiple photos
 */
export async function openNativeGalleryMultiple(maxCount: number = 6): Promise<string[]> {
  await requestNativeStoragePermission();

  const libraryOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1200,
    maxHeight: 1200,
    selectionLimit: maxCount,
  };

  return new Promise((resolve) => {
    launchImageLibrary(libraryOptions, (response) => {
      if (response.didCancel || !response.assets) {
        resolve([]);
        return;
      }
      if (response.errorCode) {
        console.warn('[Gallery] Error:', response.errorMessage);
        Alert.alert('Gallery Error', response.errorMessage || 'Unable to open image gallery.');
        resolve([]);
        return;
      }
      const uris = response.assets.map((a) => a.uri).filter(Boolean) as string[];
      resolve(uris);
    });
  });
}

/**
 * Shows native action dialog prompting user to choose between Camera or Gallery
 */
export function promptImageSourceDialog(
  title: string = 'Select Photo Source',
  message: string = 'Choose how you would like to upload the picture:'
): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: '📷 Take Photo (Camera)',
          onPress: async () => {
            const uri = await openNativeCamera();
            resolve(uri);
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            const uri = await openNativeGallery();
            resolve(uri);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
