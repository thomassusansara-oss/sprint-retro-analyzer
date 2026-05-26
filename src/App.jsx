import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = {
  done: "#00e5a0", blocked: "#ff4c6a", inprogress: "#f5a623",
  todo: "#4a9eff", bg: "#0b0f1a", card: "#111827",
  border: "#1e2a3a", text: "#e2e8f0", muted: "#64748b", ai: "#a78bfa",
};

const SAMPLE_CSV = `Issue Key,Summary,Assignee,Status,Priority,Story Points,Sprint,Created Date,Resolved Date,Labels,Epic
PROJ-101,Login page redesign,Alice,Done,High,5,Sprint 12,2026-05-01,2026-05-08,feature,Auth
PROJ-102,Fix payment gateway bug,Bob,Done,Critical,3,Sprint 12,2026-05-01,2026-05-06,bug,Payments
PROJ-103,API rate limiting,Alice,Done,Medium,8,Sprint 12,2026-05-01,2026-05-10,feature,API
PROJ-104,Dashboard charts,Carol,In Progress,High,5,Sprint 12,2026-05-01,,feature,UI
PROJ-105,User onboarding flow,Bob,Blocked,High,8,Sprint 12,2026-05-02,,blocked,Onboarding
PROJ-106,Email notifications,Dave,Done,Low,3,Sprint 12,2026-05-01,2026-05-07,feature,Notifications
PROJ-107,Database migration,Carol,Blocked,Critical,13,Sprint 12,2026-05-01,,blocked,Infrastructure
PROJ-108,Search functionality,Dave,In Progress,Medium,5,Sprint 12,2026-05-03,,feature,Search
PROJ-109,Mobile responsiveness,Alice,Done,Medium,3,Sprint 12,2026-05-01,2026-05-09,feature,UI
PROJ-110,Performance optimisation,Bob,To Do,Low,5,Sprint 12,2026-05-04,,tech-debt,API
PROJ-111,Auth token refresh,Carol,Done,High,3,Sprint 12,2026-05-01,2026-05-08,feature,Auth
PROJ-112,Export to CSV feature,Dave,Blocked,Medium,5,Sprint 12,2026-05-05,,blocked,UI
PROJ-113,Unit test coverage,Alice,To Do,Low,3,Sprint 12,2026-05-04,,tech-debt,QA
PROJ-114,CI/CD pipeline fix,Bob,Done,High,5,Sprint 12,2026-05-01,2026-05-07,bug,DevOps
PROJ-115,Dark mode toggle,Carol,To Do,Low,2,Sprint 12,2026-05-06,,feature,UI`;

function parseCSV(text) {
  const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
  return result.data;
}

function normalizeStatus(s = "") {
  const lower = s.toLowerCase().replace(/\s+/g, "");
  if (lower.includes("done") || lower.includes("closed") || lower.includes("resolved")) return "Done";
  if (lower.includes("blocked")) return "Blocked";
  if (lower.includes("inprogress") || lower.includes("progress")) return "In Progress";
  return "To Do";
}

