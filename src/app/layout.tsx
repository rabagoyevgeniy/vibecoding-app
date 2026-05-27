import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { ClientShell } from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "VibeCoding — Build Real Products with AI",
  description: "7-day guided system to build and ship real products using AI tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <AuthProvider>
          <I18nProvider>
            <ClientShell>{children}</ClientShell>
          </I18nProvider>
        </AuthProvider>
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              boxShadow: "var(--shadow-lg)",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </body>
    </html>
  );
}
