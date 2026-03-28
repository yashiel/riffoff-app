"use client";

import { Client, Account, Databases, Storage } from "appwrite";

/**
 * Browser-side Appwrite client — used for Realtime subscriptions
 * and client-side operations only.
 *
 * NEVER use node-appwrite in "use client" files.
 * NEVER use this for writes that need permission enforcement — use Server Actions.
 */
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client };