function analyzeData(rows) {
  const statusField = ["Status", "status", "List Name"].find(f => rows[0]?.[f] !== undefined) || "Status";
  const assigneeField = ["Assignee", "assignee", "Members"].find(f => rows[0]?.[f] !== undefined) || "Assignee";
  const pointsField = ["Story Points", "story_points"].find(f => rows[0]?.[f] !== undefined) || "Story Points";

  const statuses = rows.map(r => normalizeStatus(r[statusField]));
  const done = rows.filter((_, i) => statuses[i] === "Done");
  const blocked = rows.filter((_, i) => statuses[i] === "Blocked");
  const inProgress = rows.filter((_, i) => statuses[i] === "In Progress");
  const todo = rows.filter((_, i) => statuses[i] === "To Do");

  const totalPoints = rows.reduce((s, r) => s + (parseFloat(r[pointsField]) || 0), 0);
  const completedPoints = done.reduce((s, r) => s + (parseFloat(r[pointsField]) || 0), 0);

  const assigneeMap = {};
  rows.forEach((r, i) => {
    const name = r[assigneeField] || "Unassigned";
    if (!assigneeMap[name]) assigneeMap[name] = { total: 0, done: 0, blocked: 0, inProgress: 0 };
    assigneeMap[name].total++;
    if (statuses[i] === "Done") assigneeMap[name].done++;
    else if (statuses[i] === "Blocked") assigneeMap[name].blocked++;
    else if (statuses[i] === "In Progress") assigneeMap[name].inProgress++;
  });

  const teamData = Object.entries(assigneeMap).map(([name, d]) => ({ name, ...d }));
  const statusDist = [
    { name: "Done", value: done.length, color: COLORS.done },
    { name: "Blocked", value: blocked.length, color: COLORS.blocked },
    { name: "In Progress", value: inProgress.length, color: COLORS.inprogress },
    { name: "To Do", value: todo.length, color: COLORS.todo },
  ].filter(d => d.value > 0);

  const labelMap = {};
  rows.forEach(r => {
    const label = r["Labels"] || r["labels"] || "none";
    labelMap[label] = (labelMap[label] || 0) + 1;
  });
  const labelData = Object.entries(labelMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const completionRate = rows.length ? done.length / rows.length : 0;
  const blockerRate = rows.length ? blocked.length / rows.length : 0;
  const velocityRate = totalPoints ? completedPoints / totalPoints : 0;
  const healthScore = Math.round((completionRate * 0.4 + (1 - blockerRate) * 0.3 + velocityRate * 0.3) * 100);

  return {
    total: rows.length, done: done.length, blocked: blocked.length,
    inProgress: inProgress.length, todo: todo.length,
    totalPoints, completedPoints, teamData, statusDist, labelData,
    blockedTickets: blocked.map(r => ({
      key: r["Issue Key"] || "—",
      summary: r["Summary"] || r["Card Name"] || "—",
      owner: r[assigneeField] || "—",
      priority: r["Priority"] || "—"
    })),
    healthScore,
    sprintName: rows[0]?.["Sprint"] || "Current Sprint",
  };
}

function buildContext(data) {
  return `Sprint: ${data.sprintName}
Total tickets: ${data.total}
Done: ${data.done} | Blocked: ${data.blocked} | In Progress: ${data.inProgress} | To Do: ${data.todo}
Story points: ${data.completedPoints} completed of ${data.totalPoints} total
Health score: ${data.healthScore}/100
Per person:
${data.teamData.map(m => `${m.name}: ${m.total} tickets — ${m.done} done, ${m.blocked} blocked, ${m.inProgress} in progress, ${m.total - m.done - m.blocked - m.inProgress} to do`).join("\n")}
Blocked tickets:
${data.blockedTickets.length === 0 ? "None" : data.blockedTickets.map(t => `${t.key} | "${t.summary}" | Owner: ${t.owner} | Priority: ${t.priority}`).join("\n")}`;
}

const SYSTEM_PROMPT = `You are a sprint data assistant. Answer strictly based on the sprint data provided.
Rules:
- Never assume or invent information not present in the data
- For summaries: be thorough and use all sections requested
- For chat questions: keep responses concise (3-6 lines max)
- If the data does not have enough info to answer, say so clearly
- No generic advice unless directly supported by the data`;

const SUMMARY_PROMPT = `Analyze the sprint data below and give a detailed but data-only summary.
Use the following sections with clear headers:

**📊 Sprint Status**
State total tickets, how many are done, in progress, blocked, and to do. Include story points completed vs total. State the health score and what it reflects.

**🔴 Blockers**
List every blocked ticket by ID, summary, owner, and priority. If none, say None.

**👥 Team Breakdown**
For each person: how many tickets total, how many done, in progress, blocked, to do. Flag anyone with 0 done or with blocked tickets.

**⚡ Velocity**
State points completed vs committed. Calculate completion percentage. Note if any person has a high remaining load.

**⚠️ Risks**
List specific risks visible in the data — blocked tickets, low completion, unstarted work. Only state what the data shows. If no risks, say None.

**✅ What's Going Well**
List what is positive from the data — completions, who is on track, cleared tickets.

Rules:
- Only use what is in the data. No assumptions.
- Be specific — use names, ticket IDs, numbers.
- Do not give generic advice not supported by data.`;

async function streamClaude({ messages, onChunk, onDone, onError }) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages,
      })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === "content_block_delta" && evt.delta?.text) onChunk(evt.delta.text);
          } catch {}
        }
      }
    }
    onDone();
  } catch {
    onError("⚠️ Could not reach AI. Please try again.");
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e2a3a", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ color: COLORS.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || COLORS.text }}>{p.name}: <b>{p.value}</b></div>)}
    </div>
  );
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{label}</span>
      <span style={{ color: color || COLORS.text, fontSize: 32, fontWeight: 800, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ color: COLORS.muted, fontSize: 12 }}>{sub}</span>}
    </div>
  );
}

