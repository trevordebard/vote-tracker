import Link from "next/link";
import type { ReactNode } from "react";

type ShellProps = {
  children: ReactNode;
};

export default function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen px-6 py-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="chip">Vote Tracker</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/host">Host</Link>
            <Link href="/#join">Join</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
