import { fetchLeads, saveLeads as saveLeadsToSupabase, type StoredLead } from "@/lib/supabase-storage";

export type LeadStatus = "no_reply" | "replied" | "interested";
export type LeadPlatform = "whatsapp" | "telegram" | "instagram" | "linkedin" | "twitter" | "other";
export type LeadType = "client" | "partner" | "investor" | "developer";

export interface Lead {
  id: string;
  name: string;
  platform: LeadPlatform;
  status: LeadStatus;
  type: LeadType;
  day: number;
  createdAt: string;
}

const STORAGE_KEY = "vc_leads";

export function getLeads(): Lead[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveLeads(leads: Lead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function addLead(lead: Omit<Lead, "id" | "createdAt">): Lead {
  const leads = getLeads();
  const newLead: Lead = {
    ...lead,
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  leads.push(newLead);
  saveLeads(leads);
  return newLead;
}

export function updateLeadStatus(id: string, status: LeadStatus): void {
  const leads = getLeads();
  const lead = leads.find((l) => l.id === id);
  if (lead) {
    lead.status = status;
    saveLeads(leads);
  }
}

export function updateLeadType(id: string, type: LeadType): void {
  const leads = getLeads();
  const lead = leads.find((l) => l.id === id);
  if (lead) {
    lead.type = type;
    saveLeads(leads);
  }
}

export function addLeadsFromStepResponse(response: string, day: number): void {
  const names = response.split("|").map((n) => n.trim()).filter(Boolean);
  const existing = getLeads();

  for (const name of names) {
    // Avoid duplicates by name
    if (existing.some((l) => l.name.toLowerCase() === name.toLowerCase())) continue;
    addLead({ name, platform: "other", status: "no_reply", type: "client", day });
  }
}