function HealthRing({ score }) {
  const r = 52, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? COLORS.done : score >= 50 ? COLORS.inprogress : COLORS.blocked;
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={120} height={120} style={{ flexShrink: 0 }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke={COLORS.border} strokeWidth={10} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 60 60)" />
        <text x={60} y={64} textAnchor="middle" fill={color} fontSize={22} fontWeight={800} fontFamily="'Syne', sans-serif">{score}</text>
        <text x={60} y={80} textAnchor="middle" fill={COLORS.muted} fontSize={10} fontFamily="'DM Mono', monospace">/100</text>
      </svg>
      <div>
        <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Sprint Health</div>
        <div style={{ color, fontSize: 20, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
          {score >= 75 ? "Healthy 🟢" : score >= 50 ? "At Risk 🟡" : "Critical 🔴"}
        </div>
        <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>Based on completion, blockers & velocity</div>
      </div>
    </div>
  );
}

// ── Summary Panel (on-click only) ─────────────────────────────────
function SummaryPanel({ data }) {
  const context = buildContext(data);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = () => {
    setSummary(""); setLoading(true); setGenerated(false);
    streamClaude({
      messages: [{ role: "user", content: `${SUMMARY_PROMPT}\n\nData:\n${context}` }],
      onChunk: t => setSummary(prev => prev + t),
      onDone: () => { setLoading(false); setGenerated(true); },
      onError: e => { setSummary(e); setLoading(false); setGenerated(true); },
    });
  };

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ai}44`, borderRadius: 12, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: summary ? 18 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${COLORS.ai}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✦</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>AI Sprint Summary</div>
            <div style={{ color: COLORS.muted, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Precise · Data-only · No assumptions</div>
          </div>
        </div>
        <button onClick={generate} disabled={loading} style={{
          background: loading ? "transparent" : `${COLORS.ai}22`,
          border: `1px solid ${COLORS.ai}66`, color: COLORS.ai,
          borderRadius: 8, padding: "8px 20px", cursor: loading ? "not-allowed" : "pointer",
          fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
          opacity: loading ? 0.6 : 1, transition: "opacity 0.2s"
        }}>
          {loading ? "Generating..." : generated ? "↺ Regenerate" : "✦ Generate Summary"}
        </button>
      </div>

      {!summary && !loading && (
        <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          Click <b style={{ color: COLORS.ai }}>Generate Summary</b> to get a precise data-based sprint snapshot
        </div>
      )}

      {(summary || loading) && (
        <div style={{
          background: "#0d1220", borderRadius: 10, padding: "16px 20px",
          fontSize: 13.5, lineHeight: 1.85, color: COLORS.text,
          border: `1px solid ${COLORS.border}`, whiteSpace: "pre-wrap",
          fontFamily: "'DM Sans', sans-serif", marginTop: 4
        }}>
          {summary}
          {loading && <span style={{ color: COLORS.ai, animation: "blink 1s infinite" }}>▌</span>}
        </div>
      )}
    </div>
  );
}

// ── Chatbot Panel (standalone, always ready) ───────────────────────
function ChatbotPanel({ data }) {
  const context = buildContext(data);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", content: q };
    const newChat = [...chat, userMsg];
    setChat(newChat);
    setLoading(true);
    scrollDown();

    // Build messages — always inject context as first user message
    const messages = newChat.length === 1
      ? [{ role: "user", content: `Sprint data:\n${context}\n\nQuestion: ${q}` }]
      : [
          { role: "user", content: `Sprint data:\n${context}\n\nQuestion: ${newChat[0].content}` },
          ...newChat.slice(1).map(m => ({ role: m.role, content: m.content })),
        ];

    let answer = "";
    setChat(prev => [...prev, { role: "assistant", content: "" }]);

    await streamClaude({
      messages,
      onChunk: t => {
        answer += t;
        setChat(prev => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: answer };
          return u;
        });
        scrollDown();
      },
      onDone: () => setLoading(false),
      onError: e => {
        setChat(prev => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: e };
          return u;
        });
        setLoading(false);
      },
    });
  };

  const CHIPS = [
    "Who has the most capacity?",
    "Which blocker is most critical?",
    "What's at risk this sprint?",
    "Who owns the most blocked tickets?",
    "How is velocity looking?",
    "Who has no completed tickets?",
  ];

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10, background: "#0d1220" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${COLORS.todo}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💬</div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>Sprint Chatbot</div>
          <div style={{ color: COLORS.muted, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Ask anything about your sprint data</div>
        </div>
      </div>

      {/* Suggestion chips */}
      <div style={{ padding: "14px 24px 10px", display: "flex", flexWrap: "wrap", gap: 8, borderBottom: `1px solid ${COLORS.border}` }}>
        {CHIPS.map(c => (
          <button key={c} onClick={() => send(c)} disabled={loading} style={{
            background: "transparent", border: `1px solid ${COLORS.border}`,
            color: COLORS.muted, borderRadius: 20, padding: "5px 13px",
            cursor: loading ? "not-allowed" : "pointer", fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
          }}>{c}</button>
        ))}
      </div>

      {/* Chat messages */}
      <div style={{ padding: "16px 24px", minHeight: 180, maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {chat.length === 0 && (
          <div style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", paddingTop: 30 }}>
            👆 Click a suggestion or type your own question below
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "84%",
            background: m.role === "user" ? `${COLORS.todo}18` : "#0d1220",
            border: `1px solid ${m.role === "user" ? COLORS.todo + "33" : COLORS.border}`,
            borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
            padding: "10px 14px", fontSize: 13.5, lineHeight: 1.7,
            color: COLORS.text, whiteSpace: "pre-wrap"
          }}>
            {m.role === "assistant" && (
              <div style={{ color: COLORS.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>✦ ASSISTANT</div>
            )}
            {m.content
              ? m.content
              : loading && i === chat.length - 1
                ? <span style={{ color: COLORS.muted, fontStyle: "italic" }}>Thinking...</span>
                : ""}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 20px 18px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about your sprint data..."
          disabled={loading}
          style={{
            flex: 1, background: "#0d1220", border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: "10px 14px", color: COLORS.text,
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none",
            opacity: loading ? 0.6 : 1
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          background: COLORS.todo, border: "none", color: "#0b0f1a",
          borderRadius: 8, padding: "10px 20px", cursor: "pointer",
          fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
          opacity: loading || !input.trim() ? 0.4 : 1, transition: "opacity 0.2s"
        }}>Send</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function SprintDashboard() {
  const [data, setData] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const process = useCallback((text) => {
    try {
      const rows = parseCSV(text);
      if (!rows.length) throw new Error("No data");
      setData(analyzeData(rows));
      setError("");
    } catch {
      setError("Could not parse CSV. Please check the format.");
    }
  }, []);

  const onFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = e => process(e.target.result);
    reader.readAsText(file);
  }, [process]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  }, [onFile]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} input:focus{border-color:#4a9eff !important;}`}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}>
            Sprint<span style={{ color: COLORS.done }}>Retro</span> <span style={{ color: COLORS.ai, fontSize: 14, fontWeight: 600 }}>✦ AI</span>
          </div>
          <div style={{ color: COLORS.muted, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Retrospective Analyzer</div>
        </div>
        {data && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ background: "#1e2a3a", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, color: COLORS.muted }}>
              📋 {data.sprintName} · {data.total} tickets
            </div>
            <button onClick={() => setData(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              ↑ New CSV
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        {!data ? (
          <div style={{ paddingTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Upload your Sprint CSV</div>
              <div style={{ color: COLORS.muted, fontSize: 15 }}>Charts · AI Summary · Chatbot — all from your data</div>
            </div>
            <label
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                width: "100%", maxWidth: 520,
                border: `2px dashed ${dragging ? COLORS.done : COLORS.border}`,
                borderRadius: 16, padding: "48px 32px", textAlign: "center",
                cursor: "pointer", background: dragging ? "rgba(0,229,160,0.04)" : COLORS.card,
                transition: "all 0.2s", display: "block"
              }}>
              <input type="file" accept=".csv" onChange={e => e.target.files[0] && onFile(e.target.files[0])} style={{ display: "none" }} />
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop your CSV here</div>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>or click to browse · Jira & Trello supported</div>
            </label>
            {error && <div style={{ color: COLORS.blocked, fontSize: 13 }}>{error}</div>}
            <div style={{ color: COLORS.muted, fontSize: 13 }}>Don't have a CSV?</div>
            <button onClick={() => process(SAMPLE_CSV)} style={{
              background: "transparent", border: `1px solid ${COLORS.done}`, color: COLORS.done,
              borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14,
              fontWeight: 600, fontFamily: "'DM Sans', sans-serif"
            }}>✨ Load Sample Data</button>
          </div>
        ) : (
          <div style={{ paddingTop: 32, display: "flex", flexDirection: "column", gap: 24 }}>

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 16 }}>
              <HealthRing score={data.healthScore} />
              <StatCard label="Completed" value={data.done} sub={`of ${data.total} tickets`} color={COLORS.done} />
              <StatCard label="Blocked" value={data.blocked} sub="need attention" color={data.blocked > 0 ? COLORS.blocked : COLORS.done} />
              <StatCard label="In Progress" value={data.inProgress} sub="active now" color={COLORS.inprogress} />
              <StatCard label="Velocity" value={data.completedPoints} sub={`of ${data.totalPoints} pts`} color={COLORS.todo} />
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>Status Distribution</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                      {data.statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={v => <span style={{ color: COLORS.text, fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>Team Workload</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.teamData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="done" name="Done" fill={COLORS.done} radius={[3,3,0,0]} />
                    <Bar dataKey="inProgress" name="In Progress" fill={COLORS.inprogress} radius={[3,3,0,0]} />
                    <Bar dataKey="blocked" name="Blocked" fill={COLORS.blocked} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>Ticket Labels / Types</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.labelData} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: COLORS.muted, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Tickets" fill={COLORS.todo} radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 16 }}>Capacity Utilisation</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {data.teamData.map(m => {
                    const pct = Math.round((m.done / m.total) * 100);
                    return (
                      <div key={m.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                          <span>{m.name} {m.total >= 5 ? "⚠️" : ""}</span>
                          <span style={{ color: COLORS.muted }}>{m.done}/{m.total} done</span>
                        </div>
                        <div style={{ background: COLORS.border, borderRadius: 4, height: 8 }}>
                          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: pct >= 80 ? COLORS.done : pct >= 50 ? COLORS.inprogress : COLORS.blocked, transition: "width 0.8s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Blocked Tickets */}
            {data.blockedTickets.length > 0 && (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.blocked}33`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 16, color: COLORS.blocked }}>🔴 Blocked Tickets</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: COLORS.muted, textAlign: "left" }}>
                      {["Ticket", "Summary", "Owner", "Priority"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.08em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.blockedTickets.map((t, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: "10px 12px", color: COLORS.blocked, fontFamily: "'DM Mono', monospace" }}>{t.key}</td>
                        <td style={{ padding: "10px 12px" }}>{t.summary}</td>
                        <td style={{ padding: "10px 12px", color: COLORS.inprogress }}>{t.owner}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: t.priority === "Critical" ? `${COLORS.blocked}22` : `${COLORS.inprogress}22`, color: t.priority === "Critical" ? COLORS.blocked : COLORS.inprogress, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{t.priority}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ✦ AI Summary — on click */}
            <SummaryPanel data={data} />

            {/* 💬 Chatbot — standalone */}
            <ChatbotPanel data={data} />

          </div>
        )}
      </div>
    </div>
  );
}
