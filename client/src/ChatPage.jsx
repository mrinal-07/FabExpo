import React from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { api, API_BASE, getToken } from "./api.js";

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatPage({ me, onRefreshMe }) {
  const [conversations, setConversations] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [companies, setCompanies] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [pickId, setPickId] = React.useState("");
  const [socketConnected, setSocketConnected] = React.useState(false);

  const selectedIdRef = React.useRef("");
  const socketRef = React.useRef(null);
  const threadEndRef = React.useRef(null);

  const loadConversations = React.useCallback(async () => {
    const data = await api.chatConversations();
    setConversations(data.conversations || []);
  }, []);

  React.useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadConversations();
        if (me.role === "user") {
          const c = await api.chatCompanies();
          if (!cancelled) setCompanies(c.companies || []);
        } else if (me.role === "company") {
          const u = await api.chatUsers();
          if (!cancelled) setUsers(u.users || []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me.role, loadConversations]);

  React.useEffect(() => {
    const socket = io(API_BASE, {
      auth: { token: getToken() },
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("chat:message", (payload) => {
      const convId = String(payload.conversationId || "");
      if (convId && convId === String(selectedIdRef.current)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(payload._id))) return prev;
          return [
            ...prev,
            {
              _id: payload._id,
              body: payload.body,
              createdAt: payload.createdAt,
              senderId: payload.senderId,
              senderName: payload.senderName
            }
          ];
        });
      }
      loadConversations();
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadConversations]);

  React.useEffect(() => {
    if (!selectedId || !socketRef.current) return;
    const socket = socketRef.current;
    socket.emit("chat:join", { conversationId: selectedId }, (ack) => {
      if (ack && !ack.ok) setError(ack.error || "Could not join chat");
    });
    return () => {
      socket.emit("chat:leave", { conversationId: selectedId });
    };
  }, [selectedId]);

  React.useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.chatMessages(selectedId);
        if (!cancelled) setMessages(data.messages || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load messages");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startConversation() {
    setError("");
    try {
      if (me.role === "user") {
        if (!pickId) return;
        const { conversation } = await api.chatCreateConversation({ companyId: pickId });
        await loadConversations();
        setSelectedId(String(conversation._id));
      } else {
        if (!pickId) return;
        const { conversation } = await api.chatCreateConversation({ userId: pickId });
        await loadConversations();
        setSelectedId(String(conversation._id));
      }
      setPickId("");
    } catch (e) {
      setError(e.message || "Could not start chat");
    }
  }

  function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedId || !socketRef.current) return;
    setInput("");
    socketRef.current.emit("chat:send", { conversationId: selectedId, body: text }, (ack) => {
      if (ack && !ack.ok) setError(ack.error || "Send failed");
      if (ack?.ok && onRefreshMe) onRefreshMe();
    });
  }

  const otherLabel =
    me.role === "user"
      ? "Message a textile company"
      : "Message a user who listed fabric";

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Messages</h2>
        <div className="row">
          <span className="pill">{socketConnected ? "Live" : "Connecting…"}</span>
          <Link className="btn" to="/">
            Home
          </Link>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        One-to-one chat between users and companies. Open a thread, then type — messages sync in real time.
      </p>
      {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}

      <div className="chat-layout">
        <div className="chat-sidebar card">
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Conversations</h3>
          <div className="chat-new">
            <label className="muted" style={{ fontSize: 12 }}>
              {otherLabel}
            </label>
            <select
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              style={{ marginTop: 6 }}
            >
              <option value="">Choose…</option>
              {me.role === "user"
                ? companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))
                : users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
            </select>
            <button type="button" className="btn primary" style={{ marginTop: 8 }} onClick={startConversation}>
              Start chat
            </button>
          </div>
          <div className="chat-list">
            {loading ? <p className="muted">Loading…</p> : null}
            {!loading && !conversations.length ? (
              <p className="muted">No conversations yet.</p>
            ) : null}
            {conversations.map((c) => (
              <button
                key={c._id}
                type="button"
                className={`chat-list-item ${String(selectedId) === String(c._id) ? "active" : ""}`}
                onClick={() => setSelectedId(String(c._id))}
              >
                <strong>{c.otherParty?.name || "Chat"}</strong>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {c.lastMessagePreview || "No messages yet"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="chat-main card">
          {!selectedId ? (
            <p className="muted">Select a conversation or start a new one.</p>
          ) : (
            <>
              <div className="chat-thread">
                {messages.map((m) => {
                  const mine = String(m.senderId) === String(me.id);
                  return (
                    <div key={m._id} className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
                      <div className="chat-meta">
                        {mine ? "You" : m.senderName || "Them"} · {formatTime(m.createdAt)}
                      </div>
                      <div>{m.body}</div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>
              <form className="chat-compose" onSubmit={send}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  autoComplete="off"
                />
                <button type="submit" className="btn primary" disabled={!socketConnected}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
