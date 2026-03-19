"use client";

import { useRef, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getLevelTier, getLevelProgress } from "@/lib/levels";
import type { SkillsData } from "@/lib/skills";
import { ALL_SKILLS, SKILL_ICONS, SKILL_COLORS, getTopSkill } from "@/lib/skills";

interface ShareCardProps {
  xp: number;
  currentDay: number;
  skills: SkillsData;
  onClose: () => void;
}

export function ShareCard({ xp, currentDay, skills, onClose }: ShareCardProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 600;
    const h = 400;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#07070d");
    bg.addColorStop(0.5, "#0f0a1e");
    bg.addColorStop(1, "#07070d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Accent glow circle
    const tier = getLevelTier(xp);
    const glowGrad = ctx.createRadialGradient(w / 2, 120, 0, w / 2, 120, 200);
    glowGrad.addColorStop(0, `${tier.color}25`);
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    roundRect(ctx, 1, 1, w - 2, h - 2, 24);
    ctx.stroke();

    // Brand
    ctx.font = "bold 18px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#f0f0f5";
    ctx.fillText("Vibe", 32, 44);
    ctx.fillStyle = "#7c3aed";
    const vibeWidth = ctx.measureText("Vibe").width;
    ctx.fillText("Coding", 32 + vibeWidth, 44);
    ctx.fillStyle = "#8b8b9e";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText("7D(AI)S", 32 + vibeWidth + ctx.measureText("Coding").width + 12, 44);

    // Day badge
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    const dayText = `${t("common.day")} ${currentDay}/7`;
    const dayW = ctx.measureText(dayText).width + 20;
    ctx.fillStyle = "rgba(124,58,237,0.15)";
    roundRect(ctx, w - dayW - 32, 28, dayW, 24, 12);
    ctx.fill();
    ctx.fillStyle = "#a78bfa";
    ctx.fillText(dayText, w - dayW - 22, 45);

    // Level icon (large)
    ctx.font = "48px serif";
    ctx.fillText(tier.icon, 32, 120);

    // Level name
    ctx.font = "bold 28px Inter, system-ui, sans-serif";
    ctx.fillStyle = tier.color;
    ctx.fillText(t(tier.nameKey), 92, 110);

    // XP
    ctx.font = "14px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b8b9e";
    ctx.fillText(`${t("levels.level")} ${tier.level} · ${xp} XP`, 92, 130);

    // XP progress bar
    const progress = getLevelProgress(xp);
    const barX = 32, barY = 152, barW = w - 64, barH = 8;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();
    ctx.fillStyle = tier.color;
    roundRect(ctx, barX, barY, barW * (progress.pct / 100), barH, 4);
    ctx.fill();

    // Stats row
    const statsY = 200;
    const stats = [
      { label: t("common.day"), value: `${currentDay}` },
      { label: "XP", value: `${xp}` },
      { label: t("levels.level"), value: `${tier.level}` },
    ];
    const statW = (w - 64) / 3;
    stats.forEach((stat, i) => {
      const sx = 32 + i * statW;
      // Stat box
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      roundRect(ctx, sx, statsY, statW - 12, 60, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      roundRect(ctx, sx, statsY, statW - 12, 60, 12);
      ctx.stroke();
      // Value
      ctx.font = "bold 22px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#a78bfa";
      ctx.textAlign = "center";
      ctx.fillText(stat.value, sx + (statW - 12) / 2, statsY + 30);
      // Label
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#8b8b9e";
      ctx.fillText(stat.label, sx + (statW - 12) / 2, statsY + 48);
    });
    ctx.textAlign = "left";

    // Skills section
    const skillsY = 290;
    ctx.font = "bold 13px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b8b9e";
    ctx.fillText(t("skills.title").toUpperCase(), 32, skillsY);

    const topSkill = getTopSkill(skills);
    const maxXP = Math.max(...Object.values(skills), 1);

    ALL_SKILLS.forEach((skill, i) => {
      const sx = 32;
      const sy = skillsY + 16 + i * 22;
      const sxp = skills[skill];
      const spct = sxp / maxXP;
      const scolor = SKILL_COLORS[skill];

      // Skill icon + name
      ctx.font = "12px serif";
      ctx.fillText(SKILL_ICONS[skill], sx, sy + 4);
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillStyle = skill === topSkill ? scolor : "#8b8b9e";
      ctx.fillText(t(`skills.${skill}`), sx + 22, sy + 4);

      // Mini bar
      const mbX = 120, mbW = w - 200, mbH = 6;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, mbX, sy - 2, mbW, mbH, 3);
      ctx.fill();
      if (sxp > 0) {
        ctx.fillStyle = scolor;
        roundRect(ctx, mbX, sy - 2, mbW * spct, mbH, 3);
        ctx.fill();
      }

      // XP value
      ctx.font = "bold 11px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#8b8b9e";
      ctx.textAlign = "right";
      ctx.fillText(`${sxp}`, w - 32, sy + 4);
      ctx.textAlign = "left";
    });

    // Footer
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b8b9e40";
    ctx.fillText("vibecoding.app", 32, h - 16);

    setImageUrl(canvas.toDataURL("image/png"));
  }, [xp, currentDay, skills, t]);

  async function handleShare() {
    if (!imageUrl) return;

    // Try native share first
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(imageUrl)).blob();
        const file = new File([blob], "vibecoding-level.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "VibeCoding Progress",
            files: [file],
          });
          return;
        }
      } catch {
        // Fall through to download
      }
    }

    // Fallback: download
    const link = document.createElement("a");
    link.download = "vibecoding-level.png";
    link.href = imageUrl;
    link.click();
  }

  async function handleCopy() {
    if (!imageUrl) return;
    try {
      const blob = await (await fetch(imageUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to download if clipboard fails
      handleShare();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeIn 0.3s ease" }}
      >
        {/* Preview */}
        <canvas
          ref={canvasRef}
          className="mb-4 w-full"
          style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            style={{
              background: "var(--accent)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            📤 {t("levels.share_download")}
          </button>
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200"
            style={{
              background: "var(--bg-card-hover)",
              border: "1px solid var(--border-hover)",
              color: copied ? "var(--success)" : "var(--text)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {copied ? "✓ " + t("levels.copied") : "📋 " + t("levels.copy")}
          </button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          {t("levels.close")}
        </button>
      </div>
    </div>
  );
}

// Canvas helper for rounded rects
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
