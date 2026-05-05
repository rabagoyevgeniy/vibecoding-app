"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.home", icon: "🏠", activeIcon: "🏠" },
  { href: "/mission", labelKey: "nav.journey", icon: "🗺️", activeIcon: "🗺️" },
  { href: "/builder", labelKey: "nav.build", icon: "🛠️", activeIcon: "🛠️" },
  { href: "/learning", labelKey: "nav.learn", icon: "📚", activeIcon: "📚" },
  { href: "/profile", labelKey: "nav.profile", icon: "👤", activeIcon: "👤" },
];

/** Pages where bottom nav should NOT be shown */
const HIDDEN_ON = ["/", "/onboarding", "/auth"];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  // Hide on landing, onboarding, and auth pages
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
      style={{
        height: 64,
        background: "rgba(7, 7, 13, 0.95)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/mission" && pathname.startsWith("/mission/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 transition-all duration-200"
            style={{
              color: isActive ? "var(--accent-light)" : "var(--text-muted)",
              minWidth: 56,
            }}
          >
            <span
              className="text-xl transition-transform duration-200"
              style={{
                transform: isActive ? "scale(1.15)" : "scale(1)",
                filter: isActive
                  ? "drop-shadow(0 0 8px rgba(124, 58, 237, 0.5))"
                  : "none",
              }}
            >
              {isActive ? item.activeIcon : item.icon}
            </span>
            <span
              className="text-[10px] font-medium"
              style={{
                color: isActive ? "var(--accent-light)" : "var(--text-muted)",
              }}
            >
              {t(item.labelKey)}
            </span>
            {/* Active indicator dot */}
            {isActive && (
              <div
                className="absolute bottom-1 h-1 w-1"
                style={{
                  background: "var(--accent)",
                  borderRadius: "var(--radius-full)",
                  boxShadow: "0 0 6px var(--accent)",
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
