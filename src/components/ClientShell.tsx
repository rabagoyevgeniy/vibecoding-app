"use client";

import { BottomNav } from "@/components/BottomNav";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Main content with bottom padding for nav */}
      <main className="pb-16">{children}</main>
      <BottomNav />
    </>
  );
}
