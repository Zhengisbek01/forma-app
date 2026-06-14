import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  bg: "#050E0A",
  bg2: "#07110D",
  surface: "#0E1B15",
  card: "#12251D",
  card2: "#163226",
  line: "rgba(255,255,255,.10)",
  text: "#F8FAFC",
  muted: "#94A3B8",
  muted2: "#64748B",
  green: "#22C55E",
  greenDark: "#15803D",
  gold: "#F5C542",
  red: "#EF4444",
  blue: "#38BDF8",
  purple: "#A855F7",
  orange: "#FB923C",
};

const HABIT_CATS = [
  { id: "health", label: "Здоровье", icon: "❤️", color: COLORS.green },
  { id: "body", label: "Тело", icon: "💪", color: COLORS.green },
  { id: "mind", label: "Интеллект", icon: "🧠", color: COLORS.blue },
  { id: "discipline", label: "Дисциплина", icon: "🎯", color: COLORS.gold },
  { id: "work", label: "Карьера", icon: "💼", color: COLORS.purple },
  { id: "finance", label: "Финансы", icon: "💰", color: COLORS.gold },
  { id: "other", label: "Другое", icon: "✨", color: COLORS.muted },
];

const EXPENSE_CATS = [
  { id: "food", label: "Еда", icon: "🍔", color: COLORS.orange, keywords: ["еда", "кофе", "обед", "ужин", "завтрак", "кафе", "ресторан", "магазин", "продукты", "донер", "бургер"] },
  { id: "transport", label: "Транспорт", icon: "🚕", color: COLORS.blue, keywords: ["такси", "автобус", "транспорт", "бензин", "метро", "парковка", "дорога"] },
  { id: "health", label: "Здоровье", icon: "💊", color: COLORS.green, keywords: ["аптека", "лекарство", "врач", "анализ", "здоровье", "стоматолог", "клиника"] },
  { id: "home", label: "Дом", icon: "🏠", color: COLORS.gold, keywords: ["дом", "квартира", "аренда", "коммуналка", "ремонт", "мебель"] },
  { id: "education", label: "Учёба", icon: "📚", color: COLORS.purple, keywords: ["курс", "книга", "обучение", "учеба", "университет", "подписка"] },
  { id: "family", label: "Семья", icon: "👨‍👩‍👧", color: "#F472B6", keywords: ["семья", "жена", "ребенок", "дети", "подарок"] },
  { id: "fun", label: "Развлечения", icon: "🎮", color: COLORS.red, keywords: ["кино", "игра", "развлечения", "отдых", "бар", "театр"] },
  { id: "other", label: "Другое", icon: "📦", color: COLORS.muted, keywords: [] },
];

const INCOME_CATS = [
  { id: "salary", label: "Зарплата", icon: "💼", color: COLORS.green },
  { id: "freelance", label: "Фриланс", icon: "💻", color: COLORS.blue },
  { id: "business", label: "Бизнес", icon: "🏪", color: COLORS.gold },
  { id: "invest", label: "Инвестиции", icon: "📈", color: COLORS.purple },
  { id: "other", label: "Другое", icon: "✨", color: COLORS.muted },
];

const QUICK_EXPENSES = [
  { label: "Кофе", icon: "☕", amount: 1200, cat: "food" },
  { label: "Такси", icon: "🚕", amount: 2000, cat: "transport" },
  { label: "Обед", icon: "🍔", amount: 3500, cat: "food" },
  { label: "Магазин", icon: "🛒", amount: 8000, cat: "food" },
  { label: "Аптека", icon: "💊", amount: 5000, cat: "health" },
  { label: "Связь", icon: "📱", amount: 4000, cat: "other" },
];

const NAV = [
  { id: "home", label: "Главная", icon: "⌂" },
  { id: "habits", label: "Привычки", icon: "✓" },
  { id: "finance", label: "Финансы", icon: "₸" },
  { id: "progress", label: "Прогресс", icon: "▣" },
  { id: "profile", label: "Профиль", icon: "○" },
];

const fmt = (n) => new Intl.NumberFormat("ru-RU").format(Math.abs(Math.round(Number(n) || 0)));
const pad = (n) => String(n).padStart(2, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthKey = (date) => {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

function getStreak(habit) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (habit.checks?.[key]) streak += 1;
    else if (i > 0) break;
  }
  return streak;
}

function getLevel(xp) {
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const current = xp % 1000;
  return { level, current, need: 1000, pct: Math.min(current / 1000, 1) };
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/ё/g, "е");
}

function guessExpenseCategory(text) {
  const s = normalizeText(text);
  for (const cat of EXPENSE_CATS) {
    if (cat.keywords.some((k) => s.includes(normalizeText(k)))) return cat.id;
  }
  return "other";
}

function parseQuickExpense(input) {
  const cleaned = String(input || "").replace(/,/g, ".");
  const match = cleaned.match(/(\d+(?:[\s.,]\d{3})*(?:\.\d+)?|\d+)/);
  if (!match) return null;
  const amount = Number(match[0].replace(/\s/g, ""));
  if (!amount || amount <= 0) return null;
  const note = cleaned.replace(match[0], "").trim() || "Расход";
  return { amount, note, cat: guessExpenseCategory(cleaned) };
}

