const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const importKey = async (keyBase64) => {
  const rawKey = fromBase64(keyBase64);
  return crypto.subtle.importKey("raw", rawKey, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
};

export const generateConversationKey = async () => {
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return toBase64(rawKey);
};

export const encryptMessage = async (plaintext, keyBase64) => {
  const key = await importKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return toBase64(combined.buffer);
};

export const decryptMessage = async (ciphertextBase64, keyBase64) => {
  const key = await importKey(keyBase64);
  const combined = new Uint8Array(fromBase64(ciphertextBase64));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
};

export const decryptMessageSafe = async (ciphertextBase64, keyBase64) => {
  try {
    return await decryptMessage(ciphertextBase64, keyBase64);
  } catch {
    return "[encrypted]";
  }
};
