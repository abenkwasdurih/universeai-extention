import CryptoJS from 'crypto-js';

// Must match the key used in Vercel backend
const secretKey = 'universe2026'; 
const key = CryptoJS.SHA256(secretKey);

export function decryptCookieData(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted format');

  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: encrypted,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}