function minutesUntil(time) {
  const [h, m] = String(time || "20:00").split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(Number.isFinite(h) ? h : 20, Number.isFinite(m) ? m : 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

function AppStyles() {
  return (
    <style>{`
      :root { color-scheme: dark; --bg:${COLORS.bg}; --surface:${COLORS.surface}; --card:${COLORS.card}; --text:${COLORS.text}; --muted:${COLORS.muted}; --green:${COLORS.green}; --gold:${COLORS.gold}; }
      * { box-sizing: border-box; }
      body { margin:0; min-height:100vh; background:#050E0A; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--text); }
      button, input, select, textarea { font: inherit; }
      button { -webkit-tap-highlight-color: transparent; }
      .app { min-height:100vh; background: radial-gradient(circle at 82% -8%, rgba(34,197,94,.22), transparent 35%), radial-gradient(circle at -10% 56%, rgba(245,197,66,.12), transparent 30%), linear-gradient(180deg,#07110D 0%,#050E0A 100%); display:flex; justify-content:center; }
      .shell { width:100%; max-width:520px; min-height:100vh; position:relative; padding:20px 16px 112px; overflow:hidden; }
      .shell:before { content:""; position:fixed; inset:0; pointer-events:none; opacity:.24; background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px); background-size:46px 46px; mask-image:linear-gradient(to bottom,#000,transparent 82%); }
      .header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:12px 0 18px; position:relative; z-index:1; }
      .eyebrow { font-size:12px; line-height:1; letter-spacing:.13em; text-transform:uppercase; color:var(--muted); font-weight:800; }
      .title { font-size:34px; line-height:1.05; margin:8px 0 4px; font-weight:900; letter-spacing:-.04em; }
      .subtitle { color:var(--muted); font-size:14px; line-height:1.45; }
      .level-pill { min-width:76px; height:48px; border-radius:24px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(245,197,66,.46); background:linear-gradient(135deg,rgba(245,197,66,.20),rgba(34,197,94,.08)); color:var(--gold); font-weight:900; box-shadow:0 0 26px rgba(245,197,66,.10); }
      .card { background:linear-gradient(145deg,rgba(18,37,29,.96),rgba(12,26,20,.92)); border:1px solid rgba(255,255,255,.10); border-radius:28px; box-shadow:0 18px 60px rgba(0,0,0,.24); position:relative; z-index:1; }
      .hero { padding:22px; border-color:rgba(34,197,94,.25); overflow:hidden; }
      .hero:after { content:""; position:absolute; right:-52px; top:-44px; width:190px; height:190px; border-radius:50%; background:radial-gradient(circle,rgba(34,197,94,.28),transparent 65%); }
      .row { display:flex; align-items:center; gap:10px; }
      .between { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
      .metric { padding:14px; border-radius:22px; background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.08); }
      .metric strong { display:block; font-size:23px; line-height:1; margin-bottom:5px; }
      .metric span { color:var(--muted); font-size:12px; }
      .section-title { font-size:22px; font-weight:900; letter-spacing:-.03em; margin:24px 2px 12px; position:relative; z-index:1; }
      .progress { height:14px; border-radius:999px; background:rgba(255,255,255,.10); overflow:hidden; }
      .progress > i { display:block; height:100%; border-radius:999px; background:linear-gradient(90deg,var(--green),var(--gold)); box-shadow:0 0 18px rgba(34,197,94,.4); }
      .btn { border:0; border-radius:18px; padding:13px 16px; cursor:pointer; color:#04100A; font-weight:900; background:linear-gradient(135deg,var(--green),#86EFAC); box-shadow:0 12px 28px rgba(34,197,94,.20); transition:transform .15s ease, opacity .15s ease; }
      .btn:active { transform:scale(.98); }
      .btn.secondary { color:var(--text); background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); box-shadow:none; }
      .btn.gold { background:linear-gradient(135deg,var(--gold),#FDE68A); color:#130F03; }
      .btn.red { background:linear-gradient(135deg,#EF4444,#FB7185); color:#fff; }
      .btn:disabled { opacity:.45; cursor:not-allowed; transform:none; }
      .input, .select, .textarea { width:100%; border:1px solid rgba(255,255,255,.12); background:rgba(2,8,6,.72); color:var(--text); border-radius:18px; padding:14px 15px; outline:none; }
      .input:focus, .select:focus, .textarea:focus { border-color:rgba(34,197,94,.62); box-shadow:0 0 0 4px rgba(34,197,94,.10); }
      .label { color:var(--muted); font-size:12px; font-weight:800; letter-spacing:.10em; text-transform:uppercase; margin:12px 0 8px; }
      .chip { border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.05); color:var(--muted); border-radius:999px; padding:9px 12px; cursor:pointer; font-size:13px; font-weight:800; white-space:nowrap; }
      .chip.active { color:#04100A; background:var(--gold); border-color:rgba(245,197,66,.80); }
      .habit-card, .txn-card, .skill-card { padding:14px; border-radius:24px; background:rgba(18,37,29,.86); border:1px solid rgba(255,255,255,.09); position:relative; z-index:1; }
      .iconbox { width:48px; height:48px; border-radius:16px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); font-size:22px; flex:0 0 auto; }
      .nav { position:fixed; z-index:40; bottom:14px; left:50%; transform:translateX(-50%); width:calc(100% - 28px); max-width:500px; display:grid; grid-template-columns:repeat(5,1fr); gap:3px; padding:9px; border-radius:34px; background:rgba(7,17,13,.88); border:1px solid rgba(255,255,255,.12); backdrop-filter:blur(18px); box-shadow:0 18px 60px rgba(0,0,0,.45); }
      .nav button { border:0; background:transparent; border-radius:24px; padding:8px 4px; color:#64748B; display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; font-size:10px; font-weight:800; }
      .nav button b { font-size:18px; line-height:1; }
      .nav button.active { color:var(--gold); background:rgba(245,197,66,.12); }
      .toast-wrap { position:fixed; top:18px; right:18px; left:18px; z-index:100; display:flex; flex-direction:column; gap:10px; align-items:flex-end; pointer-events:none; }
      .toast { max-width:360px; width:auto; padding:12px 14px; border-radius:20px; background:rgba(7,17,13,.94); border:1px solid rgba(34,197,94,.25); box-shadow:0 20px 60px rgba(0,0,0,.38); display:flex; gap:10px; align-items:center; animation:pop .2s ease; }
      @keyframes pop { from { transform:translateY(-8px); opacity:0; } to { transform:translateY(0); opacity:1; } }
      .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:90; display:flex; align-items:center; justify-content:center; padding:18px; backdrop-filter:blur(12px); }
      .modal { width:100%; max-width:440px; padding:24px; border-radius:32px; background:radial-gradient(circle at 80% 0%,rgba(34,197,94,.25),transparent 34%),linear-gradient(145deg,#12251D,#07110D); border:1px solid rgba(255,255,255,.12); box-shadow:0 24px 90px rgba(0,0,0,.62); }
      .quick-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .quick-btn { text-align:left; padding:14px; border-radius:22px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.045); color:var(--text); cursor:pointer; }
      .quick-btn strong { display:block; font-size:15px; margin-bottom:4px; }
      .quick-btn span { color:var(--gold); font-size:13px; font-weight:900; }
      .empty { padding:24px; border:1px dashed rgba(255,255,255,.16); border-radius:24px; color:var(--muted); text-align:center; }
      .chart-card { padding:16px; height:270px; }
      @media (max-width:420px){ .shell{padding-left:12px;padding-right:12px}.title{font-size:30px}.grid3{grid-template-columns:1fr}.quick-grid{grid-template-columns:1fr 1fr}.metric strong{font-size:20px}.nav{width:calc(100% - 16px)} }
    `}</style>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <div style={{ fontSize: 24 }}>{t.icon}</div>
          <div>
            <div style={{ fontWeight: 900 }}>{t.title}</div>
            {t.body ? <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{t.body}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function AppHeader({ title, subtitle, level }) {
  return (
    <div className="header">
      <div>
        <div className="eyebrow">Forma System</div>
        <h1 className="title">{title}</h1>
        {subtitle ? <div className="subtitle">{subtitle}</div> : null}
      </div>
      <div className="level-pill">LV.{level}</div>
    </div>
  );
}

function CatIcon({ catId, type = "expense" }) {
  const list = type === "habit" ? HABIT_CATS : type === "income" ? INCOME_CATS : EXPENSE_CATS;
  const cat = list.find((c) => c.id === catId) || list[0];
  return <span>{cat?.icon}</span>;
}

function Onboarding({ onSave }) {
  const [name, setName] = useState("");
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="eyebrow" style={{ color: COLORS.gold }}>Первый вход</div>
        <h2 style={{ fontSize: 32, lineHeight: 1.05, margin: "10px 0 10px", letterSpacing: "-.04em" }}>Как к тебе обращаться?</h2>
        <p style={{ color: COLORS.muted, lineHeight: 1.55, marginTop: 0 }}>Forma будет приветствовать тебя по имени, показывать персональный прогресс и напоминать о привычках.</p>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())} placeholder="Например: Жеңісбек" />
        <button className="btn gold" style={{ width: "100%", marginTop: 14 }} onClick={() => name.trim() && onSave(name.trim())} disabled={!name.trim()}>Начать прокачку</button>
      </div>
    </div>
  );
}

export default function Forma() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [toasts, setToasts] = useState([]);
  const [userName, setUserName] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [habits, setHabits] = useState([]);
  const [habitForm, setHabitForm] = useState({ name: "", category: "health", emoji: "⚡", time: "20:00", reminder: true });
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [habitFilter, setHabitFilter] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);

  const [txns, setTxns] = useState([]);
  const [budget, setBudget] = useState(0);
  const [financeMode, setFinanceMode] = useState("overview");
  const [quickExpense, setQuickExpense] = useState("");
  const [advanced, setAdvanced] = useState({ type: "expense", amount: "", cat: "food", note: "", date: todayKey() });

  const [notifPermission, setNotifPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const timerRef = useRef({});

  useEffect(() => {
    setUserName(readLS("forma-user-name", ""));
    setHabits(readLS("forma-habits", [
      { id: uid(), name: "Выпить воду", emoji: "💧", category: "health", time: "09:00", reminder: true, checks: { [todayKey()]: false } },
      { id: uid(), name: "Тренировка", emoji: "💪", category: "body", time: "19:00", reminder: false, checks: {} },
    ]));
    setTxns(readLS("forma-txns", []));
    setBudget(readLS("forma-budget", 250000));
    const name = readLS("forma-user-name", "");
    if (!name) setShowOnboarding(true);
    setLoaded(true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => { if (loaded) writeLS("forma-habits", habits); }, [habits, loaded]);
  useEffect(() => { if (loaded) writeLS("forma-txns", txns); }, [txns, loaded]);
  useEffect(() => { if (loaded) writeLS("forma-budget", budget); }, [budget, loaded]);

  function toast(icon, title, body) {
    const id = uid();
    setToasts((p) => [...p, { id, icon, title, body }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }

  async function showNotification(title, body, tag = "forma") {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
    const options = { body, tag, renotify: true, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: "/" } };
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
      return true;
    } catch {
      try { new Notification(title, options); return true; } catch { return false; }
    }
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      toast("⚠️", "Уведомления не поддерживаются", "Попробуй Chrome, Edge, Safari или установить PWA.");
      return "unsupported";
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === "granted") {
      toast("🔔", "Уведомления включены", "Теперь Forma сможет напоминать о привычках.");
      showNotification("Forma", "Тестовое уведомление работает ✅", "forma-test");
    } else {
      toast("🔕", "Уведомления не включены", "Разрешение можно включить в настройках браузера.");
    }
    return permission;
  }

  useEffect(() => {
    Object.values(timerRef.current).forEach(clearTimeout);
    timerRef.current = {};
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    habits.forEach((habit) => {
      if (!habit.reminder || !habit.time) return;
      const schedule = () => {
        const ms = minutesUntil(habit.time);
        timerRef.current[habit.id] = setTimeout(async () => {
          const today = todayKey();
          const latest = readLS("forma-habits", habits);
          const current = latest.find((h) => h.id === habit.id) || habit;
          if (!current.checks?.[today]) {
            await showNotification(`Пора: ${current.name}`, `${current.emoji || "✅"} Отметь привычку и получи XP.`, `habit-${current.id}`);
          }
          schedule();
        }, ms);
      };
      schedule();
    });
    return () => Object.values(timerRef.current).forEach(clearTimeout);
  }, [habits, notifPermission]);

  const xp = useMemo(() => {
    const habitXp = habits.reduce((s, h) => s + Object.values(h.checks || {}).filter(Boolean).length * 40, 0);
    const financeXp = txns.length * 15;
    return habitXp + financeXp;
  }, [habits, txns]);
  const lvl = getLevel(xp);
  const today = todayKey();
  const weekDates = getWeekDates(weekOffset);
  const doneToday = habits.filter((h) => h.checks?.[today]).length;
  const filteredHabits = habitFilter === "all" ? habits : habits.filter((h) => h.category === habitFilter);

  const currentMonth = monthKey(today);
  const monthTxns = txns.filter((t) => monthKey(t.date) === currentMonth);
  const monthExpense = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthIncome = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const balance = txns.reduce((s, t) => (t.type === "income" ? s + t.amount : s - t.amount), 0);
  const budgetPct = budget > 0 ? Math.min(monthExpense / budget, 1) : 0;
  const expensePie = EXPENSE_CATS.map((c) => ({ name: c.label, value: monthTxns.filter((t) => t.type === "expense" && t.cat === c.id).reduce((s, t) => s + t.amount, 0), color: c.color })).filter((i) => i.value > 0);
  const weeklyBars = getWeekDates(0).map((d) => ({
    day: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][getWeekDates(0).indexOf(d)],
    Расходы: txns.filter((t) => t.date === d && t.type === "expense").reduce((s, t) => s + t.amount, 0),
    Доходы: txns.filter((t) => t.date === d && t.type === "income").reduce((s, t) => s + t.amount, 0),
  }));

  function saveName(name) {
    setUserName(name);
    writeLS("forma-user-name", name);
    setShowOnboarding(false);
    toast("🛡️", `Добро пожаловать, ${name}!`, "Твоя система прокачки активирована.");
  }

  function addHabit() {
    if (!habitForm.name.trim()) return;
    const h = { id: uid(), name: habitForm.name.trim(), emoji: habitForm.emoji, category: habitForm.category, time: habitForm.time, reminder: habitForm.reminder, checks: {} };
    setHabits((p) => [h, ...p]);
    setHabitForm({ name: "", category: "health", emoji: "⚡", time: "20:00", reminder: true });
    setShowHabitForm(false);
    toast(h.emoji, "Привычка добавлена", h.reminder ? `Напоминание: ${h.time}` : "Без напоминания");
    if (h.reminder && notifPermission !== "granted") requestNotifications();
  }

  function toggleHabit(id, date = today) {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const was = !!h.checks?.[date];
      const next = { ...h, checks: { ...(h.checks || {}), [date]: !was } };
      if (!was && date === today) {
        const streak = getStreak(next);
        toast("✅", h.name, `+40 XP${streak > 1 ? ` · серия ${streak} дн.` : ""}`);
      }
      return next;
    }));
  }

  function deleteHabit(id) {
    setHabits((p) => p.filter((h) => h.id !== id));
  }

  function updateHabit(id, patch) {
    setHabits((p) => p.map((h) => h.id === id ? { ...h, ...patch } : h));
  }

  function saveTxn(txn) {
    const catList = txn.type === "income" ? INCOME_CATS : EXPENSE_CATS;
    const cat = catList.find((c) => c.id === txn.cat) || catList[0];
    setTxns((p) => [{ id: uid(), date: todayKey(), ...txn }, ...p]);
    toast(cat.icon, `${txn.type === "income" ? "+" : "−"} ${fmt(txn.amount)} ₸`, `${cat.label} · +15 XP`);
  }

  function submitQuickExpense() {
    const parsed = parseQuickExpense(quickExpense);
    if (!parsed) {
      toast("⚠️", "Напиши сумму", "Например: кофе 1200 или такси 2000");
      return;
    }
    saveTxn({ type: "expense", amount: parsed.amount, cat: parsed.cat, note: parsed.note, date: todayKey() });
    setQuickExpense("");
  }

  function submitAdvanced() {
    const amount = Number(String(advanced.amount).replace(",", "."));
    if (!amount || amount <= 0) return;
    saveTxn({ type: advanced.type, amount, cat: advanced.cat, note: advanced.note.trim() || (advanced.type === "income" ? "Доход" : "Расход"), date: advanced.date || todayKey() });
    setAdvanced({ type: "expense", amount: "", cat: "food", note: "", date: todayKey() });
    setFinanceMode("overview");
  }

  function removeTxn(id) {
    setTxns((p) => p.filter((t) => t.id !== id));
  }

  function renderHome() {
    return (
      <>
        <AppHeader title={`Сәлем, ${userName || "герой"}`} subtitle="Твоя система личной прокачки" level={lvl.level} />
        <div className="card hero">
          <div className="between" style={{ position: "relative", zIndex: 1 }}>
            <div>
              <div className="eyebrow" style={{ color: COLORS.gold }}>Level Up</div>
              <div style={{ fontSize: 38, lineHeight: 1.05, fontWeight: 950, letterSpacing: "-.05em", marginTop: 8 }}>Твоя форма начинается сегодня</div>
              <p style={{ color: COLORS.muted, lineHeight: 1.5, marginBottom: 0 }}>Выполняй миссии, отмечай привычки, контролируй финансы и получай XP.</p>
            </div>
            <div style={{ width: 94, height: 120, borderRadius: 30, background: "rgba(5,14,10,.72)", border: "1px solid rgba(245,197,66,.36)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 0 36px rgba(245,197,66,.12)", flex: "0 0 auto" }}>
              <strong style={{ fontSize: 46, color: COLORS.gold }}>{lvl.level}</strong>
              <span style={{ color: COLORS.muted, fontWeight: 900, fontSize: 12 }}>LEVEL</span>
            </div>
          </div>
          <div style={{ marginTop: 20, position: "relative", zIndex: 1 }}>
            <div className="between" style={{ marginBottom: 8 }}><span style={{ color: COLORS.muted, fontSize: 13 }}>XP прогресс</span><b>{fmt(lvl.current)} / {fmt(lvl.need)} XP</b></div>
            <div className="progress"><i style={{ width: `${lvl.pct * 100}%` }} /></div>
          </div>
        </div>

        <div className="grid3" style={{ marginTop: 12 }}>
          <div className="metric"><strong>{doneToday}/{habits.length}</strong><span>привычки сегодня</span></div>
          <div className="metric"><strong>{fmt(monthExpense)} ₸</strong><span>расходы месяца</span></div>
          <div className="metric"><strong>{fmt(xp)}</strong><span>общий XP</span></div>
        </div>

        <div className="section-title">Сегодняшние миссии</div>
        <div style={{ display: "grid", gap: 10 }}>
          {habits.slice(0, 4).map((h) => {
            const done = !!h.checks?.[today];
            return (
              <div className="habit-card between" key={h.id}>
                <div className="row" style={{ minWidth: 0 }}>
                  <div className="iconbox" style={{ borderColor: `${HABIT_CATS.find((c) => c.id === h.category)?.color || COLORS.green}55` }}>{h.emoji}</div>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</b>
                    <span style={{ color: COLORS.muted, fontSize: 12 }}>🔔 {h.reminder ? h.time : "без времени"} · серия {getStreak(h)} дн.</span>
                  </div>
                </div>
                <button className={done ? "btn gold" : "btn secondary"} onClick={() => toggleHabit(h.id)} style={{ padding: "10px 13px" }}>{done ? "✓" : "+40 XP"}</button>
              </div>
            );
          })}
          {habits.length === 0 ? <div className="empty">Добавь первую привычку и начни прокачку.</div> : null}
        </div>

        <div className="section-title">Быстрый расход</div>
        <QuickExpenseBox quickExpense={quickExpense} setQuickExpense={setQuickExpense} submitQuickExpense={submitQuickExpense} saveTxn={saveTxn} />
      </>
    );
  }

  function renderHabits() {
    return (
      <>
        <AppHeader title="Привычки" subtitle="Укажи время и получай напоминания" level={lvl.level} />
        <div className="card" style={{ padding: 16 }}>
          <div className="between">
            <div>
              <div className="eyebrow" style={{ color: COLORS.green }}>Сегодня</div>
              <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: "-.04em", marginTop: 4 }}>{doneToday}/{habits.length}</div>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>выполнено привычек</div>
            </div>
            <button className="btn gold" onClick={() => setShowHabitForm((v) => !v)}>{showHabitForm ? "Закрыть" : "+ Добавить"}</button>
          </div>
          <div style={{ marginTop: 14 }} className="progress"><i style={{ width: `${habits.length ? (doneToday / habits.length) * 100 : 0}%` }} /></div>
          <div className="between" style={{ marginTop: 14, color: COLORS.muted, fontSize: 13 }}>
            <span>Статус уведомлений: <b style={{ color: notifPermission === "granted" ? COLORS.green : COLORS.gold }}>{notifPermission === "granted" ? "разрешены" : "нужно включить"}</b></span>
            <button className="chip active" onClick={requestNotifications}>🔔 Включить</button>
          </div>
        </div>

        {showHabitForm ? (
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Новая привычка</div>
            <input className="input" placeholder="Например: Тренировка" value={habitForm.name} onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })} />
            <div className="grid2">
              <div><div className="label">Эмодзи</div><input className="input" value={habitForm.emoji} onChange={(e) => setHabitForm({ ...habitForm, emoji: e.target.value.slice(0, 3) })} /></div>
              <div><div className="label">Время</div><input className="input" type="time" value={habitForm.time} onChange={(e) => setHabitForm({ ...habitForm, time: e.target.value })} /></div>
            </div>
            <div className="label">Категория</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {HABIT_CATS.map((c) => <button key={c.id} className={`chip ${habitForm.category === c.id ? "active" : ""}`} onClick={() => setHabitForm({ ...habitForm, category: c.id, emoji: habitForm.emoji || c.icon })}>{c.icon} {c.label}</button>)}
            </div>
            <label className="row" style={{ marginTop: 14, color: COLORS.muted }}>
              <input type="checkbox" checked={habitForm.reminder} onChange={(e) => setHabitForm({ ...habitForm, reminder: e.target.checked })} />
              Напоминать в указанное время
            </label>
            <button className="btn" style={{ width: "100%", marginTop: 14 }} onClick={addHabit} disabled={!habitForm.name.trim()}>Сохранить привычку</button>
          </div>
        ) : null}

        <div style={{ overflowX: "auto", display: "flex", gap: 8, padding: "18px 0 4px", position: "relative", zIndex: 1 }}>
          <button className={`chip ${habitFilter === "all" ? "active" : ""}`} onClick={() => setHabitFilter("all")}>✦ Все</button>
          {HABIT_CATS.map((c) => <button key={c.id} className={`chip ${habitFilter === c.id ? "active" : ""}`} onClick={() => setHabitFilter(c.id)}>{c.icon} {c.label}</button>)}
        </div>

        <div className="between" style={{ margin: "14px 2px 10px", position: "relative", zIndex: 1 }}>
          <button className="btn secondary" onClick={() => setWeekOffset((v) => v - 1)}>← Неделя</button>
          <button className="btn secondary" onClick={() => setWeekOffset(0)}>Сегодня</button>
          <button className="btn secondary" onClick={() => setWeekOffset((v) => v + 1)}>Неделя →</button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filteredHabits.map((h) => {
            const cat = HABIT_CATS.find((c) => c.id === h.category) || HABIT_CATS[0];
            return (
              <div className="habit-card" key={h.id} style={{ borderColor: `${cat.color}33` }}>
                <div className="between" style={{ marginBottom: 12 }}>
                  <div className="row" style={{ minWidth: 0 }}>
                    <div className="iconbox" style={{ borderColor: `${cat.color}55`, boxShadow: `0 0 24px ${cat.color}11` }}>{h.emoji}</div>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ display: "block", fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</b>
                      <span style={{ color: COLORS.muted, fontSize: 12 }}>{cat.label} · серия {getStreak(h)} дн.</span>
                    </div>
                  </div>
                  <button onClick={() => deleteHabit(h.id)} className="chip">×</button>
                </div>
                <div className="grid2" style={{ marginBottom: 12 }}>
                  <label><div className="label" style={{ marginTop: 0 }}>Время</div><input className="input" type="time" value={h.time || "20:00"} onChange={(e) => updateHabit(h.id, { time: e.target.value })} /></label>
                  <label><div className="label" style={{ marginTop: 0 }}>Уведомление</div><button className={`btn ${h.reminder ? "gold" : "secondary"}`} style={{ width: "100%" }} onClick={() => { updateHabit(h.id, { reminder: !h.reminder }); if (!h.reminder && notifPermission !== "granted") requestNotifications(); }}>{h.reminder ? "🔔 Вкл" : "🔕 Выкл"}</button></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 7 }}>
                  {weekDates.map((d, i) => {
                    const done = !!h.checks?.[d];
                    const isToday = d === today;
                    return (
                      <button key={d} onClick={() => toggleHabit(h.id, d)} style={{ aspectRatio: "1", border: `1px solid ${done ? cat.color : isToday ? COLORS.gold : "rgba(255,255,255,.12)"}`, color: done ? "#04100A" : isToday ? COLORS.gold : COLORS.muted, background: done ? cat.color : "rgba(255,255,255,.04)", borderRadius: 14, cursor: "pointer", fontWeight: 900 }}>
                        <span style={{ display: "block", fontSize: 11 }}>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</span>{done ? "✓" : new Date(`${d}T12:00:00`).getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredHabits.length === 0 ? <div className="empty">Нет привычек в этой категории.</div> : null}
        </div>
      </>
    );
  }

  function renderFinance() {
    return (
      <>
        <AppHeader title="Финансы" subtitle="Учёт денег без лишних действий" level={lvl.level} />
        <div className="card hero">
          <div className="between" style={{ position: "relative", zIndex: 1 }}>
            <div>
              <div className="eyebrow" style={{ color: COLORS.gold }}>Финансовый баланс</div>
              <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: "-.05em", marginTop: 8 }}>{balance < 0 ? "−" : ""}{fmt(balance)} ₸</div>
              <p style={{ margin: "6px 0 0", color: COLORS.muted }}>Расходы месяца: <b style={{ color: COLORS.red }}>−{fmt(monthExpense)} ₸</b></p>
            </div>
            <div style={{ textAlign: "center" }}><div style={{ color: COLORS.gold, fontSize: 30, fontWeight: 950 }}>{Math.round(budgetPct * 100)}%</div><div style={{ color: COLORS.muted, fontSize: 12 }}>бюджет</div></div>
          </div>
          <div style={{ marginTop: 16, position: "relative", zIndex: 1 }}><div className="progress"><i style={{ width: `${budgetPct * 100}%` }} /></div></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, overflowX: "auto", position: "relative", zIndex: 1 }}>
          {[{ id: "overview", label: "Обзор" }, { id: "add", label: "+ Добавить" }, { id: "history", label: "История" }, { id: "budget", label: "Бюджет" }].map((m) => <button key={m.id} className={`chip ${financeMode === m.id ? "active" : ""}`} onClick={() => setFinanceMode(m.id)}>{m.label}</button>)}
        </div>

        {(financeMode === "overview" || financeMode === "add") ? <QuickExpenseBox quickExpense={quickExpense} setQuickExpense={setQuickExpense} submitQuickExpense={submitQuickExpense} saveTxn={saveTxn} /> : null}

        {financeMode === "overview" ? (
          <>
            <div className="grid2" style={{ marginTop: 14 }}>
              <div className="metric"><strong style={{ color: COLORS.green }}>+{fmt(monthIncome)} ₸</strong><span>доходы месяца</span></div>
              <div className="metric"><strong style={{ color: COLORS.red }}>−{fmt(monthExpense)} ₸</strong><span>расходы месяца</span></div>
            </div>
            <div className="section-title">Категории расходов</div>
            <div className="card chart-card">
              {expensePie.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={expensePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88}>{expensePie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(v) => `${fmt(v)} ₸`} contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, color: COLORS.text }} /></PieChart>
                </ResponsiveContainer>
              ) : <div className="empty">Пока нет расходов за месяц.</div>}
            </div>
          </>
        ) : null}

        {financeMode === "add" ? (
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Расширенный ввод</div>
            <div className="grid2">
              <button className={`btn ${advanced.type === "expense" ? "red" : "secondary"}`} onClick={() => setAdvanced({ ...advanced, type: "expense", cat: "food" })}>− Расход</button>
              <button className={`btn ${advanced.type === "income" ? "gold" : "secondary"}`} onClick={() => setAdvanced({ ...advanced, type: "income", cat: "salary" })}>+ Доход</button>
            </div>
            <div className="label">Сумма</div><input className="input" type="number" placeholder="0" value={advanced.amount} onChange={(e) => setAdvanced({ ...advanced, amount: e.target.value })} />
            <div className="label">Категория</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(advanced.type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => <button key={c.id} className={`chip ${advanced.cat === c.id ? "active" : ""}`} onClick={() => setAdvanced({ ...advanced, cat: c.id })}>{c.icon} {c.label}</button>)}</div>
            <div className="label">Заметка</div><input className="input" placeholder="Например: обед с коллегами" value={advanced.note} onChange={(e) => setAdvanced({ ...advanced, note: e.target.value })} />
            <div className="label">Дата</div><input className="input" type="date" value={advanced.date} onChange={(e) => setAdvanced({ ...advanced, date: e.target.value })} />
            <button className="btn" style={{ width: "100%", marginTop: 14 }} disabled={!advanced.amount} onClick={submitAdvanced}>Сохранить</button>
          </div>
        ) : null}

        {(financeMode === "history" || financeMode === "overview") ? (
          <>
            <div className="section-title">Последние операции</div>
            <div style={{ display: "grid", gap: 10 }}>
              {txns.slice(0, financeMode === "history" ? 100 : 5).map((t) => {
                const cats = t.type === "income" ? INCOME_CATS : EXPENSE_CATS;
                const cat = cats.find((c) => c.id === t.cat) || cats[0];
                return (
                  <div className="txn-card between" key={t.id}>
                    <div className="row" style={{ minWidth: 0 }}>
                      <div className="iconbox" style={{ borderColor: `${cat.color}55` }}>{cat.icon}</div>
                      <div style={{ minWidth: 0 }}><b>{t.note || cat.label}</b><div style={{ color: COLORS.muted, fontSize: 12 }}>{cat.label} · {t.date}</div></div>
                    </div>
                    <div className="row"><b style={{ color: t.type === "income" ? COLORS.green : COLORS.red }}>{t.type === "income" ? "+" : "−"}{fmt(t.amount)} ₸</b><button className="chip" onClick={() => removeTxn(t.id)}>×</button></div>
                  </div>
                );
              })}
              {txns.length === 0 ? <div className="empty">Напиши “кофе 1200” и первый расход появится здесь.</div> : null}
            </div>
          </>
        ) : null}

        {financeMode === "budget" ? (
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Месячный бюджет</div>
            <input className="input" type="number" value={budget || ""} onChange={(e) => setBudget(Number(e.target.value || 0))} placeholder="Например: 250000" />
            <div style={{ marginTop: 14 }}><div className="between" style={{ marginBottom: 8 }}><span style={{ color: COLORS.muted }}>Использовано</span><b>{fmt(monthExpense)} / {fmt(budget)} ₸</b></div><div className="progress"><i style={{ width: `${budgetPct * 100}%` }} /></div></div>
          </div>
        ) : null}
      </>
    );
  }

  function renderProgress() {
    const skillData = [
      { name: "Дисциплина", level: habits.length ? Math.round((doneToday / habits.length) * 100) : 0, color: COLORS.gold, icon: "🎯" },
      { name: "Финансы", level: Math.min(txns.length * 6, 100), color: COLORS.green, icon: "💰" },
      { name: "Тело", level: Math.min(habits.filter((h) => h.category === "body").length * 25, 100), color: COLORS.green, icon: "💪" },
      { name: "Интеллект", level: Math.min(habits.filter((h) => h.category === "mind").length * 25, 100), color: COLORS.blue, icon: "🧠" },
    ];
    return (
      <>
        <AppHeader title="Прогресс" subtitle="Статистика личной прокачки" level={lvl.level} />
        <div className="card hero">
          <div className="eyebrow" style={{ color: COLORS.gold }}>Недельный отчёт</div>
          <div style={{ fontSize: 44, fontWeight: 950, letterSpacing: "-.05em", marginTop: 8 }}>{fmt(xp)} XP</div>
          <p style={{ color: COLORS.muted, marginBottom: 0 }}>Привычки, финансы и дисциплина дают очки роста.</p>
        </div>
        <div className="section-title">Активность финансов</div>
        <div className="card chart-card">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyBars}><XAxis dataKey="day" stroke={COLORS.muted} fontSize={12} /><YAxis hide /><Tooltip formatter={(v) => `${fmt(v)} ₸`} contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, color: COLORS.text }} /><Bar dataKey="Расходы" fill={COLORS.red} radius={[10, 10, 0, 0]} /><Bar dataKey="Доходы" fill={COLORS.green} radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
        <div className="section-title">Навыки</div>
        <div style={{ display: "grid", gap: 12 }}>
          {skillData.map((s) => <div className="skill-card" key={s.name}><div className="between"><div className="row"><div className="iconbox" style={{ borderColor: `${s.color}55` }}>{s.icon}</div><div><b>{s.name}</b><div style={{ color: COLORS.muted, fontSize: 12 }}>уровень навыка</div></div></div><b style={{ color: s.color }}>{s.level}%</b></div><div className="progress" style={{ marginTop: 12 }}><i style={{ width: `${s.level}%`, background: s.color }} /></div></div>)}
        </div>
      </>
    );
  }

  function renderProfile() {
    return (
      <>
        <AppHeader title="Профиль" subtitle="Настройки приложения" level={lvl.level} />
        <div className="card" style={{ padding: 16 }}>
          <div className="label" style={{ marginTop: 0 }}>Как обращаться</div>
          <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} onBlur={() => { writeLS("forma-user-name", userName); toast("✅", "Имя сохранено"); }} />
          <div className="grid2" style={{ marginTop: 14 }}>
            <button className="btn gold" onClick={requestNotifications}>🔔 Включить уведомления</button>
            <button className="btn secondary" onClick={() => showNotification("Forma", "Проверка уведомлений работает ✅", "forma-check")}>Тест уведомления</button>
          </div>
          <p style={{ color: COLORS.muted, lineHeight: 1.55, fontSize: 13 }}>Для напоминаний вне открытого окна установи Forma на главный экран и разреши уведомления. Для полностью надёжной доставки при закрытом приложении понадобится серверный web-push.</p>
        </div>
        <div className="section-title">Данные</div>
        <div className="grid2">
          <button className="btn secondary" onClick={() => { const data = { userName, habits, txns, budget }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "forma-backup.json"; a.click(); URL.revokeObjectURL(url); }}>Экспорт JSON</button>
          <button className="btn red" onClick={() => { if (confirm("Очистить все данные Forma?")) { localStorage.clear(); location.reload(); } }}>Сбросить</button>
        </div>
      </>
    );
  }

  return (
    <div className="app">
      <AppStyles />
      <Toasts toasts={toasts} />
      {showOnboarding ? <Onboarding onSave={saveName} /> : null}
      <main className="shell">
        {tab === "home" && renderHome()}
        {tab === "habits" && renderHabits()}
        {tab === "finance" && renderFinance()}
        {tab === "progress" && renderProgress()}
        {tab === "profile" && renderProfile()}
      </main>
      <nav className="nav">
        {NAV.map((n) => <button key={n.id} className={tab === n.id ? "active" : ""} onClick={() => setTab(n.id)}><b>{n.icon}</b><span>{n.label}</span></button>)}
      </nav>
    </div>
  );
}

function QuickExpenseBox({ quickExpense, setQuickExpense, submitQuickExpense, saveTxn }) {
  return (
    <div className="card" style={{ padding: 16, marginTop: 14 }}>
      <div className="between" style={{ marginBottom: 10 }}>
        <div><div className="eyebrow" style={{ color: COLORS.gold }}>Запись за 5 секунд</div><b style={{ fontSize: 18 }}>Быстрый ввод расходов</b></div>
      </div>
      <div className="row">
        <input className="input" value={quickExpense} onChange={(e) => setQuickExpense(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitQuickExpense()} placeholder="кофе 1200, такси 2000" />
        <button className="btn gold" onClick={submitQuickExpense}>Сохранить</button>
      </div>
      <div className="quick-grid" style={{ marginTop: 12 }}>
        {QUICK_EXPENSES.map((q) => (
          <button className="quick-btn" key={q.label} onClick={() => saveTxn({ type: "expense", amount: q.amount, cat: q.cat, note: q.label, date: todayKey() })}>
            <strong>{q.icon} {q.label}</strong><span>−{fmt(q.amount)} ₸</span>
          </button>
        ))}
      </div>
    </div>
  );
}
