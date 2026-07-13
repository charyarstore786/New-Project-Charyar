"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { type DateRange, formatRange, parseHumanDateRange, quickRange, toIsoDate } from "@/lib/chat/dateRange";
import { matchFaq } from "@/lib/chat/faq";

type Msg = { who: "bot" | "user"; text: string };
type Step = "name" | "email" | "dates" | "typing-dates" | "confirm" | "done";
type QuickPick = "This weekend" | "Next week" | "Next month";

const QUICK_PICK_KIND: Record<QuickPick, "weekend" | "nextweek" | "nextmonth"> = {
  "This weekend": "weekend",
  "Next week": "nextweek",
  "Next month": "nextmonth",
};

const EMAIL_RE = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;

const GREETING: Msg[] = [
  { who: "bot", text: "Hi there! 👋 Welcome to Short Stay Newport." },
  {
    who: "bot",
    text: `We're a private, self-contained studio apartment in Newport, South Wales — sleeps 2, with its own entrance, free Wi-Fi and free parking from £${site.nightlyRate}/night. You're about a mile from the city centre and minutes from the M4, Celtic Manor and Newport station.`,
  },
  { who: "bot", text: "I can pass your details straight to the host. What's your name?" },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(GREETING);
  const [step, setStep] = useState<Step>("name");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", stayDates: "" });
  const [faqMode, setFaqMode] = useState(false);
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

  const bot = (text: string) => setMsgs((m) => [...m, { who: "bot", text }]);
  const user = (text: string) => setMsgs((m) => [...m, { who: "user", text }]);

  function sanitize(v: string) {
    return v.replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function pickDates(choice: QuickPick | "I'll type my dates") {
    if (choice === "I'll type my dates") {
      user(choice);
      setStep("typing-dates");
      bot("No problem — type your arrival and departure dates (e.g. 20–23 July).");
      return;
    }
    checkDates(quickRange(QUICK_PICK_KIND[choice]), choice);
  }

  /** Checks a candidate date range against the real booking calendar (same
   * availability + pricing engine as /book) instead of just logging raw text. */
  async function checkDates(range: DateRange, guestText: string) {
    user(guestText);
    setBusy(true);
    bot("Let me check the calendar…");
    const formatted = formatRange(range.checkIn, range.checkOut);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: toIsoDate(range.checkIn),
          checkOut: toIsoDate(range.checkOut),
          guests: 1,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.quote) {
        const price = (data.quote.total / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
        bot(
          `Good news — ${formatted} is available! ${data.quote.nights} night(s), total ${price}. Want me to pass this straight to the host?`,
        );
        setLead((l) => ({ ...l, stayDates: `${formatted} — available, ${price}` }));
      } else if (res.status === 409) {
        bot(`Ah, ${formatted} is already booked. I can still pass your enquiry to the host in case of a change — or try different dates?`);
        setLead((l) => ({ ...l, stayDates: `${formatted} — NOT available` }));
      } else {
        bot(`${data.error || "Those dates don't quite work for a booking."} I can still note this for the host, or you can try different dates.`);
        setLead((l) => ({ ...l, stayDates: `${formatted} — ${data.error || "invalid dates"}` }));
      }
    } catch {
      bot("I couldn't reach the calendar just now, but I've noted your dates — the host will confirm by email.");
      setLead((l) => ({ ...l, stayDates: formatted }));
    } finally {
      setBusy(false);
      setStep("confirm");
    }
  }

  async function submit(current: { name: string; email: string; stayDates: string }) {
    setBusy(true);
    setStep("done");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `company` is a honeypot — always empty for real guests
        body: JSON.stringify({ ...current, company: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      bot(`All sent! ${current.name}, the host will get back to you at ${current.email} shortly.`);
      bot("Prefer to chat right now? Tap below to message us on WhatsApp.");
    } catch (err) {
      bot(`${err instanceof Error ? err.message : "Something went wrong"} — please try again.`);
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }

  function enterFaqMode() {
    setFaqMode(true);
    bot("Sure — ask me anything about the studio (parking, check-in, deposit, pets, Wi-Fi…). Type \"back\" any time to continue where you left off.");
  }

  function exitFaqMode() {
    setFaqMode(false);
    bot("Welcome back! Let's continue.");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = sanitize(input);
    if (!value || busy) return;

    if (faqMode) {
      user(value);
      setInput("");
      if (/^back$/i.test(value)) {
        exitFaqMode();
        return;
      }
      const answer = matchFaq(value);
      bot(
        answer
          ? answer
          : "I'm not sure about that one — I'll pass it to the host to answer directly. Type another question, or \"back\" to continue.",
      );
      return;
    }

    if (step === "name") {
      if (value.length < 2) return setError("Please enter your name (at least 2 characters).");
      user(value);
      setLead((l) => ({ ...l, name: value }));
      setInput("");
      setStep("email");
      bot(`Nice to meet you, ${value}! What's the best email to reach you on?`);
    } else if (step === "email") {
      if (!EMAIL_RE.test(value)) return setError("That doesn't look like a valid email — please check and try again.");
      user(value);
      setLead((l) => ({ ...l, email: value }));
      setInput("");
      setStep("dates");
      bot("Lovely! Which dates would you like to stay?");
    } else if (step === "typing-dates") {
      if (value.length < 3) return setError("Please tell us your dates.");
      const range = parseHumanDateRange(value);
      setInput("");
      if (!range) {
        user(value);
        bot('Sorry, I couldn\'t quite read those dates — try a format like "20-23 July" or "14/08-17/08".');
        return;
      }
      checkDates(range, value);
    }
  }

  function restart() {
    user("Start again");
    setLead({ name: "", email: "", stayDates: "" });
    setStep("name");
    bot("No problem — let's start over. What's your name?");
  }

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

            {faqMode ? (
              <button
                onClick={exitFaqMode}
                className="self-start rounded-full border border-ink/20 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-ink/5"
              >
                ⬅ Back to booking
              </button>
            ) : (
              step !== "done" && (
                <button
                  onClick={enterFaqMode}
                  className="self-start rounded-full border border-ink/20 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-ink/5"
                >
                  ❓ Ask a question instead
                </button>
              )
            )}

            {!faqMode && step === "dates" && (
              <div className="flex flex-wrap gap-2 self-start">
                {(["This weekend", "Next week", "Next month", "I'll type my dates"] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => pickDates(o)}
                    className="rounded-full border border-accent px-3.5 py-1.5 text-xs font-medium text-accent-dark transition-colors hover:bg-accent hover:text-white"
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}

            {!faqMode && step === "confirm" && !busy && (
              <div className="self-start rounded-2xl border border-ink/10 bg-white p-3 text-sm shadow-sm">
                <p><span className="font-medium">Name:</span> {lead.name}</p>
                <p><span className="font-medium">Email:</span> {lead.email}</p>
                <p><span className="font-medium">Dates:</span> {lead.stayDates}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => submit(lead)} className="btn-fancy px-4 py-1.5 text-xs">
                    Yes, send it
                  </button>
                  <button
                    onClick={restart}
                    className="rounded-full border border-ink/20 px-4 py-1.5 text-xs font-medium"
                  >
                    Start again
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-snug text-ink/50">
                  We only use these details to reply about your stay — see our{" "}
                  <a href="/privacy" className="underline">
                    privacy policy
                  </a>
                  .
                </p>
              </div>
            )}

            {busy && (
              <div className="self-start text-sm text-ink/50">
                {step === "typing-dates" || step === "dates" ? "Checking…" : "Sending…"}
              </div>
            )}

            {step === "done" && !busy && (
              <a
                href={site.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start rounded-full bg-[#25d366] px-4 py-2 text-sm font-semibold text-white"
              >
                WhatsApp Chat
              </a>
            )}
          </div>

          {error && <p className="px-4 pb-1 text-xs text-red-700">{error}</p>}

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-ink/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              type="text"
              maxLength={120}
              placeholder={faqMode ? "Ask a question…" : "Type your reply…"}
              aria-label="Your reply"
              className="min-w-0 flex-1 rounded-full border border-ink/20 px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || (!faqMode && (step === "dates" || step === "confirm" || step === "done"))}
              className="btn-fancy px-5 py-2 text-sm disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
