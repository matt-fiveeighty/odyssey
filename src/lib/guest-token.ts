import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const GUEST_SECRET = new TextEncoder().encode(
  process.env.GUEST_JWT_SECRET || "odyssey-dev-guest-secret-change-in-prod"
);

const ISSUER = "odyssey-outdoors";
const AUDIENCE = "guest";
const MAX_AGE_HOURS = 24;

interface GuestPayload extends JWTPayload {
  guestId: string;
}

export async function createGuestToken(): Promise<string> {
  const guestId = crypto.randomUUID();
  return new SignJWT({ guestId } as GuestPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${MAX_AGE_HOURS}h`)
    .sign(GUEST_SECRET);
}

export async function verifyGuestToken(
  token: string
): Promise<GuestPayload | null> {
  try {
    const { payload } = await jwtVerify(token, GUEST_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as GuestPayload;
  } catch {
    return null;
  }
}
