import { redirect } from "next/navigation";
import { getChatContact, getChatContacts } from "@/app/lib/data/messages";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import { ChatWindow } from "./chat-window";
import "./messages.css";

export const metadata = { title: "Messages | AGRIC DSS" };
type Props = { searchParams: Promise<{ user_id?: string }> };

export default async function MessagesPage({ searchParams }: Props) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fmessages");
  const currentUser = await getUserById(session.userId);
  if (!currentUser) redirect("/login");
  const { user_id } = await searchParams;
  const activeId = Number(user_id) || 0;
  const active = activeId ? await getChatContact(currentUser.id, activeId) : undefined;
  const contacts = await getChatContacts(currentUser.id, active ? active.id : 0);
  return <main className="messages-page"><div className={`chat-container${active ? " has-active" : ""}`}>
    <aside className="chat-sidebar"><div className="sidebar-header"><i className="fas fa-comment-dots" aria-hidden="true" /> Messages</div><nav className="contact-list">{contacts.length ? contacts.map((contact) => <a href={`/messages?user_id=${contact.id}`} key={contact.id} className={`contact-item${active?.id === contact.id ? " active" : ""}`}><div className="chat-avatar"><i className="fas fa-user" aria-hidden="true" /></div><div className="contact-info"><strong>{contact.name}</strong><span>{contact.lastMessage || "No messages yet"}</span></div>{contact.unread > 0 && <b className="unread-badge">{contact.unread}</b>}</a>) : <p className="contacts-empty">No conversations yet.</p>}</nav></aside>
    {active ? <ChatWindow userId={currentUser.id} contactId={active.id} contactName={active.name || "User"} /> : <section className="chat-main chat-placeholder"><i className="fas fa-comment-dots" aria-hidden="true" /><h1>Your Messages</h1><p>Select a conversation from the left to start chatting.</p></section>}
  </div></main>;
}
