"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserRole } from "@/lib/appwrite/types";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganiser: boolean;
  isArtist: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isOrganiser: false,
  isArtist: false,
});

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === "admin",
    isOrganiser: user?.role === "organiser" || user?.role === "admin",
    isArtist: user?.role === "artist",
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
