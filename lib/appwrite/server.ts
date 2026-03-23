"use server";

import { Client, Account, Databases, Storage, Teams, Users } from "node-appwrite";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./config";

/**
 * Admin client — uses API key, bypasses all permissions.
 * Use ONLY in Server Actions / Route Handlers for privileged operations.
 */
export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get teams() {
      return new Teams(client);
    },
    get users() {
      return new Users(client);
    },
  };
}

/**
 * Session client — uses the logged-in user's session from cookie.
 * Use in Server Components and Server Actions for user-scoped operations.
 * Returns null if no session cookie exists.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);

  if (!session?.value) {
    return null;
  }

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get teams() {
      return new Teams(client);
    },
  };
}

/**
 * Get the current logged-in user, or null if not authenticated.
 */
export async function getLoggedInUser() {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) return null;
    return await sessionClient.account.get();
  } catch {
    return null;
  }
}
