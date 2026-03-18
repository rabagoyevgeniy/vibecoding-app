export interface User {
  id: string;
  email: string;
  goal: "money" | "startup" | "ai" | null;
  created_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  current_day: number;
  xp: number;
  level: number;
}

export interface Mission {
  id: string;
  day: number;
  title: string;
  description: string;
}

export interface MissionStep {
  id: string;
  mission_id: string;
  title: string;
  description: string;
  order: number;
  status: "pending" | "done";
}

// Supabase generated types placeholder
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at">;
        Update: Partial<Omit<User, "id">>;
      };
      progress: {
        Row: Progress;
        Insert: Omit<Progress, "id">;
        Update: Partial<Omit<Progress, "id">>;
      };
      missions: {
        Row: Mission;
        Insert: Omit<Mission, "id">;
        Update: Partial<Omit<Mission, "id">>;
      };
      mission_steps: {
        Row: MissionStep;
        Insert: Omit<MissionStep, "id">;
        Update: Partial<Omit<MissionStep, "id">>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
