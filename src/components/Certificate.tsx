"use client";

import { useRef, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getLevelTier } from "@/lib/levels";
import type { SkillsData } from "@/lib/skills";
import { ALL_SKILLS, SKILL_ICONS, SKILL_COLORS } from "@/lib/skills";

interface CertificateProps {
  userName: string;
  xp: number;
  skills: SkillsData;
  onClose: () => void;
}

export function Certificate({ userName, xp, skills, onClose }: CertificateProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 800;
    const h = 560;
    canvas.width = w;
    canvas.height = h;

    const tier = getLevelTier(xp);

    // Background
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#07070d");
    bg.addColorStop(0.3, "#0f0a1e");
    bg.addColorStop(0.7, "#0a0d1a");
    bg.addColorStop(1, "#07070d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Decorative border
    ctx.strokeStyle = "rgba(124,58,237,0.3)";
    ctx.lineWidth = 2;
    roundRect(ctx, 16, 16, w - 32, h - 32, 20);
    ctx.stroke();

    ctx.strokeStyle = "rgba(124,58,237,0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, 24, 24, w - 48, h - 48, 16);
    ctx.stroke();

    // Corner accents
    const corners = [
      [32, 32], [w - 32, 32], [32, h - 32], [w - 32, h - 32],
    ];
    corners.forEach(([cx, cy]) => {
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      glow.addColorStop(0, "rgba(124,58,237,0.15)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 60, cy - 60, 120, 120);
    });

    // Central glow
    const centerGlow = ctx.createRadialGradient(w / 2, h / 2 - 40, 0, w / 2, h / 2 - 40, 250);
    centerGlow.addColorStop(0, `${tier.color}12`);
    centerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, w, h);

    // Brand
    ctx.textAlign = "center";
    ctx.font = "bold 16px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#f0f0f5";
    ctx.fillText("VibeCoding", w / 2, 60);
    ctx.fillStyle = "#8b8b9e";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillText("7D(AI)S — Build Real Products in 7 Days", w / 2, 78);

    // Certificate title
    ctx.font = "bold 11px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#7c3aed";
    ctx.letterSpacing = "3px";
    ctx.fillText(t("levels.certificate_title").toUpperCase(), w / 2, 116);

    // Decorative line
    const lineGrad = ctx.createLinearGradient(w / 2 - 120, 0, w / 2 + 120, 0);
    lineGrad.addColorStop(0, "transparent");
    lineGrad.addColorStop(0.5, "rgba(124,58,237,0.5)");
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, 128);
    ctx.lineTo(w / 2 + 120, 128);
    ctx.stroke();

    // User name
    ctx.font = "bold 36px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#f0f0f5";
    ctx.fillText(userName, w / 2, 175);

    // Subtitle
    ctx.font = "14px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b8b9e";
    ctx.fillText(t("levels.certificate_subtitle"), w / 2, 205);

    // Level badge
    const badgeY = 240;
    ctx.fillStyle = `${tier.color}15`;
    roundRect(ctx, w / 2 - 100, badgeY, 200, 50, 12);
    ctx.fill();
    ctx.strokeStyle = `${tier.color}40`;
    ctx.lineWidth = 1;
    roundRect(ctx, w / 2 - 100, badgeY, 200, 50, 12);
    ctx.stroke();

    ctx.font = "28px serif";
    ctx.fillText(tier.icon, w / 2 - 50, badgeY + 35);
    ctx.font = "bold 18px Inter, system-ui, sans-serif";
    ctx.fillStyle = tier.color;
    ctx.fillText(t(tier.nameKey), w / 2 + 10, badgeY + 33);

    // XP
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b8b9e";
    ctx.fillText(`${xp} XP`, w / 2, badgeY + 72);

    // Skills section
    const skillsY = 340;
    const skillW = 140;
    const skillsStartX = (w - (ALL_SKILLS.length * skillW)) / 2;
    const maxXP = Math.max(...Object.values(skills), 1);

    ALL_SKILLS.forEach((skill, i) => {
      const sx = skillsStartX + i * skillW + skillW / 2;
      const sxp = skills[skill];
      const color = SKILL_COLORS[skill];

      // Icon
      ctx.font = "20px serif";
      ctx.fillText(SKILL_ICONS[skill], sx, skillsY);

      // Name
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(t(`skills.${skill}`), sx, skillsY + 20);

      // Mini bar
      const barW = 80, barH = 4;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, sx - barW / 2, skillsY + 28, barW, barH, 2);
      ctx.fill();
      if (sxp > 0) {
        ctx.fillStyle = color;
        roundRect(ctx, sx - barW / 2, skillsY + 28, barW * (sxp / maxXP), barH, 2);
        ctx.fill();
      }

      // XP value
      ctx.font = "bold 11px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#8b8b9e";
      ctx.fillText(`${sxp} XP`, sx, skillsY + 50);
    });

    // Footer line
    const footLineGrad = ctx.createLinearGradient(60, 0, w - 60, 0);
    footLineGrad.addColorStop(0, "transparent");
    footLineGrad.addColorStop(0.5, "rgba(255,255,255,0.08)");
    footLineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = footLineGrad;
    ctx.beginPath();
    ctx.moveTo(60, h - 70);
    ctx.lineTo(w - 60, h - 70);
    ctx.stroke();

    // Date
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b8b9e";
    ctx.fillText(dateStr, w / 2, h - 44);

    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b8b9e40";
    ctx.fillText("vibecoding.app", w / 2, h - 24);

    ctx.textAlign = "left";
    setImageUrl(canvas.toDataURL("image/png"));
  }, [userName, xp, skills, t]);

  async function handleDownload() {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.download = `vibecoding-certificate-${userName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = imageUrl;
    link.click();
  }

  async function handleShare() {
    if (!imageUrl) return;
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(imageUrl)).blob();
        const file = new File([blob], "vibecoding-certificate.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "VibeCoding Certificate",
            text: `I completed the 7-day VibeCoding program! Level: ${getLevelTier(xp).level}`,
            files: [file],
          });
          return;
        }
      } catch {
        // Fall through
      }
    }
    handleDownload();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeIn 0.3s ease" }}
      >
        {/* Preview */}
        <canvas
          ref={canvasRef}
          className="mb-4 w-full"
          style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            style={{
              background: "var(--accent)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            📥 {t("levels.certificate_download")}
          </button>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200 hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #059669, #10b981)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
            }}
          >
            📤 {t("levels.certificate_share")}
          </button>
        </div>

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
