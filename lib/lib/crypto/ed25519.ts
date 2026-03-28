import crypto from "crypto";

/** Generate an Ed25519 keypair, returned as base64url-encoded DER */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  return {
    publicKey: (publicKey as unknown as Buffer).toString("base64url"),
    privateKey: (privateKey as unknown as Buffer).toString("base64url"),
  };
}

/** Sign a payload with an Ed25519 private key */
export async function sign(payload: string, privateKeyBase64: string): Promise<string> {
  const privateKeyDer = Buffer.from(privateKeyBase64, "base64url");
  const keyObject = crypto.createPrivateKey({ key: privateKeyDer, format: "der", type: "pkcs8" });
  const signature = crypto.sign(null, Buffer.from(payload), keyObject);
  return signature.toString("base64url");
}

/** Verify a payload signature with an Ed25519 public key */
export async function verify(payload: string, signatureBase64: string, publicKeyBase64: string): Promise<boolean> {
  try {
    const publicKeyDer = Buffer.from(publicKeyBase64, "base64url");
    const keyObject = crypto.createPublicKey({ key: publicKeyDer, format: "der", type: "spki" });
    const signature = Buffer.from(signatureBase64, "base64url");
    return crypto.verify(null, Buffer.from(payload), keyObject, signature);
  } catch {
    return false;
  }
}

/** Encrypt a private key with a Key Encryption Key (AES-256-GCM) */
export function encryptPrivateKey(privateKey: string, kek: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(kek, "riffoff-gate-kek-salt", 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/** Decrypt a private key with a Key Encryption Key (AES-256-GCM) */
export function decryptPrivateKey(encryptedBase64: string, kek: string): string {
  const data = Buffer.from(encryptedBase64, "base64");
  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const key = crypto.scryptSync(kek, "riffoff-gate-kek-salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
