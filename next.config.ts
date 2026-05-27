import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Карточки `ai_vision_help` отправляют base64-скриншот в Server Action
      // (`analyzeScreenshot`). 10MB raw → ~13.3MB после base64, плюс JSON-обёртка.
      // 15 MB даёт безопасный запас.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
