"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";

type Msg = { who: "bot" | "user"; text: string };

const SUGGESTIONS = ["Is this weekend available?", "What's the price per night?", "What's your cancellation policy?"];

function greeting(nightlyRate: number): Msg[] {
  return [
    { who: "bot", text: "Hi there! 👋 Welcome to Short Stay Newport." },
    {
      who: "bot",
      text: `We're a private, self-contained studio apartment in Newport, South Wales — sleeps 2, with its own entrance, free Wi-Fi and free parking from £${nightlyRate}/night. You're about a mile from the city centre and minutes from the M4, Celtic Manor and Newport station.`,
    },
    { who: "bot", text: "Ask me anything — dates, pricing, parking, check-in, deposit — or just say hi." },
  ];
}

export default function ChatWidget({ nightlyRate }: { nightlyRate: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => greeting(nightlyRate));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, open]);

  // Nudge once per browser session, a few seconds after landing
  useEffect(() => {
    if (sessionStorage.getItem("chat-teaser-seen")) return;
    const t = setTimeout(() => setTeaser(true), 3000);
    return () => clearTimeout(t);
  }, []);

  function dismissTeaser() {
    setTeaser(false);
    sessionStorage.setItem("chat-teaser-seen", "1");
  }

  function toggleOpen() {
    dismissTeaser();
    setOpen((o) => !o);
  }

  function sanitize(v: string) {
    return v.replace(/\s+/g, " ").trim().slice(0, 500);
  }

  /** Sends the guest's message plus the real conversation so far (not the static greeting) to the assistant. */
  async function send(text: string) {
    const nextMsgs: Msg[] = [...msgs, { who: "user", text }];
    setMsgs(nextMsgs);
    setBusy(true);
    try {
      // First 3 entries are the static greeting — the assistant doesn't need
      // to be told that back, only the real conversation from here on.
      const history = nextMsgs
        .slice(3)
        .map((m) => ({ role: m.who === "bot" ? "assistant" : "user", content: m.text }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      const data = await res.json().catch(() => ({}));
      setMsgs((m) => [
        ...m,
        {
          who: "bot",
          text: res.ok && data.answer ? data.answer : "Sorry, something went wrong — please try again, or message us on WhatsApp.",
        },
      ]);
    } catch {
      setMsgs((m) => [...m, { who: "bot", text: "I couldn't reach the assistant just now — please try again, or message us on WhatsApp." }]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = sanitize(input);
    if (!value || busy) return;
    setInput("");
    send(value);
  }

  // Keep the floating launcher out of the way while a guest is mid-checkout —
  // on mobile it sat right on top of the wizard's step/payment buttons.
  if (pathname?.startsWith("/book")) return null;

  return (
    <>
      {/* Teaser nudge */}
      {teaser && !open && (
        <div className="fixed bottom-24 right-5 z-[70] flex max-w-[260px] items-start gap-2 rounded-2xl rounded-br-md border border-ink/10 bg-white p-4 pr-3 text-sm shadow-xl">
          <p className="leading-snug">
            👋 Questions about the studio? We&apos;re happy to help.
          </p>
          <button
            onClick={dismissTeaser}
            aria-label="Dismiss"
            className="-mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            ×
          </button>
        </div>
      )}

      {/* Floating launcher — styled inline so no global class can override
          its fixed positioning (that bug once pushed it off-screen) */}
      <button
        onClick={toggleOpen}
        aria-label={open ? "Close chat" : "Chat with us"}
        aria-expanded={open}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[70] flex items-center gap-2.5 rounded-full bg-gradient-to-br from-pink-400 via-accent to-accent-dark px-5 py-3.5 font-semibold text-white shadow-[0_6px_20px_rgba(236,72,153,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
      >
        {open ? (
          <span className="px-1 text-xl leading-none">×</span>
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            Chat with us
          </>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Booking enquiry chat"
          className="fixed bottom-24 right-5 z-[70] flex h-[min(560px,72svh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-3 bg-ink px-5 py-4 text-white">
            <span className="h-2.5 w-2.5 flex-none rounded-full bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.25)]" />
            <div>
              <p className="text-sm font-semibold">Short Stay Newport</p>
              <p className="text-xs text-white/60">Typically replies within a few hours</p>
            </div>
          </div>

          <div ref={logRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.who === "bot"
                    ? "self-start rounded-bl-md bg-accent/10"
                    : "self-end rounded-br-md bg-accent text-white"
                }`}
              >
                {m.text}
              </div>
            ))}

            {msgs.length <= 3 && (
              <div className="flex flex-wrap gap-2 self-start">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={busy}
                    className="rounded-full border border-accent px-3.5 py-1.5 text-xs font-medium text-accent-dark transition-colors hover:bg-accent hover:text-white disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {busy && <div className="self-start text-sm text-ink/50">Typing…</div>}

            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start rounded-full border border-[#25d366] px-3.5 py-1.5 text-xs font-medium text-[#128c3e] transition-colors hover:bg-[#25d366] hover:text-white"
            >
              Prefer WhatsApp?
            </a>
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-ink/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              type="text"
              maxLength={500}
              placeholder="Type your message…"
              aria-label="Your message"
              className="min-w-0 flex-1 rounded-full border border-ink/20 px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn-fancy px-5 py-2 text-sm disabled:opacity-40">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
