import React, { useState, useRef, useEffect } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";
import {
  Newspaper,
  MessageSquare,
  Users,
  UserRound,
  Send,
  ExternalLink,
  Bell,
  Crown,
  Flame,
  Gamepad2,
  Globe,
  Check,
  Radio,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------
// Design tokens (see design plan): deep slate/indigo base, emerald for
// confirmed, amber for rumor, rose for leak. Mono face for the "intel
// terminal" register, Inter for readable body copy.
// ---------------------------------------------------------------------
const T = {
  bg: "#0A0E1A",
  surface: "#12172A",
  surfaceAlt: "#1A2036",
  border: "#242C46",
  borderSoft: "#1D2338",
  indigo: "#6366F1",
  indigoDeep: "#4338CA",
  emerald: "#10B981",
  amber: "#F5A524",
  rose: "#FB4570",
  text: "#E7E9F0",
  textSoft: "#94A0C2",
  textMute: "#5B6483",
};

const COPY = {
  en: {
    tagline: "Intel before the trailer drops.",
    tabs: { feed: "News", chat: "AI Insider", crews: "Crews", profile: "Profile" },
    feedTitle: "Latest Intel",
    feedSub: "Cross-referenced across Twitter, Reddit & official sources.",
    trending: "Trending",
    statuses: { rumor: "Rumor", confirmed: "Confirmed", leak: "Leak" },
    source: "Source",
    chatTitle: "AI Insider",
    chatSub: "Ask anything. Answers are grounded in today's feed.",
    chatPlaceholder: "Ask about mechanics, dates, leaks...",
    suggestions: ["Any release date leaks?", "What's confirmed so far?", "Summarize today's intel"],
    crewsTitle: "Crews",
    crewsSub: "Find your platform's community.",
    all: "All",
    members: "members",
    join: "Join",
    profileTitle: "Profile & Plans",
    free: "Free Plan",
    premium: "Premium",
    premiumDesc: "Real-time push alerts, zero ads, priority AI answers.",
    upgrade: "Upgrade to Premium",
    upgraded: "You're Premium",
    price: "$9.90",
    perMonth: "/ month",
    notifications: "Notifications",
    notifPreorders: "Pre-order alerts",
    notifTrailers: "Trailer drops",
    notifLeaks: "Code leaks",
    live: "LIVE",
    loadingNews: "Loading intel...",
    errorNews: "Couldn't reach the feed. Pull down to try again.",
    emptyNews: "No intel yet — the ingestion pipeline hasn't published anything.",
    loadingCrews: "Loading crews...",
    errorCrews: "Couldn't load crews right now.",
    emptyCrews: "No crews for this platform yet.",
    back: "Back",
    openSource: "Open source",
    notFoundTitle: "Story not found",
    notFoundDesc: "This link may be broken or the story was removed.",
    backToFeed: "Back to feed",
    now: "now",
  },
  pt: {
    tagline: "Informação antes do trailer sair.",
    tabs: { feed: "Notícias", chat: "IA Insider", crews: "Crews", profile: "Perfil" },
    feedTitle: "Últimas Informações",
    feedSub: "Cruzado entre Twitter, Reddit e fontes oficiais.",
    trending: "Em alta",
    statuses: { rumor: "Rumor", confirmed: "Confirmado", leak: "Vazamento" },
    source: "Fonte",
    chatTitle: "IA Insider",
    chatSub: "Pergunte qualquer coisa. Respostas baseadas no feed de hoje.",
    chatPlaceholder: "Pergunte sobre mecânicas, datas, vazamentos...",
    suggestions: ["Tem vazamento de data?", "O que já foi confirmado?", "Resuma as notícias de hoje"],
    crewsTitle: "Crews",
    crewsSub: "Encontre a comunidade da sua plataforma.",
    all: "Todas",
    members: "membros",
    join: "Entrar",
    profileTitle: "Perfil & Planos",
    free: "Plano Grátis",
    premium: "Premium",
    premiumDesc: "Alertas em tempo real, zero anúncios, IA prioritária.",
    upgrade: "Assinar Premium",
    upgraded: "Você é Premium",
    price: "R$ 9,90",
    perMonth: "/ mês",
    notifications: "Notificações",
    notifPreorders: "Alertas de pré-venda",
    notifTrailers: "Trailers novos",
    notifLeaks: "Vazamentos de código",
    live: "AO VIVO",
    loadingNews: "Carregando informações...",
    errorNews: "Não foi possível carregar o feed. Tente novamente.",
    emptyNews: "Nenhuma notícia ainda — o pipeline de coleta não publicou nada.",
    loadingCrews: "Carregando crews...",
    errorCrews: "Não foi possível carregar as crews agora.",
    emptyCrews: "Nenhuma crew para essa plataforma ainda.",
    back: "Voltar",
    openSource: "Abrir fonte",
    notFoundTitle: "Notícia não encontrada",
    notFoundDesc: "Esse link pode estar quebrado ou a notícia foi removida.",
    backToFeed: "Voltar ao feed",
    now: "agora",
  },
};

// ---------------------------------------------------------------------
// Real data lives in Supabase (`news` and `crews` tables — see
// sixinsider_schema.sql). No more hardcoded arrays: everything below
// is fetched at runtime in <SixInsiderApp> and <NewsDetailPage>.
// ---------------------------------------------------------------------
function timeAgo(dateStr, t) {
  if (!dateStr) return "";
  const parsed = new Date(dateStr).getTime();
  if (Number.isNaN(parsed)) return "";
  const diffMs = Date.now() - parsed;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t.now;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function mapNewsRow(row, t) {
  return {
    id: row.id,
    slug: row.slug || row.id,
    status: row.status,
    title: row.title,
    summary: row.summary,
    content: row.content,
    source: row.source_platform === "official" ? "Rockstar Newswire" : row.source_url,
    sourceUrl: row.source_url,
    platform: row.source_platform,
    trending: row.is_trending,
    time: timeAgo(row.published_at, t),
    publishedAt: row.published_at,
  };
}

function mapCrewRow(row) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    members: row.member_count,
    desc: row.description,
    inviteUrl: row.invite_url,
  };
}

