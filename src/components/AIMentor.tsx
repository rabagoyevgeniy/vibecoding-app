"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIMentorProps {
  missionTitle: string;
  currentStep: string;
  currentDay: number;
}

export function AIMentor({ missionTitle, currentStep, currentDay }: AIMentorProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_day: currentDay,
          current_step: currentStep,
          mission_title: missionTitle,
          user_message: userMessage,
          history: messages.slice(-6), // last 3 exchanges for context
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "Sorry, something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg transition-transform hover:scale-110"
        style={{ background: "var(--accent)" }}
        title="AI Mentor"
      >
        🤖
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 flex w-80 flex-col overflow-hidden rounded-2xl shadow-2xl sm:w-96"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        height: "480px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "var(--accent)" }}
      >
        <div className="font-semibold text-white">AI Mentor</div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/80 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Context bar */}
      <div
        className="px-4 py-2 text-xs"
        style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}
      >
        Day {currentDay} · {missionTitle} · {currentStep}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
            <p className="mb-2">Hey! I&apos;m your AI mentor.</p>
            <p>Ask me anything about the current step — I&apos;ll help you build it.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 ${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className="inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap"
              style={{
                background:
                  msg.role === "user" ? "var(--accent)" : "var(--bg-card-hover)",
                color: msg.role === "user" ? "#fff" : "var(--text)",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="mb-3 text-left">
            <div
              className="inline-block rounded-xl px-3 py-2 text-sm"
              style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}
            >
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 border-t p-3" style={{ borderColor: "var(--border)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
