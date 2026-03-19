"use client";

import { useRef, useEffect } from "react";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let columns: number[] = [];
    const chars = "01アイウエオカキクケコサシスセソ10";
    const fontSize = 14;
    let w = 0;
    let h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
      const colCount = Math.floor(w / fontSize);
      // Preserve existing drop positions, fill new ones
      const newCols = Array.from({ length: colCount }, (_, i) =>
        columns[i] !== undefined ? columns[i] : Math.random() * -100
      );
      columns = newCols;
    }

    resize();
    window.addEventListener("resize", resize);

    let lastTime = 0;
    const interval = 50; // ~20fps — lightweight

    function draw(time: number) {
      animId = requestAnimationFrame(draw);

      if (time - lastTime < interval) return;
      lastTime = time;

      // Fade trail
      ctx!.fillStyle = "rgba(7, 7, 13, 0.12)";
      ctx!.fillRect(0, 0, w, h);

      ctx!.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = columns[i] * fontSize;

        // Leading character — brighter
        if (Math.random() > 0.5) {
          ctx!.fillStyle = "rgba(124, 58, 237, 0.12)"; // accent purple, very dim
        } else {
          ctx!.fillStyle = "rgba(167, 139, 250, 0.07)"; // accent-light, even dimmer
        }

        ctx!.fillText(char, x, y);

        // Reset when off screen, with random delay
        if (y > h && Math.random() > 0.975) {
          columns[i] = 0;
        }

        columns[i]++;
      }
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 1 }}
      aria-hidden="true"
    />
  );
}
