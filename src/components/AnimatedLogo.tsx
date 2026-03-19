"use client";

interface AnimatedLogoProps {
  size?: "sm" | "lg";
}

export function AnimatedLogo({ size = "sm" }: AnimatedLogoProps) {
  const isLarge = size === "lg";

  return (
    <div
      className="animated-logo inline-flex items-baseline gap-0"
      style={{ position: "relative" }}
    >
      {/* Glow backdrop — only on large */}
      {isLarge && (
        <div
          className="logo-glow-orb"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "120%",
            height: "200%",
            background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)",
            animation: "logoGlowPulse 4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      <span
        className={`font-bold tracking-tight ${isLarge ? "text-5xl sm:text-7xl" : "text-2xl"}`}
        style={{ position: "relative" }}
      >
        {/* Main text */}
        <span style={{ color: "var(--text)" }}>Vibe</span>
        <span
          className="logo-accent"
          style={{
            color: "var(--accent)",
            position: "relative",
            display: "inline-block",
          }}
        >
          Coding
          {/* Underline glow */}
          <svg
            className="logo-underline"
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              bottom: isLarge ? "-4px" : "-2px",
              left: "0",
              width: "100%",
              height: isLarge ? "6px" : "3px",
              overflow: "visible",
            }}
          >
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
                <stop offset="30%" stopColor="var(--accent)" stopOpacity="0.8" />
                <stop offset="70%" stopColor="var(--accent-light)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--accent-light)" stopOpacity="0" />
              </linearGradient>
              <filter id="logoBlur">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
              </filter>
            </defs>
            {/* Glow layer */}
            <rect
              x="0" y="0" width="100" height="6" rx="3"
              fill="url(#logoGrad)"
              filter="url(#logoBlur)"
              style={{ animation: "logoUnderlinePulse 3s ease-in-out infinite" }}
            />
            {/* Sharp layer */}
            <rect
              x="5" y="1.5" width="90" height="3" rx="1.5"
              fill="url(#logoGrad)"
              style={{ animation: "logoUnderlinePulse 3s ease-in-out infinite 0.5s" }}
            />
          </svg>
        </span>
      </span>
    </div>
  );
}
