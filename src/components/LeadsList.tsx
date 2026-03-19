"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Lead, LeadStatus, LeadPlatform, LeadType } from "@/lib/leads";
import { updateLeadStatus, updateLeadType, saveLeads, getLeads } from "@/lib/leads";

interface LeadsListProps {
  leads: Lead[];
  onUpdate: () => void;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  no_reply: "var(--text-muted)",
  replied: "var(--warning)",
  interested: "var(--success)",
};

const PLATFORM_ICONS: Record<LeadPlatform, string> = {
  whatsapp: "💬",
  telegram: "✈️",
  instagram: "📸",
  linkedin: "💼",
  twitter: "🐦",
  other: "📱",
};

const PLATFORMS: LeadPlatform[] = ["whatsapp", "telegram", "instagram", "linkedin", "twitter", "other"];
const STATUSES: LeadStatus[] = ["no_reply", "replied", "interested"];
const LEAD_TYPES: LeadType[] = ["client", "partner", "investor", "developer"];

const TYPE_COLORS: Record<LeadType, string> = {
  client: "var(--accent)",
  partner: "#3b82f6",
  investor: "#eab308",
  developer: "#22c55e",
};

const TYPE_ICONS: Record<LeadType, string> = {
  client: "👤",
  partner: "🤝",
  investor: "💰",
  developer: "💻",
};

export function LeadsList({ leads, onUpdate }: LeadsListProps) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleStatusChange(id: string, status: LeadStatus) {
    updateLeadStatus(id, status);
    onUpdate();
  }

  function handlePlatformChange(id: string, platform: LeadPlatform) {
    const allLeads = getLeads();
    const lead = allLeads.find((l) => l.id === id);
    if (lead) {
      lead.platform = platform;
      saveLeads(allLeads);
      onUpdate();
    }
  }

  function handleTypeChange(id: string, type: LeadType) {
    updateLeadType(id, type);
    onUpdate();
  }

  if (leads.length === 0) {
    return (
      <div
        className="p-4 text-center text-sm"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          color: "var(--text-muted)",
        }}
      >
        {t("leads.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="flex items-center gap-3 p-3 cursor-pointer transition-all duration-200"
          style={{
            background: editingId === lead.id ? "var(--bg-card-hover)" : "var(--bg-card)",
            border: `1px solid ${editingId === lead.id ? "var(--border-hover)" : "var(--border)"}`,
            borderRadius: "var(--radius-md)",
          }}
          onClick={() => setEditingId(editingId === lead.id ? null : lead.id)}
        >
          <span className="text-lg">{PLATFORM_ICONS[lead.platform]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{lead.name}</span>
              <span
                className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: `${TYPE_COLORS[lead.type || "client"]}20`,
                  color: TYPE_COLORS[lead.type || "client"],
                  border: `1px solid ${TYPE_COLORS[lead.type || "client"]}40`,
                  borderRadius: "var(--radius-full)",
                }}
              >
                {TYPE_ICONS[lead.type || "client"]} {t(`leads.type_${lead.type || "client"}`)}
              </span>
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("common.day")} {lead.day}
            </div>
          </div>
          <span
            className="shrink-0 px-2.5 py-1 text-xs font-medium"
            style={{
              background: `${STATUS_COLORS[lead.status]}20`,
              color: STATUS_COLORS[lead.status],
              border: `1px solid ${STATUS_COLORS[lead.status]}40`,
              borderRadius: "var(--radius-full)",
            }}
          >
            {t(`leads.status_${lead.status}`)}
          </span>
        </div>
      ))}

      {/* Edit panel */}
      {editingId && (() => {
        const lead = leads.find((l) => l.id === editingId);
        if (!lead) return null;
        return (
          <div
            className="p-4"
            style={{
              background: "var(--bg-card-hover)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <div className="mb-3 text-sm font-medium">{lead.name}</div>

            {/* Platform selector */}
            <div className="mb-3">
              <div className="mb-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                {t("leads.platform")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={(e) => { e.stopPropagation(); handlePlatformChange(lead.id, p); }}
                    className="px-2 py-1 text-xs transition-all duration-200"
                    style={{
                      background: lead.platform === p ? "var(--accent)" : "var(--bg)",
                      color: lead.platform === p ? "#fff" : "var(--text-muted)",
                      border: `1px solid ${lead.platform === p ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {PLATFORM_ICONS[p]} {t(`leads.platform_${p}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type selector */}
            <div className="mb-3">
              <div className="mb-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                {t("leads.type")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_TYPES.map((lt) => (
                  <button
                    key={lt}
                    onClick={(e) => { e.stopPropagation(); handleTypeChange(lead.id, lt); }}
                    className="px-2 py-1 text-xs transition-all duration-200"
                    style={{
                      background: (lead.type || "client") === lt ? `${TYPE_COLORS[lt]}20` : "var(--bg)",
                      color: (lead.type || "client") === lt ? TYPE_COLORS[lt] : "var(--text-muted)",
                      border: `1px solid ${(lead.type || "client") === lt ? TYPE_COLORS[lt] : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {TYPE_ICONS[lt]} {t(`leads.type_${lt}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status selector */}
            <div>
              <div className="mb-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                {t("leads.status")}
              </div>
              <div className="flex gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(lead.id, s); }}
                    className="flex-1 px-2 py-1.5 text-xs font-medium transition-all duration-200"
                    style={{
                      background: lead.status === s ? `${STATUS_COLORS[s]}20` : "var(--bg)",
                      color: lead.status === s ? STATUS_COLORS[s] : "var(--text-muted)",
                      border: `1px solid ${lead.status === s ? STATUS_COLORS[s] : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {t(`leads.status_${s}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