const STATUS_COLOR = { rumor: T.amber, confirmed: T.emerald, leak: T.rose };

function statusDot(status) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full mr-1.5"
      style={{ backgroundColor: STATUS_COLOR[status] }}
    />
  );
}

function Badge({ status, label }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
      style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}40`, fontFamily: "'JetBrains Mono', monospace" }}
    >
      {statusDot(status)}
      {label}
    </span>
  );
}

function TickerBar({ t, news }) {
  const items = news.filter((n) => n.trending).map((n) => n.title);
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div
      className="w-full overflow-hidden border-b flex items-center"
      style={{ backgroundColor: T.surface, borderColor: T.borderSoft, height: 34 }}
    >
      <div
        className="flex items-center gap-1.5 px-3 shrink-0 z-10"
        style={{ backgroundColor: T.surface, borderRight: `1px solid ${T.borderSoft}`, height: "100%" }}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: T.rose }}
          />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: T.rose }} />
        </span>
        <span
          className="text-[10px] font-bold tracking-widest"
          style={{ color: T.rose, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {t.live}
        </span>
      </div>
      <div className="ticker-track flex items-center whitespace-nowrap">
        {loop.map((title, i) => (
          <span
            key={i}
            className="mx-6 text-[11px]"
            style={{ color: T.textSoft, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {title}
          </span>
        ))}
      </div>
    </div>
  );
}

function NewsCard({ item, t, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.slug)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(item.slug)}
      className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer active:opacity-80 transition-opacity"
      style={{ backgroundColor: T.surface, border: `1px solid ${T.borderSoft}` }}
    >
      <div className="flex items-center justify-between">
        <Badge status={item.status} label={t.statuses[item.status]} />
        {item.trending && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: T.indigo, fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Flame size={11} /> {t.trending}
          </span>
        )}
      </div>
      <p className="text-[15px] leading-snug font-medium" style={{ color: T.text }}>
        {item.title}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs flex items-center gap-1" style={{ color: T.textMute }}>
          <ExternalLink size={12} /> {item.source}
        </span>
        <span className="text-xs" style={{ color: T.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
          {item.time}
        </span>
      </div>
    </div>
  );
}

function FeedTab({ t, news, loading, error, onOpen }) {
  return (
    <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
      <div className="mb-1">
        <h2 className="text-lg font-bold" style={{ color: T.text }}>
          {t.feedTitle}
        </h2>
        <p className="text-xs" style={{ color: T.textMute }}>
          {t.feedSub}
        </p>
      </div>

      {loading && <StateMessage icon={Loader2} spin text={t.loadingNews} />}
      {!loading && error && <StateMessage icon={AlertTriangle} text={t.errorNews} tone="rose" />}
      {!loading && !error && news.length === 0 && <StateMessage icon={Newspaper} text={t.emptyNews} />}

      {!loading &&
        !error &&
        news.map((n) => <NewsCard key={n.id} item={n} t={t} onOpen={onOpen} />)}
    </div>
  );
}

function StateMessage({ icon: Icon, text, spin, tone }) {
  const color = tone === "rose" ? T.rose : T.textMute;
  return (
    <div
      className="rounded-xl p-6 flex flex-col items-center gap-2 text-center"
      style={{ backgroundColor: T.surface, border: `1px solid ${T.borderSoft}` }}
    >
      <Icon size={20} color={color} className={spin ? "animate-spin" : ""} />
      <p className="text-xs" style={{ color: T.textSoft }}>
        {text}
      </p>
    </div>
  );
}

function ChatTab({ t }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: t.chatSub },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const reply = (q) => {
    const lower = q.toLowerCase();
    if (lower.includes("date") || lower.includes("data")) {
      return "No official release date is confirmed yet. Current chatter points to a Q4 window, flagged as Rumor status.";
    }
    if (lower.includes("confirm")) {
      return "Confirmed so far: new gameplay footage this quarter, and a teased soundtrack collaboration — both from official Rockstar channels.";
    }
    return "Based on today's feed: 2 trending items cross-referenced across Twitter and Reddit, both about map details and audio datamines. Nothing official yet on those.";
  };

  const send = (text) => {
    const q = text ?? input;
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: reply(q) }]);
      setTyping(false);
    }, 900);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold" style={{ color: T.text }}>
          {t.chatTitle}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && (
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold mr-2 shrink-0"
                style={{ backgroundColor: T.indigoDeep, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}
              >
                SI
              </div>
            )}
            <div
              className="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? { backgroundColor: T.indigo, color: "#fff", borderBottomRightRadius: 4 }
                  : { backgroundColor: T.surface, color: T.text, border: `1px solid ${T.borderSoft}`, borderBottomLeftRadius: 4 }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-center gap-1 ml-8">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: T.textMute, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {t.suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => send(s)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{ backgroundColor: T.surfaceAlt, color: T.textSoft, border: `1px solid ${T.borderSoft}` }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="px-4 pb-4 pt-1 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t.chatPlaceholder}
          className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
          style={{ backgroundColor: T.surface, color: T.text, border: `1px solid ${T.borderSoft}` }}
        />
        <button
          onClick={() => send()}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: T.indigo }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function CrewsTab({ t, crews, loading, error }) {
  const [filter, setFilter] = useState("all");
  const platforms = [
    { id: "all", label: t.all },
    { id: "ps5", label: "PS5" },
    { id: "xbox", label: "Xbox" },
    { id: "pc", label: "PC" },
  ];
  const filtered = filter === "all" ? crews : crews.filter((c) => c.platform === filter);

  return (
    <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
      <div className="mb-1">
        <h2 className="text-lg font-bold" style={{ color: T.text }}>
          {t.crewsTitle}
        </h2>
        <p className="text-xs" style={{ color: T.textMute }}>
          {t.crewsSub}
        </p>
      </div>
      <div className="flex gap-2 mb-1">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilter(p.id)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={
              filter === p.id
                ? { backgroundColor: T.indigo, color: "#fff" }
                : { backgroundColor: T.surface, color: T.textSoft, border: `1px solid ${T.borderSoft}` }
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      {loading && <StateMessage icon={Loader2} spin text={t.loadingCrews} />}
      {!loading && error && <StateMessage icon={AlertTriangle} text={t.errorCrews} tone="rose" />}
      {!loading && !error && filtered.length === 0 && <StateMessage icon={Users} text={t.emptyCrews} />}

      {!loading &&
        !error &&
        filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.borderSoft}` }}
          >
            <div
              className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: T.surfaceAlt }}
            >
              <Gamepad2 size={20} color={T.indigo} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: T.text }}>
                {c.name}
              </p>
              <p className="text-xs truncate" style={{ color: T.textMute }}>
                {c.desc}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: T.textSoft, fontFamily: "'JetBrains Mono', monospace" }}>
                {c.members.toLocaleString()} {t.members}
              </p>
            </div>
            <a
              href={c.inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
              style={{ backgroundColor: T.surfaceAlt, color: T.indigo, border: `1px solid ${T.indigo}50` }}
            >
              {t.join}
            </a>
          </div>
        ))}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-10 h-6 rounded-full relative transition-colors"
      style={{ backgroundColor: checked ? T.indigo : T.surfaceAlt, border: `1px solid ${T.borderSoft}` }}
    >
      <span
        className="absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all"
        style={{ left: checked ? 20 : 3, height: 18, width: 18 }}
      />
    </button>
  );
}

