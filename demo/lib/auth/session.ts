import "server-only";

import { cookies } from "next/headers";

import {
  createSession,
  readSession,
  revokeSession,
  type Session,
} from "./store";

export type { Session };

export const SESSION_COOKIE = "sui_demo_session";

export async function startSession(suiAddress: string): Promise<Session> {
  const { token, expiresAt } = await createSession(suiAddress);
  const jar = await cookies();

  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return { suiAddress, issuedAt: new Date().toISOString(), expiresAt };
}

export async function getCurrentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  jar.delete(SESSION_COOKIE);
}
