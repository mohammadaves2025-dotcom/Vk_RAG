import { useState, useRef, useEffect, useMemo } from "react";
import "./App.css";

const CATEGORIES = [
  { id: "all", label: "🌟 All Topics" },
  { id: "batting", label: "🏏 Batting & Records" },
  { id: "icc", label: "🏆 ICC & World Cups" },
  { id: "ipl", label: "🔴 IPL & RCB" },
  { id: "bio", label: "📖 Bio & Debut" },
];

const SUGGESTIONS = [
  {
    category: "batting",
    icon: "🏏",
    text: "How many centuries has Virat Kohli scored in international cricket?",
    tag: "Centuries"
  },
  {
    category: "batting",
    icon: "🔥",
    text: "Why is Virat Kohli hailed as cricket's greatest 'Chase Master'?",
    tag: "Chases"
  },
  {
    category: "icc",
    icon: "🏆",
    text: "What was Kohli's performance in the 2023 ODI World Cup and 2024 T20 World Cup?",
    tag: "World Cups"
  },
  {
    category: "icc",
    icon: "👑",
    text: "What are Kohli's top achievements as Indian Test team captain?",
    tag: "Captaincy"
  },
  {
    category: "ipl",
    icon: "🔴",
    text: "What is Virat Kohli's record for Royal Challengers Bengaluru (RCB) in the IPL?",
    tag: "IPL Stats"
  },
  {
    category: "bio",
    icon: "📅",
    text: "When and where was Virat Kohli born, and when did he make his international debut?",
    tag: "Biography"
  },
];