function ProfileTab({ t, lang, setLang }) {
  const [premium, setPremium] = useState(false);
  const [notifs, setNotifs] = useState({ preorders: true, trailers: true, leaks: true });

  return (
    <div className="px-4 pt-4 pb-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold" style={{ color: T.text }}>
        {t.profileTitle}
      </h2>

      <div className="flex items-center gap-3">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: T.surfaceAlt, border: `1px solid ${T.borderSoft}` }}
        >
          <UserRound size={26} color={T.textSoft} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: T.text }}>
            player_one
          </p>
          <p className="text-xs" style={{ color: T.textMute }}>
            player@sixinsider.gg
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${T.indigoDeep} 0%, ${T.surface} 100%)`,
          border: `1px solid ${T.indigo}50`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Crown size={16} color={T.amber} />
          <span className="text-sm font-bold" style={{ color: T.text }}>
            {premium ? t.upgraded : t.premium}
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: T.textSoft }}>
          {t.premiumDesc}
        </p>
        <div className="flex items-center justify-between">
          <span style={{ color: T.text, fontFamily: "'JetBrains Mono', monospace" }} className="text-lg font-bold">
            {t.price}
            <span className="text-xs font-normal" style={{ color: T.textMute }}>
              {t.perMonth}
            </span>
          </span>
          <button
            onClick={() => setPremium((p) => !p)}
            className="text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5"
            style={{ backgroundColor: premium ? T.emerald : T.indigo, color: "#fff" }}
          >
            {premium && <Check size={13} />}
            {premium ? t.upgraded : t.upgrade}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Bell size={13} color={T.textSoft} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textSoft }}>
            {t.notifications}
          </span>
        </div>
        <div className="rounded-xl divide-y" style={{ backgroundColor: T.surface, border: `1px solid ${T.borderSoft}`, borderColor: T.borderSoft }}>
          {[
            { key: "preorders", label: t.notifPreorders },
            { key: "trailers", label: t.notifTrailers },
            { key: "leaks", label: t.notifLeaks },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between px-4 py-3" style={{ borderColor: T.borderSoft }}>
              <span className="text-sm" style={{ color: T.text }}>
                {row.label}
              </span>
              <Toggle
                checked={notifs[row.key]}
                onChange={() => setNotifs((n) => ({ ...n, [row.key]: !n[row.key] }))}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setLang(lang === "en" ? "pt" : "en")}
        className="flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-full"
        style={{ backgroundColor: T.surface, color: T.textSoft, border: `1px solid ${T.borderSoft}` }}
      >
        <Globe size={14} />
        {lang === "en" ? "Switch to Português" : "Switch to English"}
      </button>
    </div>
  );
}

function NewsDetailPage({ lang }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const t = COPY[lang];
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | done | notfound | error

  useEffect(() => {
    let active = true;
    setStatus("loading");
    (async () => {
      let { data, error } = await supabase.from("news").select("*").eq("slug", slug).maybeSingle();
      if (!data && !error) {
        ({ data, error } = await supabase.from("news").select("*").eq("id", slug).maybeSingle());
      }
      if (!active) return;
      if (error) {
        setStatus("error");
        return;
      }
      if (!data) {
        setStatus("notfound");
        return;
      }
      setItem(mapNewsRow(data, t));
      setStatus("done");
      document.title = `${data.title} — SIX//INSIDER`;
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div
      className="w-full mx-auto flex flex-col"
      style={{ maxWidth: 480, minHeight: "100dvh", backgroundColor: T.bg, fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: `1px solid ${T.borderSoft}` }}
      >
        <button
          onClick={() => navigate("/")}
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.borderSoft}` }}
        >
          <ArrowLeft size={16} color={T.textSoft} />
        </button>
        <p
          className="text-sm font-extrabold tracking-tight"
          style={{ color: T.text, fontFamily: "'JetBrains Mono', monospace" }}
        >
          SIX<span style={{ color: T.indigo }}>//</span>INSIDER
        </p>
      </div>

      <div className="flex-1 px-4 py-5">
        {status === "loading" && <StateMessage icon={Loader2} spin text={t.loadingNews} />}
        {status === "error" && <StateMessage icon={AlertTriangle} text={t.errorNews} tone="rose" />}
        {status === "notfound" && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <AlertTriangle size={28} color={T.textMute} />
            <h2 className="text-base font-bold" style={{ color: T.text }}>
              {t.notFoundTitle}
            </h2>
            <p className="text-xs" style={{ color: T.textMute }}>
              {t.notFoundDesc}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 text-xs font-semibold px-4 py-2 rounded-full"
              style={{ backgroundColor: T.indigo, color: "#fff" }}
            >
              {t.backToFeed}
            </button>
          </div>
        )}
        {status === "done" && item && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Badge status={item.status} label={t.statuses[item.status]} />
              {item.trending && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: T.indigo, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Flame size={11} /> {t.trending}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold leading-snug" style={{ color: T.text }}>
              {item.title}
            </h1>
            <div className="flex items-center justify-between text-xs" style={{ color: T.textMute }}>
              <span>{item.source}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.time}</span>
            </div>
            {(item.content || item.summary) && (
              <p className="text-sm leading-relaxed" style={{ color: T.textSoft }}>
                {item.content || item.summary}
              </p>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-full mt-2"
                style={{ backgroundColor: T.surface, color: T.indigo, border: `1px solid ${T.indigo}50` }}
              >
                <ExternalLink size={14} />
                {t.openSource}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function detectInitialLang() {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("sixinsider_lang");
  if (saved === "en" || saved === "pt") return saved;
  const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
  return nav.startsWith("pt") ? "pt" : "en";
}

function MainShell({ lang, setLang }) {
  const [tab, setTab] = useState("feed");
  const t = COPY[lang];
  const navigate = useNavigate();

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  const [crews, setCrews] = useState([]);
  const [crewsLoading, setCrewsLoading] = useState(true);
  const [crewsError, setCrewsError] = useState(false);

  // Fetch news once on mount. Re-fetched whenever the tab regains focus
  // (visibilitychange) so the feed reflects new scraper output without
  // requiring a full page reload.
  useEffect(() => {
    let active = true;
    async function loadNews() {
      setNewsLoading(true);
      setNewsError(false);
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(50);
      if (!active) return;
      if (error) {
        setNewsError(true);
      } else {
        setNews((data || []).map((row) => mapNewsRow(row, t)));
      }
      setNewsLoading(false);
    }
    loadNews();
    const onVisible = () => document.visibilityState === "visible" && loadNews();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    let active = true;
    async function loadCrews() {
      setCrewsLoading(true);
      setCrewsError(false);
      const { data, error } = await supabase
        .from("crews")
        .select("*")
        .order("member_count", { ascending: false });
      if (!active) return;
      if (error) {
        setCrewsError(true);
      } else {
        setCrews((data || []).map(mapCrewRow));
      }
      setCrewsLoading(false);
    }
    loadCrews();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sixinsider_lang", lang);
  }, [lang]);

  const openNews = (slug) => navigate(`/news/${slug}`);

  const NAV = [
    { id: "feed", label: t.tabs.feed, icon: Newspaper },
    { id: "chat", label: t.tabs.chat, icon: MessageSquare },
    { id: "crews", label: t.tabs.crews, icon: Users },
    { id: "profile", label: t.tabs.profile, icon: UserRound },
  ];

  return (
    <div
      className="w-full mx-auto flex flex-col"
      style={{
        maxWidth: 480,
        height: "100dvh",
        backgroundColor: T.bg,
        fontFamily: "'Inter', sans-serif",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700;800&display=swap');
        .ticker-track { animation: ticker-scroll 28s linear infinite; }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
        }
        ::-webkit-scrollbar { width: 0px; height: 0px; }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
        style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.borderSoft}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded flex items-center justify-center"
            style={{ backgroundColor: T.indigo }}
          >
            <Radio size={14} color="#fff" />
          </div>
          <div>
            <p
              className="text-sm font-extrabold tracking-tight leading-none"
              style={{ color: T.text, fontFamily: "'JetBrains Mono', monospace" }}
            >
              SIX<span style={{ color: T.indigo }}>//</span>INSIDER
            </p>
            <p className="text-[10px] leading-none mt-1" style={{ color: T.textMute }}>
              {t.tagline}
            </p>
          </div>
        </div>
      </div>

      <TickerBar t={t} news={news} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "feed" && (
          <FeedTab t={t} news={news} loading={newsLoading} error={newsError} onOpen={openNews} />
        )}
        {tab === "chat" && <ChatTab t={t} />}
        {tab === "crews" && (
          <CrewsTab t={t} crews={crews} loading={crewsLoading} error={crewsError} />
        )}
        {tab === "profile" && <ProfileTab t={t} lang={lang} setLang={setLang} />}
      </div>

      {/* Bottom nav — normal flex flow (not absolute), so it never
          jumps when mobile browser chrome shows/hides and recalculates
          viewport height. Sits naturally at the bottom of the column. */}
      <div
        className="shrink-0 flex items-center justify-around py-2 px-2"
        style={{
          backgroundColor: T.surface,
          borderTop: `1px solid ${T.borderSoft}`,
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg"
            >
              <Icon size={19} color={active ? T.indigo : T.textMute} strokeWidth={active ? 2.4 : 2} />
              <span
                className="text-[10px] font-semibold"
                style={{ color: active ? T.indigo : T.textMute }}
              >
                {n.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SetupNeededScreen() {
  return (
    <div
      className="w-full mx-auto flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ maxWidth: 480, minHeight: "100dvh", backgroundColor: T.bg, fontFamily: "'Inter', sans-serif" }}
    >
      <AlertTriangle size={32} color={T.amber} />
      <h1 className="text-base font-bold" style={{ color: T.text }}>
        Configuração pendente
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: T.textSoft }}>
        As variáveis <code style={{ color: T.indigo }}>VITE_SUPABASE_URL</code> e{" "}
        <code style={{ color: T.indigo }}>VITE_SUPABASE_ANON_KEY</code> não foram encontradas.
      </p>
      <p className="text-xs leading-relaxed" style={{ color: T.textMute }}>
        Cadastre as duas na Vercel em Project Settings → Environment Variables e faça o redeploy.
      </p>
    </div>
  );
}

export default function SixInsiderApp() {
  const [lang, setLang] = useState(detectInitialLang);

  if (!isSupabaseConfigured) {
    return <SetupNeededScreen />;
  }

  return (
    <Routes>
      <Route path="/news/:slug" element={<NewsDetailPage lang={lang} />} />
      <Route path="*" element={<MainShell lang={lang} setLang={setLang} />} />
    </Routes>
  );
}
