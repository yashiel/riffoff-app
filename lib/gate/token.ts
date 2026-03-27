import { sign, verify } from "../crypto/ed25519";

export interface GateTokenPayload {
  tid: string;
  eid: string;
  nonce: string;
  iat: number;
  exp: number;
}

interface GateTokenHeader {
  alg: "EdDSA";
  kid: string;
}

function toBase64Url(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function fromBase64Url(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

export async function createGateToken(
  data: { tid: string; eid: string; nonce: string },
  privateKey: string,
  kid: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header: GateTokenHeader = { alg: "EdDSA", kid };
  const payload: GateTokenPayload = {
    tid: data.tid,
    eid: data.eid,
    nonce: data.nonce,
    iat: now,
    exp: now + ttlSeconds,
  };

  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await sign(signingInput, privateKey);

  return `${headerB64}.${payloadB64}.${signature}`;
}

export async function verifyGateToken(
  token: string,
  publicKeys: Map<string, string>,
): Promise<GateTokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;

    let header: GateTokenHeader;
    try {
      header = JSON.parse(fromBase64Url(headerB64));
    } catch {
      return null;
    }

    if (header.alg !== "EdDSA") return null;

    const publicKey = publicKeys.get(header.kid);
    if (!publicKey) return null;

    const signingInput = `${headerB64}.${payloadB64}`;
    const valid = await verify(signingInput, signature, publicKey);
    if (!valid) return null;

    let payload: GateTokenPayload;
    try {
      payload = JSON.parse(fromBase64Url(payloadB64));
    } catch {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}
