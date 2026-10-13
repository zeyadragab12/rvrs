import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

/**
 * Sign-in sessions are bigger than the keychain allows, so the session is encrypted with a random key.
 * The key lives in the phone's secure store (Keychain / Keystore). Only the encrypted text goes in AsyncStorage.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    // Anything that is not our encrypted format, such as an old plain session, is dropped so the user signs in again.
    if (!/^[0-9a-f]+$/i.test(stored)) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    const keyHex = await SecureStore.getItemAsync(key);
    if (!keyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(stored)));
  },

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = Crypto.getRandomBytes(32);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encrypted));
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};
