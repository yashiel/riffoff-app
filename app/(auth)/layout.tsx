import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/features/shared/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-10" aria-label="RiffOff home">
        <Logo height={36} className="text-foreground" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
