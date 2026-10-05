import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = { recognize(uri: string, fast: boolean): Promise<string[]> };
const native = requireOptionalNativeModule<Native>('TextRecognizer');

/** True when this build can read text from images (iOS native builds only, never Expo Go or web). */
export const canRecognizeText = Platform.OS === 'ios' && native != null;

/**
 * Recognize the lines of text in an image, on the device.
 * `fast` trades accuracy for speed; use it for live camera frames.
 */
export async function recognizeText(uri: string, fast = false): Promise<string[]> {
  if (!native) throw new Error('Text recognition is not available in this build.');
  return native.recognize(uri, fast);
}
