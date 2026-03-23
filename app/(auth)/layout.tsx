import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-10 font-display text-[32px] tracking-wider"
      >
        <span className="text-coral">RIFF</span>OFF
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
