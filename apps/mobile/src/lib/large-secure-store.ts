import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Armazenamento seguro da sessão do Supabase (padrão oficial "LargeSecureStore").
 *
 * SecureStore (Keychain/Keystore) historicamente rejeita valores > ~2KB, e a sessão do
 * Supabase (access_token JWT + refresh_token + user) costuma passar disso. Então: cifra o
 * valor com uma chave AES-256 aleatória e guarda só o BLOB cifrado no AsyncStorage (sem
 * limite prático); a CHAVE AES (32 bytes) fica no SecureStore, bem abaixo do limite. Sem a
 * chave no Keychain/Keystore o blob é inútil - o refresh token deixa de ficar em texto puro
 * no sandbox do app (era a exposição em device com root/jailbreak ou backup não cifrado).
 *
 * Aleatoriedade via expo-crypto (CSPRNG nativo); AES-CTR do aes-js. As chaves de storage do
 * Supabase (`sb-<ref>-auth-token[...]`) são válidas como chave de SecureStore.
 */
export class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = Crypto.getRandomBytes(32); // AES-256
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  // O code_verifier do PKCE (chave `...-code-verifier`) é um segredo descartável de 5 min
  // e fica no caminho crítico do login com Google. Cifrá-lo com AES+KeyStore só adiciona
  // fragilidade no Android (o KeyStore lança decrypt com mais frequência que o Keychain, e
  // aí o getItem apagava o verifier -> exchangeCodeForSession falhava). Vai em AsyncStorage
  // puro; o que importa proteger (o refresh token, na chave da sessão) segue cifrado.
  private isPlain(key: string): boolean {
    return key.endsWith('-code-verifier');
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isPlain(key)) return AsyncStorage.getItem(key);
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      // Chave sumiu/corrompeu (ex.: reinstalação limpando o Keychain): descarta o par pra
      // forçar re-login em vez de crashar a inicialização do app.
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isPlain(key)) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    if (!this.isPlain(key)) await SecureStore.deleteItemAsync(key);
  }
}
