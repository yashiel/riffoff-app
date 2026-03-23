import crypto from "crypto";

/**
 * Sign a TNG API request using RSA256.
 * Content format: "{METHOD} {PATH}\n{CLIENT_ID}.{REQUEST_TIME}.{BODY}"
 */
export function signTNGRequest(
  method: string,
  path: string,
  body: string,
  requestTime: string,
): string {
  const clientId = process.env.TNG_CLIENT_ID!;
  const privateKey = process.env.TNG_PRIVATE_KEY!;

  const content = `${method} ${path}\n${clientId}.${requestTime}.${body}`;
  const sign = crypto.createSign("SHA256");
  sign.update(content);
  return sign.sign(privateKey, "base64");
}

/**
 * Verify a TNG API response/notification using RSA256.
 */
export function verifyTNGSignature(
  method: string,
  path: string,
  body: string,
  responseTime: string,
  signature: string,
): boolean {
  const clientId = process.env.TNG_CLIENT_ID!;
  const publicKey = process.env.TNG_PUBLIC_KEY!;

  const content = `${method} ${path}\n${clientId}.${responseTime}.${body}`;
  const verify = crypto.createVerify("SHA256");
  verify.update(content);

  try {
    return verify.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

/** Extract signature value from TNG's Signature header */
export function extractSignatureValue(signatureHeader: string): string {
  // Format: algorithm=RSA256, keyVersion=1, signature=BASE64VALUE
  const match = signatureHeader.match(/signature=(.+)/);
  return match?.[1] ?? "";
}

export function getTNGApiUrl(): string {
  return process.env.TNG_API_URL ?? "https://open-api-tng.tngdigital.com.my";
}

export function getTNGHeaders(requestTime: string, signature: string) {
  return {
    "Content-Type": "application/json",
    "Client-Id": process.env.TNG_CLIENT_ID!,
    "Request-Time": requestTime,
    Signature: `algorithm=RSA256, keyVersion=1, signature=${signature}`,
  };
}