// Lightweight Markdown Formatter
function formatMarkdown(content) {
  if (!content) return null;

  // Split by newlines to render paragraphs and lists
  const lines = content.split("\n");
  const elements = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`spacer-${index}`} className="md-spacer" />);
      return;
    }

    // Bullet points (* or -)
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const cleanLine = trimmed.replace(/^[\*\-]\s+/, "");
      elements.push(
        <div key={`li-${index}`} className="md-list-item">
          <span className="md-bullet">•</span>
          <span>{renderInlineFormatting(cleanLine)}</span>
        </div>
      );
      return;
    }

    // Numbered lists (1. , 2. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={`num-${index}`} className="md-list-item">
          <span className="md-num">{numberedMatch[1]}.</span>
          <span>{renderInlineFormatting(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${index}`} className="md-paragraph">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  return elements;
}

// Inline formatting for bold, backticks, citations
function renderInlineFormatting(text) {
  // Regex to match **bold** or `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="md-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="md-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [bgMode, setBgMode] = useState("cinematic"); // "cinematic", "focus", "spotlight"
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalTab, setModalTab] = useState("diagram"); // "diagram", "stages", "guardrails"
  const [activeQuery, setActiveQuery] = useState("");

  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Loading animation cycle
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 3);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const copyToClipboard = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      showToast("Answer copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch {
      showToast("Could not copy text.");
    }
  };

  async function send(text) {
    const question = text.trim();
    if (!question || loading) return;

    setActiveQuery(question);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { role: "user", text: question, time: timeStr }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "RAG engine query failed.");

      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.answer,
          sources: data.sources || [],
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: err.message || "Failed to reach server. Please ensure the backend is running.",
          error: true,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    showToast("Conversation cleared");
  }

  const filteredSuggestions = useMemo(() => {
    if (activeCategory === "all") return SUGGESTIONS;
    return SUGGESTIONS.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  const loadingMessages = [
    "Searching Astra DB vector embeddings...",
    "Matching high-similarity Kohli career chunks...",
    "Synthesizing response with Gemini 3.8 Flash...",
  ];

  return (
    <div className={`page bg-${bgMode}`}>
      {/* Toast notification */}
      {toastMessage && (
        <div className="toast-notification">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Glassmorphic Panel */}
      <div className="panel">
        {/* Header Bar */}
        <header className="chat-header">
          <div className="header-brand">
            <div className="jersey-badge" title="Jersey No. 18">
              <span className="jersey-num">18</span>
              <span className="jersey-sub">VK</span>
              <span className="jersey-crown">👑</span>
            </div>

            <div className="header-info">
              <div className="title-row">
                <h1>Virat Kohli AI</h1>
                <span className="rag-status-badge">
                  <span className="status-dot" />
                  Astra DB RAG
                </span>
              </div>
              <p className="subtitle">
                Vector-retrieval engine powered by Google Gemini &amp; Wikipedia archives
              </p>
            </div>
          </div>

          <div className="header-controls">
            {/* Background Clarity Modes */}
            <div className="bg-mode-selector" title="Adjust background image clarity">
              <span className="mode-label">Photo:</span>
              <button
                className={`mode-btn ${bgMode === "spotlight" ? "active" : ""}`}
                onClick={() => setBgMode("spotlight")}
                title="Vivid / Photo Focused"
              >
                Vivid
              </button>
              <button
                className={`mode-btn ${bgMode === "cinematic" ? "active" : ""}`}
                onClick={() => setBgMode("cinematic")}
                title="Cinematic Glass (Balanced)"
              >
                Cinematic
              </button>
              <button
                className={`mode-btn ${bgMode === "focus" ? "active" : ""}`}
                onClick={() => setBgMode("focus")}
                title="Deep Dark Focus Mode"
              >
                Focus
              </button>
            </div>

            {/* Pipeline Visual Button */}
            <button
              className="btn-pipeline"
              onClick={() => {
                setModalTab("diagram");
                setShowInfoModal(true);
              }}
              title="View Interactive RAG Pipeline Visual & Architecture"
            >
              <span className="pipeline-pulse" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Pipeline Visual</span>
            </button>

            {/* Reset chat button */}
            {messages.length > 0 && (
              <button
                className="btn-reset"
                onClick={clearChat}
                title="Clear conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                </svg>
                <span>Clear</span>
              </button>
            )}
          </div>
        </header>


        {/* Chat / Content Stream */}
        <div className="messages" id="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-state">
              <div className="welcome-card">
                <div className="crest-ring">
                  <div className="inner-crest">🏏</div>
                </div>

                <h2>The King Kohli Knowledge Vault</h2>
                <p>
                  Explore statistics, match-winning knocks, records, and career milestones. Every answer is retrieved from indexed career documents and verified for zero hallucinations.
                </p>

                {/* Category Filter Tabs */}
                <div className="category-tabs">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      className={`cat-tab ${activeCategory === cat.id ? "active" : ""}`}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Single-Line Compact Suggestions */}
                <div className="suggestions-list">
                  {filteredSuggestions.map((s, idx) => {
                    const isQueryingThis = loading && activeQuery === s.text;
                    return (
                      <button
                        key={idx}
                        className={`suggestion-row ${isQueryingThis ? "is-active-query" : ""}`}
                        onClick={() => send(s.text)}
                        disabled={loading}
                        title={s.text}
                      >
                        <div className="row-left">
                          <span className="row-icon">{s.icon}</span>
                          <span className="row-badge">{s.tag}</span>
                          <span className="row-text">{s.text}</span>
                        </div>
                        <div className="row-right">
                          {isQueryingThis ? (
                            <span className="querying-chip">
                              <span className="chip-spinner" />
                              <span>Searching…</span>
                            </span>
                          ) : (
                            <span className="ask-chip">
                              <span>Ask</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`message-row ${m.role}`}>
                <div className="avatar">
                  {m.role === "user" ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  ) : (
                    <span className="avatar-vk">18</span>
                  )}
                </div>

                <div className={`bubble ${m.role} ${m.error ? "error" : ""}`}>
                  <div className="bubble-header">
                    <div className="author-wrap">
                      <span className="bubble-author">
                        {m.role === "user" ? "You" : "Kohli Intelligence"}
                      </span>
                      {m.role === "bot" && !m.error && (
                        <span className="verified-pill">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Ground Truth
                        </span>
                      )}
                    </div>

                    <div className="bubble-meta">
                      {m.time && <span className="bubble-time">{m.time}</span>}
                      {m.role === "bot" && !m.error && (
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(m.text, i)}
                          title="Copy answer"
                        >
                          {copiedIndex === i ? (
                            <span className="copied-tag">Copied!</span>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Formatted Text Content */}
                  <div className="bubble-content">
                    {formatMarkdown(m.text)}
                  </div>

                  {/* Retrieved Wikipedia Sources */}
                  {m.sources?.length > 0 && (
                    <div className="sources-container">
                      <div className="sources-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        <span>Retrieved Wikipedia Chunks:</span>
                      </div>
                      <div className="sources-list">
                        {m.sources.map((url, sIdx) => {
                          const articleTitle =
                            url.split("/wiki/")[1]?.replaceAll("_", " ") ?? "Wikipedia Source";
                          return (
                            <a
                              key={sIdx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="source-chip"
                              title={`Open ${url}`}
                            >
                              <span className="wiki-w">W</span>
                              <span className="source-title">{articleTitle}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Dynamic Loading Shimmer */}
          {loading && (
            <div className="message-row bot loading-row">
              <div className="avatar">
                <span className="avatar-vk pulse">18</span>
              </div>
              <div className="bubble bot typing-bubble">
                {activeQuery && (
                  <div className="active-query-banner">
                    <span className="query-badge">
                      <span className="live-query-dot" />
                      SEARCHING QUERY:
                    </span>
                    <span className="query-title">"{activeQuery}"</span>
                  </div>
                )}
                <div className="typing-status-row">
                  <div className="radar-spinner">
                    <div className="radar-circle" />
                  </div>
                  <div className="typing-content">
                    <span className="typing-text">{loadingMessages[loadingStep]}</span>
                    <div className="typing-bars">
                      <span className="bar bar-1" />
                      <span className="bar bar-2" />
                      <span className="bar bar-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          <div ref={endRef} />
        </div>

        {/* Input Bar Form */}
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="input-container">
            <span className="bat-icon">🏏</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Virat Kohli's centuries, captaincy, records, debut..."
              maxLength={500}
              disabled={loading}
              autoFocus
            />

            {input.length > 0 && (
              <button
                type="button"
                className="clear-input-btn"
                onClick={() => setInput("")}
                title="Clear input"
              >
                ✕
              </button>
            )}

            <div className="input-meta">
              <span className="shortcut-badge">Enter ↵</span>
            </div>
          </div>

          <button
            type="submit"
            className="send-button"
            disabled={loading || !input.trim()}
            aria-label="Send query"
          >
            <span>Ask RAG</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      {/* RAG Visualizer & Architecture Modal */}
      {showInfoModal && (
        <div className="modal-backdrop" onClick={() => setShowInfoModal(false)}>
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="modal-badge-icon">⚡</span>
                <div>
                  <h3>RAG Pipeline Architecture Blueprint</h3>
                  <span className="modal-subtext">Virat Kohli AI Knowledge Engine • Ingestion &amp; Retrieval Flow</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowInfoModal(false)} title="Close">✕</button>
            </div>

            {/* Modal Tabs */}
            <div className="modal-nav-tabs">
              <button
                className={`modal-tab-btn ${modalTab === "diagram" ? "active" : ""}`}
                onClick={() => setModalTab("diagram")}
              >
                🖼️ Architecture Visual
              </button>
              <button
                className={`modal-tab-btn ${modalTab === "stages" ? "active" : ""}`}
                onClick={() => setModalTab("stages")}
              >
                🔄 Step-by-Step Flow
              </button>
              <button
                className={`modal-tab-btn ${modalTab === "guardrails" ? "active" : ""}`}
                onClick={() => setModalTab("guardrails")}
              >
                🛡️ Dual Guardrails
              </button>
            </div>

            <div className="modal-body modal-scrollable">
              {/* Tab 1: HD Architecture Visual */}
              {modalTab === "diagram" && (
                <div className="diagram-view">
                  <div className="diagram-frame">
                    <img
                      src="/rag-pipeline-diagram.jpg"
                      alt="AI Retrieval-Augmented Generation (RAG) Pipeline Architecture"
                      className="blueprint-img"
                    />
                    <div className="diagram-overlay-badge">
                      <span>✓ High-Resolution RAG Blueprint</span>
                    </div>
                  </div>

                  <div className="pipeline-highlights-grid">
                    <div className="highlight-box box-blue">
                      <span className="box-title">1. Knowledge Ingestion</span>
                      <p>6 Wikipedia articles extracted via Puppeteer, segmented with <code>RecursiveCharacterTextSplitter</code> (1,000 chars, 200 overlap).</p>
                    </div>
                    <div className="highlight-box box-cyan">
                      <span className="box-title">2. Vector Search</span>
                      <p>Encoded via <code>gemini-embedding-001</code>. High-dimensional vector index stored in DataStax Astra DB collection <code>kohli_bio</code>.</p>
                    </div>
                    <div className="highlight-box box-gold">
                      <span className="box-title">3. Grounded Synthesis</span>
                      <p>Cosine similarity guardrail (<code>≥ 0.8</code> threshold). Top 4 chunks synthesized by <code>gemini-3.8-flash</code> with zero hallucination.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Flowchart & Code Implementation */}
              {modalTab === "stages" && (
                <div className="stages-view">
                  <div className="workflow-phase">
                    <div className="phase-header">
                      <span className="phase-tag">PHASE 1</span>
                      <h4>Data Ingestion &amp; Vector Indexing (Offline)</h4>
                    </div>

                    <div className="flow-steps-chain">
                      <div className="flow-node">
                        <span className="node-icon">🌐</span>
                        <div className="node-content">
                          <strong>Wikipedia Extraction</strong>
                          <span>6 URLs (Kohli, RCB, Team India, 2011 CWC, Anushka Sharma, IPL) parsed via Puppeteer.</span>
                          <code>src/injest.js</code>
                        </div>
                      </div>

                      <div className="flow-arrow">↓</div>

                      <div className="flow-node">
                        <span className="node-icon">✂️</span>
                        <div className="node-content">
                          <strong>Recursive Character Chunking</strong>
                          <span>Chunk Size: 1,000 characters • Overlap: 200 characters • <code>chunks.json</code></span>
                          <code>RecursiveCharacterTextSplitter</code>
                        </div>
                      </div>

                      <div className="flow-arrow">↓</div>

                      <div className="flow-node">
                        <span className="node-icon">🧬</span>
                        <div className="node-content">
                          <strong>Document Vector Embeddings</strong>
                          <span>Google GenAI <code>gemini-embedding-001</code> with exponential retry backoff.</span>
                          <code>TaskType.RETRIEVAL_DOCUMENT</code>
                        </div>
                      </div>

                      <div className="flow-arrow">↓</div>

                      <div className="flow-node highlight-node">
                        <span className="node-icon">🗄️</span>
                        <div className="node-content">
                          <strong>DataStax Astra DB Vector Storage</strong>
                          <span>Saved to collection <code>kohli_bio</code> with schema: <code>&#123; text, source, $vector &#125;</code></span>
                          <code>src/store.js</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="workflow-phase">
                    <div className="phase-header">
                      <span className="phase-tag green-tag">PHASE 2</span>
                      <h4>Real-time RAG Query &amp; Synthesis (Online)</h4>
                    </div>

                    <div className="flow-steps-chain">
                      <div className="flow-node">
                        <span className="node-icon">💬</span>
                        <div className="node-content">
                          <strong>User Query Input</strong>
                          <span>Received via <code>POST /api/chat</code> on Express gateway.</span>
                          <code>client/src/App.jsx ➔ server.js</code>
                        </div>
                      </div>

                      <div className="flow-arrow">↓</div>

                      <div className="flow-node">
                        <span className="node-icon">🔍</span>
                        <div className="node-content">
                          <strong>Query Embedding</strong>
                          <span>Converted into query vector using <code>gemini-embedding-001</code>.</span>
                          <code>TaskType.RETRIEVAL_QUERY</code>
                        </div>
                      </div>

                      <div className="flow-arrow">↓</div>

                      <div className="flow-node">
                        <span className="node-icon">🎯</span>
                        <div className="node-content">
                          <strong>Vector Cosine Search</strong>
                          <span>Astra DB sorts by <code>$vector: queryVector</code> (Limit: 4, Similarity enabled).</span>
                          <code>collection.find().toArray()</code>
                        </div>
                      </div>

                      <div className="flow-arrow">↓</div>

                      <div className="flow-node highlight-node gold-node">
                        <span className="node-icon">🧠</span>
                        <div className="node-content">
                          <strong>Gemini 3.8 Flash Synthesis</strong>
                          <span>Grounding prompt strictly constrains model to retrieved Wikipedia chunks.</span>
                          <code>temperature: 0 • Strict Wikipedia Citations</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Dual Guardrails */}
              {modalTab === "guardrails" && (
                <div className="guardrails-view">
                  <div className="guardrail-card">
                    <div className="gr-badge">GUARDRAIL LAYER 1</div>
                    <h4>Pre-LLM Cosine Similarity Gate (Score &ge; 0.8)</h4>
                    <p>
                      Before invoking Gemini, the engine calculates the cosine similarity of the top retrieved vector chunk:
                    </p>
                    <div className="code-snippet-box">
                      <code>
                        {`if (results.length === 0 || results[0].$similarity < 0.8) {\n  return { answer: "I don't have that in my sources.", sources: [] };\n}`}
                      </code>
                    </div>
                    <span className="gr-benefit">✓ Prevents off-topic questions from reaching the LLM and completely eliminates out-of-domain hallucinations.</span>
                  </div>

                  <div className="guardrail-card">
                    <div className="gr-badge blue-badge">GUARDRAIL LAYER 2</div>
                    <h4>Context Grounding &amp; Citation Stripping</h4>
                    <p>
                      The system prompt directs Gemini to only speak from provided context:
                    </p>
                    <div className="code-snippet-box">
                      <code>
                        {`"You answer questions about Virat Kohli using ONLY the context provided...\nIf the context does not contain the answer, reply exactly: 'I don't have that in my sources.'"`}
                      </code>
                    </div>
                    <span className="gr-benefit">✓ If the model cannot confirm an answer, source citations are automatically stripped so users are never misled.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <a
                href="/rag-pipeline-diagram.jpg"
                target="_blank"
                rel="noreferrer"
                className="btn-download-img"
              >
                <span>Open Full-Res Visual ↗</span>
              </a>
              <button className="btn-done" onClick={() => setShowInfoModal(false)}>Close Blueprint</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer attribution */}
      <footer className="page-footer">
        <span>
          👑 King Kohli Knowledge Engine • Grounded in Wikipedia Vector Embeddings • Powered by Google Gemini &amp; Astra DB
        </span>
      </footer>
    </div>
  );
}