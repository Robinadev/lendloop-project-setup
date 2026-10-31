const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sign(secret: string, timestamp: string, body: string): Promise<string> {
  if (secret.length < 32) throw new Error("Shared secret must be at least 32 characters");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

const MAX_SKEW_MS = 5 * 60 * 1000;

export async function verify(request: Request, body: string, secret: string | undefined): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const timestamp = request.headers.get("x-lendloop-timestamp") ?? "";
  const signature = request.headers.get("x-lendloop-signature") ?? "";
  if (!/^\d{13}$/.test(timestamp) || !/^sha256=[0-9a-f]{64}$/.test(signature)) return false;
  const timestampMs = Number(timestamp);
  if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_SKEW_MS) return false;
  const expected = await sign(secret, timestamp, body);
  return safeEqual(expected, signature.slice("sha256=".length));
}
