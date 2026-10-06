import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type WordBox = { text: string; x: number; y: number; w: number; h: number };  // normalized, origin top-left
type Native = { recognize(uri: string, fast: boolean): Promise<string[]>; recognizeWords(uri: string, fast: boolean): Promise<WordBox[]> };
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

/** Every word in the image with its position, so a caller can pick the one under a target. */
export async function recognizeWords(uri: string, fast = false): Promise<WordBox[]> {
  if (!native) throw new Error('Text recognition is not available in this build.');
  return native.recognizeWords(uri, fast);
}
