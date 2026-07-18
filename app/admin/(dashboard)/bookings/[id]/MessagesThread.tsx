"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/admin/Card";
import { sendGuestMessage } from "./actions";

type Message = { id: string; direction: string; body: string; createdAt: string };

export default function MessagesThread({ bookingId, messages }: { bookingId: string; messages: Message[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  function onSend() {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      await sendGuestMessage(bookingId, body);
      setDraft("");
      router.refresh();
    });
  }

  return (
    <Card as="section" className="p-5 lg:col-span-2">
      <h2 className="font-display text-lg font-semibold">Messages</h2>

      {messages.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">No messages yet — send one below, or wait for the guest to reply to a booking email.</p>
      ) : (
        <div className="mt-3 max-h-96 space-y-3 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === "OUT" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                  m.direction === "OUT" ? "bg-gold/15 text-ink" : "bg-ink/5 text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-xs text-ink/40">
                  {m.direction === "OUT" ? "You" : "Guest"} · {new Date(m.createdAt).toLocaleString("en-GB")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Type a message to the guest…"
          className="admin-input flex-1 resize-none"
        />
        <button
          type="button"
          disabled={pending || !draft.trim()}
          onClick={onSend}
          className="admin-btn admin-btn-primary self-end"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </Card>
  );
}
