"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = { id: number; senderId: number; message: string; time: string };
export function ChatWindow({ userId, contactId, contactName }: { userId: number; contactId: number; contactName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/messages?contactId=${contactId}`, { cache: "no-store" });
    if (!response.ok) { setError("Could not load this conversation."); setLoading(false); return; }
    const data = await response.json() as { messages: ChatMessage[] };
    setMessages(data.messages); setLoading(false);
  }, [contactId]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 3000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const message = value.trim(); if (!message) return;
    setError(""); setValue("");
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: contactId, message }) });
    if (!response.ok) { setValue(message); setError("Message could not be sent. Please try again."); return; }
    await load();
  }
  return <section className="chat-main">
    <header className="chat-header"><a href="/messages" className="chat-back" aria-label="Back to conversations"><i className="fas fa-arrow-left" aria-hidden="true" /></a><div className="chat-avatar"><i className="fas fa-user" aria-hidden="true" /></div><h2>{contactName}</h2></header>
    <div className="chat-messages" aria-live="polite">{loading ? <div className="chat-empty">Loading messages…</div> : messages.length ? messages.map((msg) => <article key={msg.id} className={`msg-bubble ${msg.senderId === userId ? "outgoing" : "incoming"}`}>{msg.message}<time>{new Date(msg.time.replace(" ", "T") + (msg.time.endsWith("Z") ? "" : "Z")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></article>) : <div className="chat-empty">Say hello! <i className="fas fa-hand-sparkles" aria-hidden="true" /></div>}<div ref={bottom} /></div>
    <div className="chat-input-area">{error && <p role="alert" className="chat-error">{error}</p>}<form className="chat-form" onSubmit={send}><input value={value} maxLength={2000} onChange={(event) => setValue(event.target.value)} placeholder="Type a message…" aria-label="Message" required /><button type="submit">Send</button></form></div>
  </section>;
}
