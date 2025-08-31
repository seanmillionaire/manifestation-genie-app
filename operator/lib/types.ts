export type Channel = "email" | "sms" | "whatsapp" | "slack" | "calendar";

export type Action = {
  id: string;
  goal: string;
  why_now: string;
  channel: Channel;
  cta_label: string;
  draft: string;
  success_metric: string;
  deadline?: string;
};

export type AgentResponse = {
  summary: string;
  actions: Action[];
  memory_updates?: Record<string, any>;
  cosmic_gem?: string | null;
};

export type KPIs = {
  wins: number;
  sends: number;
  replies: number;
  revenue: number;
};
