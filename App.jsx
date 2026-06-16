import { useState, useEffect, useRef } from "react";

// Storage adapter - works on Vercel (localStorage) and Claude artifacts (storage)
const storage = {
  get: async (key) => {
    if(typeof window !== "undefined" && window.storage && window.storage !== storage) return window.storage.get(key);
    try { const v = localStorage.getItem(key); return v ? {value:v} : null; } catch(e){ return null; }
  },
  set: async (key, value) => {
    if(storage) return storage.set(key, value);
    try { localStorage.setItem(key, value); return {value}; } catch(e){ return null; }
  },
  delete: async (key) => {
    if(storage) return storage.delete(key);
    try { localStorage.removeItem(key); return {deleted:true}; } catch(e){ return null; }
  }
};
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const MONTHS = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const H_COLORS = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#C77DFF","#FF9F43","#00D2D3"];
const H_EMOJIS = ["⚡","🔥","💧","📚","🏃","🧘","🎯","🌱","💪","✨"];
const H_CATS = [
  {id:"all",label:"Все",icon:"✦"},{id:"health",label:"Здоровье",icon:"❤️"},
  {id:"work",label:"Работа",icon:"💼"},{id:"growth",label:"Развитие",icon:"🌱"},
  {id:"other",label:"Другое",icon:"⭐"},
];
const EXP_CATS = [
  {id:"food",label:"Еда",icon:"🍔",color:"#FF6B6B"},
  {id:"transport",label:"Транспорт",icon:"🚇",color:"#4D96FF"},
  {id:"housing",label:"Жильё",icon:"🏠",color:"#FFD93D"},
  {id:"health",label:"Здоровье",icon:"💊",color:"#6BCB77"},
  {id:"fun",label:"Развлечения",icon:"🎮",color:"#C77DFF"},
  {id:"clothes",label:"Одежда",icon:"👗",color:"#FF9F43"},
  {id:"edu",label:"Учёба",icon:"📚",color:"#00D2D3"},
  {id:"other",label:"Другое",icon:"📦",color:"#A8A8A8"},
];
const INC_CATS = [
  {id:"salary",label:"Зарплата",icon:"💼",color:"#6BCB77"},
  {id:"freelance",label:"Фриланс",icon:"💻",color:"#4D96FF"},
  {id:"gift",label:"Подарок",icon:"🎁",color:"#FFD93D"},
  {id:"invest",label:"Инвестиции",icon:"📈",color:"#C77DFF"},
  {id:"other_in",label:"Другое",icon:"✨",color:"#FF9F43"},
];
const DEP_CATS = [
  {id:"bank",label:"Банк",icon:"🏦",color:"#00D2D3"},
  {id:"cash",label:"Наличные",icon:"💵",color:"#6BCB77"},
  {id:"crypto",label:"Крипто",icon:"₿",color:"#FFB800"},
  {id:"stocks",label:"Акции",icon:"📊",color:"#C77DFF"},
  {id:"other_dep",label:"Другое",icon:"🔒",color:"#4D96FF"},
];
const T_PRIORITIES = [
  {id:"high",label:"Высокий",color:"#FF4444"},
  {id:"mid",label:"Средний",color:"#FFB800"},
  {id:"low",label:"Низкий",color:"#44CC88"},
];
const T_CATS = [
  {id:"work",label:"Работа",icon:"◻"},
  {id:"personal",label:"Личное",icon:"◯"},
  {id:"study",label:"Учёба",icon:"△"},
  {id:"home",label:"Дом",icon:"⬡"},
  {id:"other",label:"Другое",icon:"◇"},
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat("ru-RU").format(Math.abs(Math.round(n)));
const getToday = () => new Date().toISOString().split("T")[0];
const getMonthKey = date => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const getCurrentMonthKey = () => getMonthKey(new Date());
const getTodayIdx = () => { const d = new Date().getDay(); return d===0?6:d-1; };

function getWeekDates(offset=0) {
  const today = new Date();
  const diff = today.getDay()===0?-6:1-today.getDay();
  const mon = new Date(today); mon.setDate(today.getDate()+diff+offset*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d.toISOString().split("T")[0];});
}
function getStreak(habit) {
  let s=0;
  for(let i=0;i<365;i++){const d=new Date();d.setDate(d.getDate()-i);if(habit.checks[d.toISOString().split("T")[0]])s++;else if(i>0)break;}
  return s;
}
function isOverdue(task){if(!task.deadline||task.done)return false;return task.deadline<getToday();}
function isDueToday(task){if(!task.deadline||task.done)return false;return task.deadline===getToday();}
function formatDate(d){if(!d)return"";const dt=new Date(d+"T00:00:00");return dt.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});}

function exportCSV(habits,txns,tasks){
  let csv="\uFEFF";
  csv+="=== ПРИВЫЧКИ ===\n\"Привычка\",\"Категория\",\"Дата\",\"Выполнено\"\n";
  habits.forEach(h=>{const cat=H_CATS.find(c=>c.id===h.category)?.label||"";Object.keys(h.checks).sort().forEach(date=>{csv+=`"${h.name}","${cat}","${date}","${h.checks[date]?"Да":"Нет"}"\n`;});});
  csv+="\n=== ФИНАНСЫ ===\n\"Тип\",\"Категория\",\"Сумма\",\"Дата\",\"Заметка\"\n";
  txns.forEach(t=>{const cats=t.type==="expense"?EXP_CATS:INC_CATS;const cat=cats.find(c=>c.id===t.cat)?.label||"";csv+=`"${t.type==="expense"?"Расход":"Доход"}","${cat}","${t.amount}","${t.date}","${t.note}"\n`;});
  csv+="\n=== ЗАДАЧИ ===\n\"Задача\",\"Приоритет\",\"Категория\",\"Дедлайн\",\"Статус\"\n";
  tasks.forEach(t=>{const pri=T_PRIORITIES.find(p=>p.id===t.priority)?.label||"";const cat=T_CATS.find(c=>c.id===t.cat)?.label||"";csv+=`"${t.title}","${pri}","${cat}","${t.deadline||""}","${t.done?"Выполнено":"Активна"}"\n`;});
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="forma.csv";a.click();URL.revokeObjectURL(url);
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({toasts}){
  return(
    <div style={{position:"fixed",top:16,right:16,zIndex:1000,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} className="toast-pop" style={{background:"#1E1E1E",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#F0EDE8",maxWidth:260,display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          <span style={{fontSize:18}}>{t.icon}</span>
          <div><div style={{fontWeight:500}}>{t.title}</div>{t.body&&<div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{t.body}</div>}</div>
        </div>
      ))}
    </div>
  );
}

const ChartTooltip=({active,payload})=>{
  if(!active||!payload?.length)return null;
  return<div style={{background:"#1C1C1C",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#F0EDE8"}}><div style={{color:payload[0].fill,fontWeight:600}}>{fmt(payload[0].value)} ₸</div></div>;
};

// ─── MAIN ────────────────────────────────────────────────────────────────────

// Character positions in sprite sheet (col 0-4, row 0-1)
const CHAR_POSITIONS = [
  {col:0,row:0}, // L1
  {col:1,row:0}, // L2
  {col:2,row:0}, // L3
  {col:3,row:0}, // L4
  {col:4,row:0}, // L5
  {col:0,row:1}, // L6
  {col:1,row:1}, // L7
  {col:2,row:1}, // L8
  {col:3,row:1}, // L9
  {col:4,row:1}, // L10
];



// ─── CHARACTER SPRITES ───────────────────────────────────────────────────────

const LEVEL_ICONS = ['🌱','🌿','⚡','🔥','💪','🏆','👑','💎','🌟','✦'];
function CharacterSprite({level, size=160}) {
  const idx = Math.min(level-1, 9);
  const colors = ['#666','#888','#48BB78','#3182CE','#2B6CB0','#1E5C42','#4C1D95','#1a1a2e','#C8A020','#FFD700'];
  return (
    <div style={{width:size*0.5,height:size,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:colors[idx]+'22',borderRadius:12}}>
      <span style={{fontSize:size*0.35}}>{LEVEL_ICONS[idx]}</span>
    </div>
  );
}


export default function Forma() {
  const [tab, setTab] = useState("home");
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Habits
  const [habits, setHabits] = useState([]);
  const [hWeekOffset, setHWeekOffset] = useState(0);
  const [hCatFilter, setHCatFilter] = useState("all");
  const [hAdding, setHAdding] = useState(false);
  const [hName, setHName] = useState("");
  const [hEmoji, setHEmoji] = useState("⚡");
  const [hColor, setHColor] = useState(H_COLORS[0]);
  const [hCat, setHCat] = useState("health");

  // Finance
  const [txns, setTxns] = useState([]);
  const [fTab, setFTab] = useState("overview");
  const [fType, setFType] = useState("expense");
  const [fAmount, setFAmount] = useState("");
  const [fCat, setFCat] = useState("food");
  const [fNote, setFNote] = useState("");
  const [fDate, setFDate] = useState(getToday());
  const [fMonth, setFMonth] = useState(getCurrentMonthKey());
  const [budget, setBudget] = useState(0);
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [tFilter, setTFilter] = useState("active"); // active | today | done
  const [tCatFilter, setTCatFilter] = useState("all");
  const [tAdding, setTAdding] = useState(false);
  const [tEditId, setTEditId] = useState(null);
  const [tTitle, setTTitle] = useState("");
  const [tPriority, setTPriority] = useState("mid");
  const [tCat, setTCat] = useState("work");
  const [tDeadline, setTDeadline] = useState("");
  const [tNote, setTNote] = useState("");

  // Inspire
  const [quoteToday, setQuoteToday] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [quoteTheme, setQuoteTheme] = useState("мотивация");
  const [showSaved, setShowSaved] = useState(false);

  // AI Advisor state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {role:"assistant", text:"Привет! Я Аза — твой ИИ-советник в Forma. Анализирую привычки, задачи и финансы. Спроси что угодно или попроси составить план на день! 💪"}
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [notifPermission, setNotifPermission] = useState("default");
  const [reminderTime, setReminderTime] = useState("20:00");
  const [remindersOn, setRemindersOn] = useState(false);
  const reminderTimerRef = useRef(null);
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  const QUOTE_THEMES = ["мотивация","продуктивность","осознанность","стойкость","рост","доброта","успех"];

  async function generateQuote(theme) {
    setQuoteLoading(true);
    try {
      const today = getToday();
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {"Content-Type":"application/json", "anthropic-dangerous-request-forwarding": "true"},
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Ты генератор вдохновляющих цитат. Отвечай ТОЛЬКО JSON без markdown: {\"quote\": \"текст цитаты\", \"author\": \"автор или источник\", \"reflection\": \"короткая мысль для размышления (1-2 предложения)\"}. Цитаты на русском языке. Делай их глубокими, не банальными.",
          messages: [{role:"user", content:`Сгенерируй вдохновляющую цитату или мысль на тему: ${theme}. Дата: ${today}. Сделай её уникальной и запоминающейся.`}]
        })
      });
      const data = await resp.json();
      const text = data.content?.map(i=>i.text||"").join("") || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      const quote = {...parsed, theme, date: today, id: Date.now()};
      setQuoteToday(quote);
      await storage.set("lt-quote-today", JSON.stringify({quote, date: today}));
    } catch(e) {
      setQuoteToday({quote:"Каждый день — это новая возможность стать лучше.", author:"Неизвестно", reflection:"Сделай сегодня хотя бы один маленький шаг вперёд.", theme, date: getToday(), id: Date.now()});
    }
    setQuoteLoading(false);
  }

  function saveQuote(q) {
    setSavedQuotes(p => {
      if(p.find(s=>s.id===q.id)) return p;
      const updated = [q, ...p];
      storage.set("lt-saved-quotes", JSON.stringify(updated)).catch(()=>{});
      return updated;
    });
  }
  function unsaveQuote(id) {
    setSavedQuotes(p => {
      const updated = p.filter(q=>q.id!==id);
      storage.set("lt-saved-quotes", JSON.stringify(updated)).catch(()=>{});
      return updated;
    });
  }

  // PWA setup
  useEffect(()=>{
    // App manifest
    const manifest = {
      name: "Forma",
      short_name: "Forma",
      description: "Вырасти на уровень выше",
      start_url: "/",
      display: "standalone",
      background_color: "#1E3932",
      theme_color: "#1E3932",
      orientation: "portrait",
      icons: [
        { src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 115'><defs><linearGradient id='g' x1='0' y1='0' x2='100' y2='115' gradientUnits='userSpaceOnUse'><stop offset='0%25' stop-color='%23A78BFF'/><stop offset='50%25' stop-color='%234DAA9A'/><stop offset='100%25' stop-color='%232E6B57'/></linearGradient></defs><path d='M50 4 L94 20 L94 60 C94 85 73 105 50 112 C27 105 6 85 6 60 L6 20 Z' fill='%230A1412' stroke='url(%23g)' stroke-width='4'/><path d='M20 78 L20 56 L34 56 L34 42 L48 42 L48 26 L68 26 L68 78 Z' fill='url(%23g)' opacity='0.4'/><polyline points='20,78 20,56 34,56 34,42 48,42 48,26 68,26' fill='none' stroke='url(%23g)' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/><circle cx='68' cy='26' r='6' fill='none' stroke='url(%23g)' stroke-width='3'/><circle cx='68' cy='26' r='2.5' fill='%234DAA9A'/></svg>", sizes: "any", type: "image/svg+xml", purpose: "any maskable"
        }
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("link");
    link.rel = "manifest"; link.href = url;
    document.head.appendChild(link);

    // Theme color
    const meta = document.createElement("meta");
    meta.name = "theme-color"; meta.content = "#1E3932";
    document.head.appendChild(meta);

    // Apple PWA tags
    const appleMeta = document.createElement("meta");
    appleMeta.name = "apple-mobile-web-app-capable"; appleMeta.content = "yes";
    document.head.appendChild(appleMeta);

    const appleStatus = document.createElement("meta");
    appleStatus.name = "apple-mobile-web-app-status-bar-style"; appleStatus.content = "black-translucent";
    document.head.appendChild(appleStatus);

    const appleTitle = document.createElement("meta");
    appleTitle.name = "apple-mobile-web-app-title"; appleTitle.content = "Forma";
    document.head.appendChild(appleTitle);

    // Apple touch icon (SVG badge)
    const svgIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 115'><defs><linearGradient id='g' x1='0' y1='0' x2='100' y2='115' gradientUnits='userSpaceOnUse'><stop offset='0%' stop-color='#A78BFF'/><stop offset='50%' stop-color='#4DAA9A'/><stop offset='100%' stop-color='#2E6B57'/></linearGradient></defs><path d='M50 4 L94 20 L94 60 C94 85 73 105 50 112 C27 105 6 85 6 60 L6 20 Z' fill='#0A1412' stroke='url(#g)' stroke-width='4'/><path d='M20 78 L20 56 L34 56 L34 42 L48 42 L48 26 L68 26 L68 78 Z' fill='url(#g)' opacity='0.4'/><polyline points='20,78 20,56 34,56 34,42 48,42 48,26 68,26' fill='none' stroke='url(#g)' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/><circle cx='68' cy='26' r='6' fill='none' stroke='url(#g)' stroke-width='3'/><circle cx='68' cy='26' r='2.5' fill='#4DAA9A'/></svg>`;
    const iconLink = document.createElement("link");
    iconLink.rel = "apple-touch-icon";
    iconLink.href = "data:image/svg+xml," + svgIcon;
    document.head.appendChild(iconLink);

    return () => { URL.revokeObjectURL(url); };
  }, []);

  useEffect(()=>{
    async function load(){
      try{
        const h=await storage.get("lt-habits");if(h?.value)setHabits(JSON.parse(h.value));
        const t=await storage.get("lt-txns");if(t?.value)setTxns(JSON.parse(t.value));
        const b=await storage.get("lt-budget");if(b?.value)setBudget(JSON.parse(b.value));
        const tk=await storage.get("lt-tasks");if(tk?.value)setTasks(JSON.parse(tk.value));
        const sq=await storage.get("lt-saved-quotes");if(sq?.value)setSavedQuotes(JSON.parse(sq.value));
        const un=await storage.get("lt-username");
        if(un?.value){setUserName(JSON.parse(un.value));}else{setShowWelcome(true);}
        const qt=await storage.get("lt-quote-today");
        if(qt?.value){const{quote,date}=JSON.parse(qt.value);if(date===getToday())setQuoteToday(quote);}
      }catch{}
      setLoaded(true);
    }
    load();
  },[]);

  useEffect(()=>{if(!loaded)return;storage.set("lt-habits",JSON.stringify(habits)).catch(()=>{});},[habits,loaded]);
  useEffect(()=>{if(!loaded)return;storage.set("lt-txns",JSON.stringify(txns)).catch(()=>{});},[txns,loaded]);
  useEffect(()=>{if(!loaded)return;storage.set("lt-budget",JSON.stringify(budget)).catch(()=>{});},[budget,loaded]);
  useEffect(()=>{if(!loaded)return;storage.set("lt-tasks",JSON.stringify(tasks)).catch(()=>{});},[tasks,loaded]);

  function toast(icon,title,body){const id=Date.now();setToasts(p=>[...p,{id,icon,title,body}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);}

  // ── HABIT ACTIONS ──
  const weekDates=getWeekDates(hWeekOffset);
  const todayIdx=getTodayIdx();
  const isCurrWeek=hWeekOffset===0;
  const filteredHabits=hCatFilter==="all"?habits:habits.filter(h=>h.category===hCatFilter);
  const todayDoneH=habits.filter(h=>h.checks[getToday()]).length;

  function addHabit(){
    if(!hName.trim())return;
    const h={id:Date.now(),name:hName.trim(),emoji:hEmoji,color:hColor,category:hCat,checks:{}};
    setHabits(p=>[...p,h]);setHName("");setHAdding(false);
    toast(hEmoji,`«${h.name}» добавлена!`);
  }
  function toggleHabit(hid,date){
    setHabits(p=>p.map(h=>{
      if(h.id!==hid)return h;
      const was=!!h.checks[date];
      const updated={...h,checks:{...h.checks,[date]:!was}};
      if(!was&&date===getToday()){const s=getStreak(updated);if(s>0&&s%7===0)toast("🔥",`${s} дней подряд!`,h.name);else toast("✅",h.name,s>1?`${s} дн. подряд 🔥`:"Выполнено!");}
      return updated;
    }));
  }
  function deleteHabit(id){setHabits(p=>p.filter(h=>h.id!==id));}

  // ── FINANCE ACTIONS ──
  const monthTxns=txns.filter(t=>getMonthKey(t.date)===fMonth);
  const monthExp=monthTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const monthInc=monthTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const monthDep=monthTxns.filter(t=>t.type==="deposit").reduce((s,t)=>s+t.amount,0);
  const totalBalance=txns.reduce((s,t)=>t.type==="income"?s+t.amount:t.type==="expense"?s-t.amount:s,0);
  const totalDeposit=txns.filter(t=>t.type==="deposit").reduce((s,t)=>s+t.amount,0);
  const budgetPct=budget>0?Math.min(monthExp/budget*100,100):0;
  const budgetColor=budgetPct>90?"#FF6B6B":budgetPct>70?"#FFD93D":"#6BCB77";
  const pieData=EXP_CATS.map(c=>({name:c.label,value:monthTxns.filter(t=>t.type==="expense"&&t.cat===c.id).reduce((s,t)=>s+t.amount,0),color:c.color,icon:c.icon})).filter(c=>c.value>0);
  const barData=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;const tx=txns.filter(t=>getMonthKey(t.date)===key);return{name:MONTHS[d.getMonth()],Доходы:tx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),Расходы:tx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)};});
  const monthsAvail=[...new Set(txns.map(t=>getMonthKey(t.date)))].sort().reverse();
  if(!monthsAvail.includes(getCurrentMonthKey()))monthsAvail.unshift(getCurrentMonthKey());

  function addTxn(){
    const val=parseFloat(fAmount.replace(",","."));if(!val||val<=0)return;
    const allCats=fType==="expense"?EXP_CATS:fType==="income"?INC_CATS:DEP_CATS;
    const catObj=allCats.find(c=>c.id===fCat)||allCats[0];
    setTxns(p=>[{id:Date.now(),type:fType,amount:val,cat:fCat,note:fNote.trim(),date:fDate},...p]);
    toast(catObj.icon,`${fType==="expense"?"−":fType==="deposit"?"🏦":"+"} ${fmt(val)} ₸`,catObj.label);
    setFAmount("");setFNote("");setFTab("overview");
  }

  // ── TASK ACTIONS ──
  const pOrder={high:0,mid:1,low:2};
  let visibleTasks=[...tasks];
  if(tFilter==="today")visibleTasks=visibleTasks.filter(t=>!t.done&&(isDueToday(t)||isOverdue(t)));
  else if(tFilter==="done")visibleTasks=visibleTasks.filter(t=>t.done);
  else visibleTasks=visibleTasks.filter(t=>!t.done);
  if(tCatFilter!=="all")visibleTasks=visibleTasks.filter(t=>t.cat===tCatFilter);
  visibleTasks.sort((a,b)=>{
    if(tFilter!=="done"){const aO=isOverdue(a)?0:1,bO=isOverdue(b)?0:1;if(aO!==bO)return aO-bO;}
    if(a.deadline&&b.deadline)return a.deadline.localeCompare(b.deadline);
    if(a.deadline)return-1;if(b.deadline)return 1;
    return pOrder[a.priority]-pOrder[b.priority];
  });
  const activeTaskCount=tasks.filter(t=>!t.done).length;
  const doneTaskCount=tasks.filter(t=>t.done).length;
  const overdueCount=tasks.filter(t=>isOverdue(t)).length;
  const todayTaskCount=tasks.filter(t=>isDueToday(t)&&!t.done).length;

  function resetTaskForm(){setTTitle("");setTPriority("mid");setTCat("work");setTDeadline("");setTNote("");setTAdding(false);setTEditId(null);}
  function saveTask(){
    if(!tTitle.trim())return;
    if(tEditId){setTasks(p=>p.map(t=>t.id===tEditId?{...t,title:tTitle.trim(),priority:tPriority,cat:tCat,deadline:tDeadline,note:tNote.trim()}:t));}
    else{setTasks(p=>[{id:Date.now(),title:tTitle.trim(),priority:tPriority,cat:tCat,deadline:tDeadline,note:tNote.trim(),done:false,createdAt:getToday()},...p]);toast("✅",`«${tTitle.trim()}» добавлена!`);}
    resetTaskForm();
  }
  function toggleTask(id){setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done,doneAt:!t.done?getToday():null}:t));}
  function deleteTask(id){setTasks(p=>p.filter(t=>t.id!==id));}
  function startEditTask(task){setTTitle(task.title);setTPriority(task.priority);setTCat(task.cat);setTDeadline(task.deadline||"");setTNote(task.note||"");setTEditId(task.id);setTAdding(true);}

  const NAV=[{id:"home",icon:"⊹",label:"Главная"},{id:"habits",icon:"◎",label:"Привычки"},{id:"tasks",icon:"✓",label:"Задачи"},{id:"finance",icon:"◈",label:"Финансы"},{id:"game",icon:"⬡",label:"Уровень"}];


  // ── GAMIFICATION ──
  const G_LEVELS=[
    {level:1,name:"Новичок",xpNeeded:0,icon:"🌱"},
    {level:2,name:"Стартер",xpNeeded:100,icon:"🌿"},
    {level:3,name:"Практик",xpNeeded:250,icon:"⚡"},
    {level:4,name:"Боец",xpNeeded:500,icon:"🔥"},
    {level:5,name:"Мастер",xpNeeded:1000,icon:"💪"},
    {level:6,name:"Чемпион",xpNeeded:2000,icon:"🏆"},
    {level:7,name:"Легенда",xpNeeded:4000,icon:"👑"},
    {level:8,name:"Элита",xpNeeded:7000,icon:"💎"},
    {level:9,name:"Непобедимый",xpNeeded:12000,icon:"🌟"},
    {level:10,name:"Forma Pro",xpNeeded:20000,icon:"✦"},
  ];
  const G_BADGES=[
    {id:"first_habit",icon:"🌱",name:"Первый шаг",desc:"Добавь первую привычку",check:()=>habits.length>=1},
    {id:"streak7",icon:"🔥",name:"Неделя огня",desc:"7 дней подряд",check:()=>habits.some(h=>getStreak(h)>=7)},
    {id:"streak30",icon:"💎",name:"Месяц силы",desc:"30 дней подряд",check:()=>habits.some(h=>getStreak(h)>=30)},
    {id:"habits5",icon:"⚡",name:"Коллекционер",desc:"5 привычек сразу",check:()=>habits.length>=5},
    {id:"all_today",icon:"✅",name:"Идеальный день",desc:"Все привычки сегодня",check:()=>habits.length>0&&habits.every(h=>h.checks[getToday()])},
    {id:"first_task",icon:"📋",name:"Начало пути",desc:"Добавь первую задачу",check:()=>tasks.length>=1},
    {id:"tasks10",icon:"🏅",name:"Исполнитель",desc:"Выполни 10 задач",check:()=>tasks.filter(t=>t.done).length>=10},
    {id:"first_txn",icon:"💰",name:"Финансист",desc:"Первая запись в финансах",check:()=>txns.length>=1},
    {id:"deposit10k",icon:"🏦",name:"Накопитель",desc:"Депозит 10 000+ ₸",check:()=>txns.filter(t=>t.type==="deposit").reduce((s,t)=>s+t.amount,0)>=10000},
    {id:"balance_plus",icon:"📈",name:"В плюсе",desc:"Положительный баланс",check:()=>txns.reduce((s,t)=>t.type==="income"?s+t.amount:t.type==="expense"?s-t.amount:s,0)>0&&txns.length>0},
    {id:"combo",icon:"🎯",name:"Системный",desc:"3+ привычки и 5+ задач",check:()=>habits.length>=3&&tasks.length>=5},
  ];
  const totalXP=(()=>{
    let xp=0;
    habits.forEach(h=>{xp+=Object.values(h.checks).filter(Boolean).length*10;const s=getStreak(h);if(s>=7)xp+=50;if(s>=30)xp+=200;});
    xp+=tasks.filter(t=>t.done).length*20;
    xp+=txns.length*15;
    return xp;
  })();
  const curLvl=G_LEVELS.slice().reverse().find(l=>totalXP>=l.xpNeeded)||G_LEVELS[0];
  const nxtLvl=G_LEVELS.find(l=>l.xpNeeded>totalXP)||G_LEVELS[G_LEVELS.length-1];
  const xpPct=nxtLvl.xpNeeded===curLvl.xpNeeded?100:Math.round((totalXP-curLvl.xpNeeded)/(nxtLvl.xpNeeded-curLvl.xpNeeded)*100);
  const earnedB=G_BADGES.filter(b=>b.check());
  const lockedB=G_BADGES.filter(b=>!b.check());

  const homeHabitScore=habits.length>0?Math.round(todayDoneH/habits.length*100):0;

  return(
    <div style={{minHeight:"100vh",background:"#1E3932",color:"#F0EDE8",fontFamily:"'Outfit','Segoe UI',sans-serif",maxWidth:500,margin:"0 auto",paddingBottom:80}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{display:none}
        .card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:18px}
        .input-f{background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:12px;padding:11px 14px;font-family:inherit;font-size:14px;color:#F0EDE8;outline:none;width:100%;transition:border-color 0.2s}
        .input-f:focus{border-color:rgba(255,255,255,0.3)}
        .primary-btn{background:#F0EDE8;color:#1E3932;border:none;border-radius:13px;padding:13px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;width:100%;transition:opacity 0.15s}
        .primary-btn:hover{opacity:0.88}
        .ghost-btn{background:none;border:1.5px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px 14px;font-family:inherit;font-size:12px;color:rgba(255,255,255,0.5);cursor:pointer;transition:all 0.15s}
        .ghost-btn:hover{border-color:rgba(255,255,255,0.3);color:#F0EDE8}
        .check-cell{width:33px;height:33px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.1);background:transparent;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
        .check-cell:hover{transform:scale(1.1)}
        .habit-row{display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:13px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);margin-bottom:7px;transition:background 0.2s}
        .habit-row:hover{background:rgba(255,255,255,0.06)}
        .del-btn{opacity:0;background:none;border:none;color:#666;cursor:pointer;font-size:16px;padding:2px 5px;border-radius:4px;transition:all 0.15s;flex-shrink:0}
        .habit-row:hover .del-btn,.task-card:hover .del-btn{opacity:1}
        .del-btn:hover{color:#FF6B6B;background:rgba(255,107,107,0.1)}
        .add-dashed{background:none;border:1.5px dashed rgba(255,255,255,0.15);border-radius:12px;padding:10px;font-family:inherit;font-size:12px;width:100%;color:rgba(255,255,255,0.35);cursor:pointer;transition:all 0.2s;letter-spacing:0.05em}
        .add-dashed:hover{border-color:rgba(255,255,255,0.4);color:rgba(255,255,255,0.7)}
        .cat-pill{border:1.5px solid rgba(255,255,255,0.1);border-radius:18px;padding:5px 11px;cursor:pointer;font-size:11px;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;gap:4px;white-space:nowrap;background:none}
        .tx-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .tx-row:last-child{border-bottom:none}
        .nav-btn{flex:1;background:none;border:none;cursor:pointer;padding:10px 4px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;transition:all 0.15s;font-family:inherit}
        .sub-tab{background:none;border:none;cursor:pointer;font-family:inherit;padding:9px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;flex:1}
        .emoji-btn{width:34px;height:34px;border-radius:8px;border:1.5px solid transparent;cursor:pointer;font-size:17px;transition:all 0.15s;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05)}
        .color-dot{width:20px;height:20px;border-radius:50%;cursor:pointer;transition:transform 0.15s;border:2px solid transparent;flex-shrink:0}
        .color-dot.sel{transform:scale(1.35);border-color:white!important}
        .type-toggle{display:flex;background:rgba(255,255,255,0.05);border-radius:11px;padding:3px;gap:3px}
        .type-btn{flex:1;border:none;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;cursor:pointer;transition:all 0.2s;font-weight:500}
        .task-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:13px 15px;margin-bottom:7px;transition:background 0.15s;cursor:default}
        .task-card:hover{background:rgba(255,255,255,0.07)}
        .task-card.overdue{border-left:3px solid #FF4444}
        .task-card.due-today{border-left:3px solid #FFB800}
        .check-box{width:20px;height:20px;border-radius:4px;border:1.5px solid rgba(255,255,255,0.2);background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-size:11px}
        .check-box.done{background:#F0EDE8;border-color:#F0EDE8;color:#0C0C0C}
        .pri-btn{border-radius:6px;padding:5px 10px;cursor:pointer;font-family:inherit;font-size:11px;transition:all 0.15s;display:flex;align-items:center;gap:5px}
        .edit-btn{opacity:0;background:none;border:none;color:#666;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;transition:all 0.15s;font-family:inherit}
        .task-card:hover .edit-btn{opacity:1}
        .edit-btn:hover{color:#F0EDE8;background:rgba(255,255,255,0.1)}
        .filter-btn{background:none;border:1.5px solid rgba(255,255,255,0.1);border-radius:16px;padding:5px 12px;cursor:pointer;font-family:inherit;font-size:11px;color:rgba(255,255,255,0.4);transition:all 0.15s;white-space:nowrap}
        .filter-btn.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.3);color:#F0EDE8}
        .badge{font-size:10px;border-radius:4px;padding:2px 7px;display:inline-flex;align-items:center;font-family:inherit}
        .fade-in{animation:fi 0.25s ease}
        @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .toast-pop{animation:tp 0.25s ease}
        @keyframes tp{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        .pulse{animation:pl 2s infinite}
        @keyframes pl{0%,100%{opacity:1}50%{opacity:0.4}}
        .progress-bar{height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden}
        .progress-fill{height:100%;border-radius:2px;transition:width 0.5s ease}
      `}</style>

      <Toast toasts={toasts}/>

      {/* ── HOME ── */}
      {tab==="home"&&(
        <div className="fade-in" style={{minHeight:"100vh"}}>

          {/* Hero header with gradient */}
          <div style={{position:"relative",padding:"48px 24px 0",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,255,255,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:500}}>
                  {new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                {userName&&<div style={{fontSize:16,fontWeight:700,color:"#F0EDE8",letterSpacing:"-0.01em"}}>Привет, {userName}! 👋</div>}
              </div>
            </div>
          </div>
          {/* White stripe full width with logo */}
          <div style={{background:"transparent",borderTop:"none",borderBottom:"none",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                {/* Badge logo */}
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <img
                    src="data:image/webp;base64,UklGRqIIAABXRUJQVlA4WAoAAAAQAAAANwAAPQAAQUxQSKYDAAABoEXbtmk7mmuvHdu2WbZt27Zt27Zt27Zj2/Y92GfPj4uDJPUdEROANbFYa81qYCzK1RRMLNDq8DuP6wRYKZCxQLdbZ5NccXMnwJpiiCrQ/sIFZFgKybnntgHUSF5iFECfW+eSoSPpQnL2TT0BWJXsjLUA6u335AoydOT39/5MxiG5/NFNWwOw1mQgag0As+Gd40kGCfn1TgBOGUm6gOTch/ZoBMBYlZrUAEDX/e8bTTIKSf54nYFYQZ2DfyQZOpITnjmmMwAYrQHouMNF35RIxgHJ+bduBkABKIAdP1hE+lJEctWXF2zXCDCVjDnosyUkfeBILvvowLaAKCqKCtDh4G9JMgxIctInO8CUKe4gGcUkOf2D83sAUINa1QAYcsHXi0n6MCbdDqKASMuFLiI5+dW71m0EwKggragAaLnTZaNWkknA92EBQeeIftHl61kAUGuQrbEGgPTa8wUf+SodS+Q4AGqNIE9RC2AjhqwWkJPqGIMCSh3dOc1EgRQBih3WImJl9VAAq4Eo0PjEjrAFEwX0rIkciDrpJuSiQKNTh5GubxZTc1BB3UOHkS5hv3SeH8AgYwF2GUa6hMyCHCYi2Rgc+ivpEpZnMkWQjWILMklYOZOJmekPScjqBTKyPhPmUMrO4iUf59DZpRG1levaHku9T7MjQ35YQVpMS2FQ68OMmWYrhnyjDIrPyAk1COy+Z5151llnnXX22bctTnyqkxnwuCovMw4HwVQwss4wZt4PdfEUSzyigsUpXMUzxVbCTwzj6j6VqTuWfnkXCADFBonjz5Ayld5h7Jl1P8j2DP2bUJQb8xvdknZiynAnHXPAJwx4HGwFi3MZ8B0YwEinlYnPbgD6Bs7P7SRSQaTtvCSO+kKhuJyO2Q/Eewx4FSwqW5zDgB9DDVot9D6HVgcySlb0FFNFTIOJjHgZ6uF0OmZf2n6WD3kLLKobbMk44j6QMT7JIZxGx38bqtQAi2sYuKDrrj5hrokLt4OiVtFGfzHimEnMJwl5MixqF2n6GyPmHfJu1EFaRe/pDH0+EV+pq5IKiu6jGOXhYz4EEWSoaPMrnc/MkTdABZkqGl1Pxtn4mCvPgwoyNsDJ8+mTDBz560AosheL7s+TSZLCJVx0E6DIVYHdfyad89UcyU87QQxyFgPsOZJknHj6JCb9ezsDFgVUQd1DPimRTEi67zcGRFBMBTDgjn+XcsnfZw8EVFFYUQOg03YdAIhBsY1FuTUovhgVwf9+VlA4INYEAACwFgCdASo4AD4APm0uk0ekIiGhKhZq6IANiWoAtRuJxTFCvxwN6xvqm2yvmA85/zt+mA9TzeOf77NLvveQXvpzEuAHcX+df+S8Nj5n/S/UQ/qX+49LvNj+Zf3j/s+4N/Jf6r/yfWZ9e/7gexF+sprM6QA7N8XSf/8ztr2OTrr8tTn3nYCUkKT/OSd6meMGVgxVxbNZsASKllMtNYg7x0TXQ6aMCBj/+GkcH336r5yO2NdmkfjrSO/88RBF7Tq4AP7/OjdEvLpIgB5TXv/QXH9Vn54qS1ptSr+tw+PqpRT5caLZ/lbafZ7XfDq8SNvLK7GdxnNzTzT+Jna7ukCdcyMtBmIlA8SfaK8HyTDi/yDcWUcXWl+HuwHnk1C+t8dKygnmJctzPmCxLPouzhvhEQQbp6w0sIcUx9239U1uOQSk/AGn7+4vS0rHC5K8MGO4uv0IHx+MWynjSwOyOfpvnR7CqC+u/3Da0SiItomNM4xnUNVOspvgWkNtKnkUU5woyFkwvCJXnz/zgA6fmfeGM+OCjhvTwZb7cpSWilvoADMqcJ0/MTJDeN0zJRc3df7n0N4DXX26tFfUSEXpcMpbyeyqhM05kbkRo8Z4NqQOYadqsRtlB5LCDU7+oBXkDKSaWSkOkI77yTq8LhcntvZmyg03UuN68dWMtOrG+ciLxIB9kI4fjr2qvN0cb/zubQRkZC9/m8duLZnJe2u1/5Eh3nKf7Q2YZ8yUqwfYk4XDInXGIOkJn9j7P+3NqDu+0w4Glh7BdKvIUjY5zbyPlu8rh97ueM3qYvlyWaYDBnt2IYGAUBKldiSsHtolkYP+oIz5w+GRVSeHmcq+Ekahz3x0+uGoTruESjIBNqKEAncP8Ti1wtRr4QrNLX2uqa1sZHocO6+wE9Z9+iCz5k7+5MRVNFLY3IKCMSRyTUc6nKNgszboiNNUT/4uTmsqJOIXBRAVXyO4sE204kr+WfCQyH/h5CkBPmmQUsdqcnmK9iyCaoTqFeKlOhmSkOidRsdZXZS4kLT1LDJnqt0FI15q7YNmew4k5lJQWvRW+DeHBnJMmeTmQ1XPhILjhwM32PKnE9TS4izm3nBBY+VZNGgW1Hzo+YL2oH73yhg+xTjpyrbswQ9B+c3YUwf+xaF10jSnQpUNR8MLxofexebv13fOBmTPlRqJv+RfNO4DyswBCpJrFhTR45M7Ja51qfT33sOavYKnFKV6/O+Y5vXRjBi+928jbzTqvLzXq2P3rWV83badxynRB+umUq31WMUliNwltyJrIFkkf/eEVVLpHhdxCoXD3/60MVlv46upiexQAN4d58f86aD+dvoJqlIcfaitBrq2Ry+dQyyNgL6MKracForuOucqY0SzJDFLgzdBdagdLoUXsoN9ieIezGYQKzKYJb9orshwGhyjpFvzUM5C302Jmrpv/RZrn/InS9gwYBrBLZEDqozfJZlT2vocfP2FOkKYfl5tBKaqWF+gQZgHqfiYHsZ5YuWbG2Rnmpw+vf8MU1GVgipKO9dtfZVFgUGRhg72DnvhnyKh1kVfwgEl47Rx7hL6jVJgrFLG7tbVvhZveENtts0SMf4O+jQeV422fP5L3GAsPQ1WVNsS/xq5AeuGDB//t8rTk/SoN81t5Xhi3+AEsRoVVAAAAA=="
                    style={{width:48,height:53,objectFit:"contain",flexShrink:0,filter:"drop-shadow(0 2px 8px rgba(77,170,154,0.35))"}}
                  />
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,fontWeight:900,fontStyle:"italic",color:"#F0EDE8",lineHeight:1,letterSpacing:"-0.02em",textShadow:"0 1px 8px rgba(0,0,0,0.3)"}}>Forma</div>
                    <div style={{fontSize:7,color:"rgba(167,139,255,0.7)",letterSpacing:"0.22em",textTransform:"uppercase",fontWeight:500}}>HABITS · TASKS · FINANCES</div>
                  </div>
                </div>
<button onClick={()=>exportCSV(habits,txns,tasks)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 12px",color:"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:11,fontFamily:"inherit",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#F0EDE8"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#F0EDE8"}}>
                  ⬇ CSV
                </button>
          </div>

          <div style={{padding:"0 16px 40px",display:"flex",flexDirection:"column",gap:12}}>

            {/* Big stats row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {/* Habits big card */}
              <div onClick={()=>setTab("habits")} style={{background:"linear-gradient(135deg,rgba(107,203,119,0.12) 0%,rgba(107,203,119,0.04) 100%)",border:"1px solid rgba(107,203,119,0.2)",borderRadius:20,padding:"18px 16px",cursor:"pointer",transition:"transform 0.15s",position:"relative",overflow:"hidden"}}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"}
                onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                <div style={{position:"absolute",top:-10,right:-10,fontSize:48,opacity:0.08}}>◎</div>
                <div style={{fontSize:10,color:"rgba(107,203,119,0.7)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Привычки</div>
                <div style={{fontSize:30,fontWeight:800,color:"#6BCB77",letterSpacing:"-0.03em",lineHeight:1}}>{todayDoneH}<span style={{fontSize:16,color:"rgba(107,203,119,0.5)"}}>/{habits.length}</span></div>
                <div style={{marginTop:8,height:3,background:"rgba(107,203,119,0.15)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${homeHabitScore}%`,background:"#6BCB77",borderRadius:2,transition:"width 0.5s"}}/>
                </div>
                <div style={{fontSize:10,color:"rgba(107,203,119,0.6)",marginTop:5}}>{homeHabitScore}% сегодня</div>
              </div>

              {/* Tasks big card */}
              <div onClick={()=>setTab("tasks")} style={{background:overdueCount>0?"linear-gradient(135deg,rgba(255,68,68,0.12) 0%,rgba(255,68,68,0.04) 100%)":"linear-gradient(135deg,rgba(77,150,255,0.12) 0%,rgba(77,150,255,0.04) 100%)",border:`1px solid ${overdueCount>0?"rgba(255,68,68,0.2)":"rgba(77,150,255,0.2)"}`,borderRadius:20,padding:"18px 16px",cursor:"pointer",transition:"transform 0.15s",position:"relative",overflow:"hidden"}}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"}
                onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                <div style={{position:"absolute",top:-10,right:-10,fontSize:48,opacity:0.08}}>✓</div>
                <div style={{fontSize:10,color:overdueCount>0?"rgba(255,100,100,0.8)":"rgba(77,150,255,0.8)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Задачи</div>
                <div style={{fontSize:30,fontWeight:800,color:overdueCount>0?"#FF6B6B":"#4D96FF",letterSpacing:"-0.03em",lineHeight:1}}>{activeTaskCount}</div>
                {overdueCount>0&&<div style={{fontSize:11,color:"#FF6B6B",marginTop:6,fontWeight:500}}>⚠ {overdueCount} просрочено</div>}
                {todayTaskCount>0&&!overdueCount&&<div style={{fontSize:10,color:"rgba(77,150,255,0.7)",marginTop:6}}>→ {todayTaskCount} на сегодня</div>}
                {!overdueCount&&!todayTaskCount&&<div style={{fontSize:10,color:"rgba(77,150,255,0.5)",marginTop:6}}>активных</div>}
              </div>
            </div>

            {/* Finance wide card */}
            <div onClick={()=>setTab("finance")} style={{background:"linear-gradient(135deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.02) 100%)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:20,padding:"18px 20px",cursor:"pointer",transition:"transform 0.15s",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <div style={{position:"absolute",right:0,top:0,bottom:0,width:80,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.02))"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Баланс · Финансы</div>
                  <div style={{fontSize:28,fontWeight:800,color:totalBalance>=0?"#6BCB77":"#FF6B6B",letterSpacing:"-0.03em"}}>{totalBalance>=0?"+":"−"}{fmt(Math.abs(totalBalance))} ₸</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{MONTHS[new Date().getMonth()]}</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#FF6B6B"}}>−{fmt(monthExp)} ₸</div>
                  <div style={{fontSize:12,color:"#6BCB77"}}>+{fmt(monthInc)} ₸</div>
                  {monthDep>0&&<div style={{fontSize:12,color:"#00D2D3"}}>🏦 {fmt(monthDep)} ₸</div>}
                </div>
              </div>
              {budget>0&&(
                <div style={{marginTop:12}}>
                  <div style={{height:3,background:"rgba(255,255,255,0.1)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${budgetPct}%`,background:budgetColor,borderRadius:2,transition:"width 0.5s"}}/>
                  </div>
                  <div style={{fontSize:10,color:budgetColor,marginTop:4}}>{Math.round(budgetPct)}% бюджета</div>
                </div>
              )}
            </div>

            {/* Quote card */}
            <div style={{background:"linear-gradient(135deg,rgba(199,125,255,0.08) 0%,rgba(77,150,255,0.06) 100%)",border:"1px solid rgba(199,125,255,0.2)",borderRadius:20,padding:"20px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 80% at 90% 50%,rgba(199,125,255,0.06),transparent)",pointerEvents:"none"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(199,125,255,0.7)",letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600}}>✦ фраза дня</div>
                <button onClick={()=>generateQuote(quoteTheme)} disabled={quoteLoading}
                  style={{background:"rgba(199,125,255,0.1)",border:"1px solid rgba(199,125,255,0.2)",borderRadius:8,padding:"4px 10px",color:"rgba(199,125,255,0.8)",cursor:"pointer",fontSize:10,fontFamily:"inherit",transition:"all 0.15s"}}>
                  {quoteLoading?"..." : quoteToday?"↻":"✦ получить"}
                </button>
              </div>
              {quoteLoading&&<div className="pulse" style={{fontSize:13,color:"rgba(255,255,255,0.35)",padding:"10px 0"}}>ИИ генерирует...</div>}
              {!quoteLoading&&quoteToday&&(
                <div>
                  <div style={{fontSize:15,fontWeight:400,lineHeight:1.65,color:"#D0CCE8",fontStyle:"italic",marginBottom:8}}>«{quoteToday.quote}»</div>
                  {quoteToday.author&&<div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:8}}>— {quoteToday.author}</div>}
                  {quoteToday.reflection&&<div style={{fontSize:12,color:"#777",lineHeight:1.5,paddingLeft:10,borderLeft:"2px solid rgba(199,125,255,0.3)"}}>{quoteToday.reflection}</div>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {QUOTE_THEMES.slice(0,4).map(th=>(
                        <button key={th} onClick={()=>{setQuoteTheme(th);generateQuote(th);}}
                          style={{background:quoteTheme===th?"rgba(199,125,255,0.15)":"none",border:`1px solid ${quoteTheme===th?"rgba(199,125,255,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"3px 8px",cursor:"pointer",font:"inherit",fontSize:9,color:quoteTheme===th?"#C77DFF":"#555",transition:"all 0.15s"}}>
                          {th}
                        </button>
                      ))}
                    </div>
                    <button onClick={()=>saveQuote(quoteToday)}
                      style={{background:"none",border:"none",color:savedQuotes.find(s=>s.id===quoteToday.id)?"#FFD93D":"#555",cursor:"pointer",fontSize:14,padding:0,transition:"color 0.15s"}}>
                      {savedQuotes.find(s=>s.id===quoteToday.id)?"★":"☆"}
                    </button>
                  </div>
                </div>
              )}
              {!quoteLoading&&!quoteToday&&(
                <div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.25)",marginBottom:12}}>Начни день с вдохновения</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                    {QUOTE_THEMES.map(th=>(
                      <button key={th} onClick={()=>setQuoteTheme(th)}
                        style={{background:quoteTheme===th?"rgba(199,125,255,0.15)":"none",border:`1px solid ${quoteTheme===th?"rgba(199,125,255,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"3px 8px",cursor:"pointer",font:"inherit",fontSize:9,color:quoteTheme===th?"#C77DFF":"#555"}}>
                        {th}
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>generateQuote(quoteTheme)}
                    style={{background:"rgba(199,125,255,0.12)",border:"1px solid rgba(199,125,255,0.25)",borderRadius:10,padding:"8px 16px",color:"#C77DFF",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:500}}>
                    ✦ получить фразу
                  </button>
                </div>
              )}
            </div>

            {/* Today habits quick */}
            {habits.length>0&&(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:"0.04em"}}>ПРИВЫЧКИ СЕГОДНЯ</div>
                  <button onClick={()=>setTab("habits")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em"}}>все →</button>
                </div>
                {habits.slice(0,4).map(h=>{
                  const done=!!h.checks[getToday()];
                  return(
                    <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{width:28,height:28,borderRadius:8,background:done?h.color+"30":"rgba(255,255,255,0.04)",border:`1.5px solid ${done?h.color+"66":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,transition:"all 0.2s"}}>{h.emoji}</div>
                      <div style={{flex:1,fontSize:13,color:done?"#444":"#C0BDB8",textDecoration:done?"line-through":"none",transition:"all 0.2s"}}>{h.name}</div>
                      <button onClick={()=>toggleHabit(h.id,getToday())} style={{width:28,height:28,borderRadius:8,border:`1.5px solid ${done?h.color:"rgba(255,255,255,0.1)"}`,background:done?h.color:"transparent",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",color:"#0C0C0C",transition:"all 0.2s",flexShrink:0}}>
                        {done&&"✓"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tasks quick */}
            {tasks.filter(t=>!t.done).length>0&&(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:"0.04em"}}>ЗАДАЧИ</div>
                  <button onClick={()=>setTab("tasks")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em"}}>все →</button>
                </div>
                {tasks.filter(t=>!t.done).slice(0,3).map(task=>{
                  const pri=T_PRIORITIES.find(p=>p.id===task.priority);
                  const overdue=isOverdue(task);const dueToday=isDueToday(task);
                  return(
                    <div key={task.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <button className={`check-box${task.done?" done":""}`} onClick={()=>toggleTask(task.id)} style={{marginTop:0}}>{task.done&&"✓"}</button>
                      <div style={{flex:1,fontSize:13,color:overdue?"#FF6B6B":dueToday?"#FFB800":"#C0BDB8"}}>{task.title}</div>
                      <div style={{width:7,height:7,borderRadius:"50%",background:pri?.color,flexShrink:0,boxShadow:`0 0 4px ${pri?.color}`}}/>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent finance */}
            {txns.length>0&&(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:"0.04em"}}>ПОСЛЕДНИЕ ТРАТЫ</div>
                  <button onClick={()=>{setTab("finance");setFTab("history");}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em"}}>все →</button>
                </div>
                {txns.slice(0,3).map(tx=>{
                  const cats=tx.type==="expense"?EXP_CATS:tx.type==="income"?INC_CATS:DEP_CATS;
                  const c=cats.find(c=>c.id===tx.cat)||cats[cats.length-1];
                  return(
                    <div key={tx.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{width:28,height:28,borderRadius:8,background:c.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{c.icon}</div>
                      <div style={{flex:1,fontSize:13,color:"#C0BDB8"}}>{tx.note||c.label}</div>
                      <div style={{fontSize:13,fontWeight:600,color:tx.type==="income"?"#6BCB77":"#FF6B6B"}}>{tx.type==="income"?"+":"−"}{fmt(tx.amount)} ₸</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Saved quotes */}
            {savedQuotes.length>0&&(
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:20,padding:"14px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showSaved?12:0}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:600,letterSpacing:"0.04em"}}>★ СОХРАНЁННЫЕ ФРАЗЫ ({savedQuotes.length})</div>
                  <button onClick={()=>setShowSaved(s=>!s)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{showSaved?"↑":"↓"}</button>
                </div>
                {showSaved&&savedQuotes.map(q=>(
                  <div key={q.id} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:12,fontStyle:"italic",color:"rgba(255,255,255,0.5)",lineHeight:1.5,marginBottom:4}}>«{q.quote}»</div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{q.author&&`— ${q.author}`}</div>
                      <button onClick={()=>unsaveQuote(q.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>удалить</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {habits.length===0&&txns.length===0&&tasks.length===0&&(
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{color:"rgba(255,255,255,0.2)",fontSize:13,lineHeight:1.9}}>Начни с привычек, задач или финансов.</div>
                <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"center",flexWrap:"wrap"}}>
                  <button className="ghost-btn" onClick={()=>setTab("habits")}>◎ Привычки</button>
                  <button className="ghost-btn" onClick={()=>setTab("tasks")}>✓ Задачи</button>
                  <button className="ghost-btn" onClick={()=>setTab("finance")}>◈ Финансы</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HABITS ── */}
      {tab==="habits"&&(
        <div className="fade-in">
          {/* Header */}
          <div style={{position:"relative",padding:"48px 24px 24px",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 50% at 50% 0%,rgba(107,203,119,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>трекер</div>
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:700,lineHeight:1,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#F0EDE8 40%,#6BCB77 120%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Привычки</h2>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:26,fontWeight:800,color:"#6BCB77",lineHeight:1}}>{todayDoneH}<span style={{fontSize:14,color:"rgba(107,203,119,0.5)"}}>/{habits.length}</span></div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>сегодня</div>
                </div>
              </div>

              {/* Week progress bar */}
              {habits.length>0&&(
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <button onClick={()=>setHWeekOffset(o=>o-1)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                      <span style={{fontSize:11,color:isCurrWeek?"#F0EDE8":"#666",letterSpacing:"0.04em"}}>{hWeekOffset===0?"эта неделя":hWeekOffset===-1?"прошлая неделя":`${Math.abs(hWeekOffset)} нед. назад`}</span>
                      <button onClick={()=>setHWeekOffset(o=>o+1)} disabled={hWeekOffset>=0} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",opacity:hWeekOffset>=0?0.2:1}}>›</button>
                    </div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{filteredHabits.reduce((s,h)=>s+weekDates.filter(d=>h.checks[d]).length,0)}<span style={{color:"rgba(255,255,255,0.2)"}}>/{filteredHabits.length*7}</span></div>
                  </div>
                  <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${filteredHabits.length>0?Math.round(filteredHabits.reduce((s,h)=>s+weekDates.filter(d=>h.checks[d]).length,0)/(filteredHabits.length*7)*100):0}%`,background:"linear-gradient(90deg,#6BCB77,#4D96FF)",borderRadius:2,transition:"width 0.5s"}}/>
                  </div>
                </div>
              )}

              {/* Category pills */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
                {H_CATS.map(c=>{
                  const count=c.id==="all"?habits.length:habits.filter(h=>h.category===c.id).length;
                  if(c.id!=="all"&&count===0)return null;
                  const isActive=hCatFilter===c.id;
                  return(
                    <button key={c.id} onClick={()=>setHCatFilter(c.id)} style={{background:isActive?"rgba(107,203,119,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${isActive?"rgba(107,203,119,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:20,padding:"6px 13px",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:isActive?"#6BCB77":"#666",whiteSpace:"nowrap",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
                      <span>{c.icon}</span>{c.label}{count>0&&<span style={{opacity:0.5,fontSize:10}}>({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Day labels */}
          {filteredHabits.length>0&&(
            <div style={{display:"flex",gap:6,paddingLeft:"calc(24px + 44px + 12px)",paddingRight:50,marginBottom:6,marginTop:-4}}>
              {DAYS.map((d,i)=>(
                <div key={d} style={{flex:1,textAlign:"center",fontSize:10,color:isCurrWeek&&i===todayIdx?"#F0EDE8":"#333",fontWeight:isCurrWeek&&i===todayIdx?700:400,letterSpacing:"0.04em"}}>
                  {d}
                  {isCurrWeek&&i===todayIdx&&<div style={{width:3,height:3,borderRadius:"50%",background:"#6BCB77",margin:"2px auto 0",boxShadow:"0 0 4px #6BCB77"}}/>}
                </div>
              ))}
            </div>
          )}

          {/* Habit list */}
          <div style={{padding:"4px 16px 24px",display:"flex",flexDirection:"column",gap:8}}>
            {!loaded
              ?<div className="pulse" style={{textAlign:"center",color:"rgba(255,255,255,0.2)",padding:"40px 0",fontSize:13}}>загрузка...</div>
              :filteredHabits.length===0&&!hAdding
                ?<div style={{textAlign:"center",padding:"50px 0"}}><div style={{fontSize:44,marginBottom:14}}>🌱</div><div style={{color:"rgba(255,255,255,0.25)",fontSize:13,lineHeight:1.8}}>Нет привычек.<br/>Добавь первую!</div></div>
                :filteredHabits.map(h=>{
                  const streak=getStreak(h);
                  const todayDone=!!h.checks[getToday()];
                  return(
                    <div key={h.id} style={{background:todayDone?`linear-gradient(135deg,${h.color}14,${h.color}06)`:"rgba(255,255,255,0.03)",border:`1px solid ${todayDone?h.color+"33":"rgba(255,255,255,0.1)"}`,borderRadius:16,padding:"12px 14px",transition:"all 0.2s",display:"flex",alignItems:"center",gap:10}}>
                      {/* Emoji */}
                      <div style={{width:40,height:40,borderRadius:12,background:h.color+"20",border:`1.5px solid ${h.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,boxShadow:todayDone?`0 0 12px ${h.color}33`:"none",transition:"box-shadow 0.3s"}}>{h.emoji}</div>
                      {/* Name + streak */}
                      <div style={{width:100,flexShrink:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:todayDone?"#F0EDE8":"#C0BDB8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.name}</div>
                        <div style={{fontSize:10,marginTop:2,color:streak>0?h.color:"rgba(255,255,255,0.25)"}}>{streak>0?`🔥 ${streak} дн.`:"начни серию"}</div>
                      </div>
                      {/* Checkboxes */}
                      {weekDates.map((date,i)=>{
                        const done=!!h.checks[date];
                        const isToday=isCurrWeek&&i===todayIdx;
                        return(
                          <button key={date} onClick={()=>toggleHabit(h.id,date)}
                            style={{flex:1,aspectRatio:"1",maxWidth:34,borderRadius:9,border:`1.5px solid ${done?h.color:isToday?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.1)"}`,background:done?h.color+"25":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:h.color,transition:"all 0.15s",flexShrink:0}}>
                            {done&&"✓"}
                          </button>
                        );
                      })}
                      <button className="del-btn" onClick={()=>deleteHabit(h.id)} style={{marginLeft:2}}>×</button>
                    </div>
                  );
                })
            }

            {/* Add form */}
            {hAdding?(
              <div className="fade-in" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(107,203,119,0.2)",borderRadius:18,padding:18,marginTop:4}}>
                <div style={{fontSize:10,color:"#6BCB77",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12,fontWeight:600}}>Новая привычка</div>
                <input className="input-f" placeholder="Название привычки..." value={hName} onChange={e=>setHName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addHabit()} autoFocus style={{marginBottom:12,fontSize:15}}/>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Категория</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                  {H_CATS.slice(1).map(c=>(
                    <button key={c.id} onClick={()=>setHCat(c.id)} style={{background:hCat===c.id?"rgba(107,203,119,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${hCat===c.id?"rgba(107,203,119,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:16,padding:"5px 11px",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:hCat===c.id?"#6BCB77":"#666",transition:"all 0.15s"}}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Эмодзи</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                  {H_EMOJIS.map(em=>(
                    <button key={em} onClick={()=>setHEmoji(em)} style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${hEmoji===em?"rgba(255,255,255,0.4)":"transparent"}`,background:hEmoji===em?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                      {em}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Цвет</div>
                <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                  {H_COLORS.map(c=>(
                    <div key={c} onClick={()=>setHColor(c)} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",transition:"transform 0.15s",transform:hColor===c?"scale(1.35)":"scale(1)",border:hColor===c?"2px solid white":"2px solid transparent",flexShrink:0}}/>
                  ))}
                </div>
                {/* Preview */}
                {hName&&(
                  <div style={{background:hColor+"15",border:`1px solid ${hColor}33`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:9,background:hColor+"25",border:`1.5px solid ${hColor}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{hEmoji}</div>
                    <div style={{fontSize:13,fontWeight:600,color:hColor}}>{hName}</div>
                  </div>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button className="primary-btn" style={{maxWidth:140,background:hColor,color:"#fff"}} onClick={addHabit}>Добавить</button>
                  <button className="ghost-btn" onClick={()=>{setHAdding(false);setHName("");}}>Отмена</button>
                </div>
              </div>
            ):(
              <button onClick={()=>setHAdding(true)} style={{background:"rgba(107,203,119,0.06)",border:"1.5px dashed rgba(107,203,119,0.2)",borderRadius:16,padding:"13px",fontFamily:"inherit",fontSize:12,color:"rgba(107,203,119,0.5)",cursor:"pointer",transition:"all 0.2s",width:"100%",letterSpacing:"0.06em",marginTop:4}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(107,203,119,0.1)";e.currentTarget.style.borderColor="rgba(107,203,119,0.4)";e.currentTarget.style.color="rgba(107,203,119,0.9)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(107,203,119,0.06)";e.currentTarget.style.borderColor="rgba(107,203,119,0.2)";e.currentTarget.style.color="rgba(107,203,119,0.5)"}}>
                + добавить привычку
              </button>
            )}
          </div>
        </div>
      )}


      {/* ── TASKS ── */}
      {tab==="tasks"&&(
        <div className="fade-in">
          <div style={{position:"relative",padding:"48px 24px 20px",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 50% at 50% 0%,rgba(77,150,255,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>список</div>
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:700,lineHeight:1,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#F0EDE8 40%,#4D96FF 120%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Задачи</h2>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:26,fontWeight:800,color:overdueCount>0?"#FF6B6B":"#4D96FF",lineHeight:1}}>{activeTaskCount}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>активных</div>
                </div>
              </div>
              {tasks.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",marginBottom:5}}>
                    <div style={{height:"100%",width:`${Math.round(doneTaskCount/tasks.length*100)}%`,background:"linear-gradient(90deg,#4D96FF,#C77DFF)",borderRadius:2,transition:"width 0.5s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.25)"}}>
                    <span>{doneTaskCount} выполнено</span><span>{Math.round(doneTaskCount/tasks.length*100)}%</span>
                  </div>
                </div>
              )}
              {overdueCount>0&&(
                <div style={{background:"rgba(255,68,68,0.08)",border:"1px solid rgba(255,68,68,0.2)",borderRadius:12,padding:"9px 14px",marginBottom:12,fontSize:11,color:"#FF6B6B",display:"flex",alignItems:"center",gap:8}}>
                  <span>⚠</span> {overdueCount} просроченных задач
                </div>
              )}
              <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                {[["active","Активные"],["today","Сегодня"],["done","Выполненные"]].map(([id,label])=>{
                  const isAct=tFilter===id;
                  return(
                    <button key={id} onClick={()=>setTFilter(id)} style={{background:isAct?"rgba(77,150,255,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${isAct?"rgba(77,150,255,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:20,padding:"6px 13px",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:isAct?"#4D96FF":"#666",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
                      {label}{id==="today"&&todayTaskCount>0&&<span style={{background:"#FFB800",color:"#0C0C0C",borderRadius:"50%",width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{todayTaskCount}</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
                {[{id:"all",label:"Все",icon:"◈"},...T_CATS].map(c=>{
                  const count=c.id==="all"?tasks.length:tasks.filter(t=>t.cat===c.id).length;
                  if(c.id!=="all"&&count===0)return null;
                  const isAct=tCatFilter===c.id;
                  return(<button key={c.id} onClick={()=>setTCatFilter(c.id)} style={{background:isAct?"rgba(77,150,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${isAct?"rgba(77,150,255,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:18,padding:"5px 11px",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:isAct?"#4D96FF":"#555",whiteSpace:"nowrap",transition:"all 0.15s"}}>{c.icon} {c.label}</button>);
                })}
              </div>
            </div>
          </div>
          <div style={{padding:"8px 16px 40px",display:"flex",flexDirection:"column",gap:8}}>
            {tAdding?(
              <div className="fade-in" style={{background:"rgba(77,150,255,0.06)",border:"1px solid rgba(77,150,255,0.2)",borderRadius:18,padding:18,marginBottom:4}}>
                <div style={{fontSize:10,color:"#4D96FF",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12,fontWeight:600}}>{tEditId?"Редактировать":"Новая задача"}</div>
                <input className="input-f" placeholder="Название задачи..." value={tTitle} onChange={e=>setTTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveTask()} autoFocus style={{marginBottom:12,fontSize:15}}/>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Приоритет</div>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  {T_PRIORITIES.map(p=>(<button key={p.id} onClick={()=>setTPriority(p.id)} style={{background:tPriority===p.id?p.color+"18":"rgba(255,255,255,0.04)",border:`1.5px solid ${tPriority===p.id?p.color:"rgba(255,255,255,0.08)"}`,borderRadius:10,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:tPriority===p.id?p.color:"rgba(255,255,255,0.35)",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}><span style={{color:p.color,fontSize:8}}>●</span>{p.label}</button>))}
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Категория</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                  {T_CATS.map(c=>(<button key={c.id} onClick={()=>setTCat(c.id)} style={{background:tCat===c.id?"rgba(77,150,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${tCat===c.id?"rgba(77,150,255,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:14,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:tCat===c.id?"#4D96FF":"#555",transition:"all 0.15s"}}>{c.icon} {c.label}</button>))}
                </div>
                <input className="input-f" type="date" value={tDeadline} onChange={e=>setTDeadline(e.target.value)} style={{marginBottom:10,width:"auto"}}/>
                <textarea className="input-f" rows={2} placeholder="Заметка..." value={tNote} onChange={e=>setTNote(e.target.value)} style={{marginBottom:14,resize:"none"}}/>
                <div style={{display:"flex",gap:8}}>
                  <button className="primary-btn" style={{maxWidth:140,background:"#4D96FF"}} onClick={saveTask}>{tEditId?"Сохранить":"Добавить"}</button>
                  <button className="ghost-btn" onClick={resetTaskForm}>Отмена</button>
                </div>
              </div>
            ):(
              <button onClick={()=>setTAdding(true)} style={{background:"rgba(77,150,255,0.05)",border:"1.5px dashed rgba(77,150,255,0.2)",borderRadius:16,padding:"13px",fontFamily:"inherit",fontSize:12,color:"rgba(77,150,255,0.5)",cursor:"pointer",transition:"all 0.2s",width:"100%",letterSpacing:"0.06em"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(77,150,255,0.1)";e.currentTarget.style.color="rgba(77,150,255,0.9)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(77,150,255,0.05)";e.currentTarget.style.color="rgba(77,150,255,0.5)"}}>
                + добавить задачу
              </button>
            )}
            {visibleTasks.length===0&&!tAdding&&(
              <div style={{textAlign:"center",padding:"50px 0"}}><div style={{fontSize:36,marginBottom:12,color:"rgba(255,255,255,0.15)"}}>—</div><div style={{color:"rgba(255,255,255,0.25)",fontSize:13}}>{tFilter==="done"?"Нет выполненных":tFilter==="today"?"Нет задач на сегодня":"Нет активных задач"}</div></div>
            )}
            {visibleTasks.map(task=>{
              const pri=T_PRIORITIES.find(p=>p.id===task.priority);
              const cat=T_CATS.find(c=>c.id===task.cat);
              const overdue=isOverdue(task);const dueToday=isDueToday(task);
              return(
                <div key={task.id} style={{background:task.done?"rgba(255,255,255,0.02)":overdue?"rgba(255,68,68,0.06)":dueToday?"rgba(255,184,0,0.06)":"rgba(255,255,255,0.04)",border:`1px solid ${overdue?"rgba(255,68,68,0.2)":dueToday&&!task.done?"rgba(255,184,0,0.2)":"rgba(255,255,255,0.1)"}`,borderRadius:16,padding:"14px 16px",transition:"all 0.2s",borderLeft:overdue?"3px solid #FF4444":dueToday&&!task.done?"3px solid #FFB800":"1px solid rgba(255,255,255,0.07)"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <button onClick={()=>toggleTask(task.id)} style={{width:22,height:22,borderRadius:6,border:`1.5px solid ${task.done?"#4D96FF":"rgba(255,255,255,0.15)"}`,background:task.done?"#4D96FF":"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",transition:"all 0.2s",marginTop:1}}>
                      {task.done&&"✓"}
                    </button>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:7}}>
                        <div style={{fontSize:14,fontWeight:500,color:task.done?"#444":"#D8D5D0",textDecoration:task.done?"line-through":"none",flex:1,lineHeight:1.35}}>{task.title}</div>
                        <div style={{display:"flex",gap:4,flexShrink:0}}>
                          {!task.done&&<button onClick={()=>startEditTask(task)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:11,fontFamily:"inherit",padding:"2px 5px",borderRadius:4}}>ред.</button>}
                          <button className="del-btn" onClick={()=>deleteTask(task.id)}>×</button>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{background:pri.color+"15",color:pri.color,border:`1px solid ${pri.color}25`,borderRadius:6,padding:"2px 8px",fontSize:10,display:"inline-flex",alignItems:"center",gap:3}}><span style={{fontSize:7}}>●</span>{pri.label}</span>
                        {cat&&<span style={{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.4)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,padding:"2px 8px",fontSize:10}}>{cat.icon} {cat.label}</span>}
                        {task.deadline&&<span style={{background:overdue?"rgba(255,68,68,0.1)":dueToday?"rgba(255,184,0,0.1)":"rgba(255,255,255,0.04)",color:overdue?"#FF6B6B":dueToday?"#FFB800":"#555",border:`1px solid ${overdue?"rgba(255,68,68,0.2)":dueToday?"rgba(255,184,0,0.25)":"rgba(255,255,255,0.1)"}`,borderRadius:6,padding:"2px 8px",fontSize:10}}>{overdue?"⚠ ":dueToday?"→ ":""}{formatDate(task.deadline)}</span>}
                      </div>
                      {task.note&&<div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.35)",borderLeft:"2px solid rgba(255,255,255,0.08)",paddingLeft:9,lineHeight:1.5,fontStyle:"italic"}}>{task.note}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FINANCE ── */}
      {tab==="finance"&&(
        <div className="fade-in">
          <div style={{position:"relative",padding:"48px 24px 0",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 50% at 50% 0%,rgba(107,203,119,0.08) 0%,rgba(255,107,107,0.05) 100%)",pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>трекер</div>
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:6}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:700,lineHeight:1,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#F0EDE8 30%,#6BCB77 120%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Финансы</h2>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>баланс</div>
                  <div style={{fontSize:22,fontWeight:800,color:totalBalance>=0?"#6BCB77":"#FF6B6B",letterSpacing:"-0.03em"}}>{totalBalance>=0?"+":"−"}{fmt(Math.abs(totalBalance))} ₸</div>
                </div>
              </div>
              <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(255,255,255,0.07)",marginTop:16}}>
                {[["overview","Обзор"],["add","+ Добавить"],["history","История"]].map(([id,label])=>(
                  <button key={id} onClick={()=>setFTab(id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"10px 0",fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:fTab===id?"#F0EDE8":"#444",borderBottom:`2px solid ${fTab===id?"#6BCB77":"transparent"}`,transition:"all 0.2s"}}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{padding:"16px 16px 40px"}}>
            {fTab==="overview"&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
                  {monthsAvail.slice(0,6).map(m=>{const[y,mo]=m.split("-");const isAct=fMonth===m;return(
                    <button key={m} onClick={()=>setFMonth(m)} style={{background:isAct?"rgba(107,203,119,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${isAct?"rgba(107,203,119,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:18,padding:"5px 12px",cursor:"pointer",font:"inherit",fontSize:11,color:isAct?"#6BCB77":"#555",whiteSpace:"nowrap",transition:"all 0.15s"}}>
                      {MONTHS[parseInt(mo)-1]} {y}
                    </button>
                  );})}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div style={{background:"linear-gradient(135deg,rgba(107,203,119,0.1),rgba(107,203,119,0.04))",border:"1px solid rgba(107,203,119,0.2)",borderRadius:18,padding:"14px"}}>
                    <div style={{fontSize:9,color:"rgba(107,203,119,0.7)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Доходы</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#6BCB77",letterSpacing:"-0.02em"}}>+{fmt(monthInc)} ₸</div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,rgba(255,107,107,0.1),rgba(255,107,107,0.04))",border:"1px solid rgba(255,107,107,0.2)",borderRadius:18,padding:"14px"}}>
                    <div style={{fontSize:9,color:"rgba(255,107,107,0.7)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Расходы</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#FF6B6B",letterSpacing:"-0.02em"}}>−{fmt(monthExp)} ₸</div>
                  </div>
                  <div style={{background:"linear-gradient(135deg,rgba(0,210,211,0.1),rgba(0,210,211,0.04))",border:"1px solid rgba(0,210,211,0.2)",borderRadius:18,padding:"14px"}}>
                    <div style={{fontSize:9,color:"rgba(0,210,211,0.7)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Депозит</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#00D2D3",letterSpacing:"-0.02em"}}>🏦 {fmt(monthDep)} ₸</div>
                    {totalDeposit>0&&<div style={{fontSize:9,color:"rgba(0,210,211,0.5)",marginTop:4}}>всего {fmt(totalDeposit)} ₸</div>}
                  </div>
                </div>
                <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:budget>0?12:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#C0BDB8"}}>Бюджет месяца</div>
                    {!editBudget?(
                      <button onClick={()=>{setBudgetInput(budget||"");setEditBudget(true);}} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"4px 10px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>{budget>0?"изменить":"задать"}</button>
                    ):(
                      <div style={{display:"flex",gap:6}}>
                        <input value={budgetInput} onChange={e=>setBudgetInput(e.target.value)} placeholder="сумма" autoFocus style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"4px 10px",color:"#F0EDE8",font:"inherit",fontSize:12,width:90,outline:"none"}}/>
                        <button onClick={()=>{setBudget(parseFloat(budgetInput)||0);setEditBudget(false);}} style={{background:"rgba(107,203,119,0.15)",border:"1px solid rgba(107,203,119,0.3)",borderRadius:8,padding:"4px 10px",color:"#6BCB77",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✓</button>
                      </div>
                    )}
                  </div>
                  {budget>0&&(<>
                    <div style={{height:6,background:"rgba(255,255,255,0.1)",borderRadius:3,overflow:"hidden",marginBottom:7}}>
                      <div style={{height:"100%",width:`${budgetPct}%`,background:budgetColor,borderRadius:3,transition:"width 0.5s"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                      <span style={{color:budgetColor,fontWeight:500}}>{fmt(monthExp)} ₸ потрачено</span>
                      <span style={{color:"rgba(255,255,255,0.25)"}}>{fmt(budget)} ₸ лимит</span>
                    </div>
                    {budgetPct>90&&<div style={{fontSize:11,color:"#FF6B6B",marginTop:7}}>⚠️ Бюджет почти исчерпан!</div>}
                  </>)}
                  {budget===0&&!editBudget&&<div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:4}}>Задай лимит расходов</div>}
                </div>
                {pieData.length>0&&(
                  <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"16px 18px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:"0.04em",marginBottom:12,textTransform:"uppercase"}}>Структура расходов</div>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">{pieData.map((e,i)=><Cell key={i} fill={e.color} strokeWidth={0}/>)}</Pie><Tooltip content={<ChartTooltip/>}/></PieChart>
                    </ResponsiveContainer>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                      {pieData.map(c=>(<div key={c.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#777"}}><div style={{width:7,height:7,borderRadius:"50%",background:c.color,flexShrink:0}}/>{c.icon} {c.name} <span style={{color:c.color,fontWeight:700}}>{Math.round(c.value/monthExp*100)}%</span></div>))}
                    </div>
                  </div>
                )}
                <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"16px 18px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:"0.04em",marginBottom:12,textTransform:"uppercase"}}>6 месяцев</div>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={barData} barSize={11} barGap={3}>
                      <XAxis dataKey="name" tick={{fontSize:10,fill:"#444",fontFamily:"Outfit"}} axisLine={false} tickLine={false}/>
                      <YAxis hide/><Tooltip content={<ChartTooltip/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
                      <Bar dataKey="Доходы" fill="#6BCB77" radius={[4,4,0,0]}/><Bar dataKey="Расходы" fill="#FF6B6B" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {txns.length===0&&<div style={{textAlign:"center",padding:"30px 0"}}><div style={{fontSize:40,marginBottom:12}}>💰</div><div style={{color:"rgba(255,255,255,0.25)",fontSize:13,marginBottom:14}}>Нет записей</div><button onClick={()=>setFTab("add")} style={{background:"rgba(107,203,119,0.1)",border:"1px solid rgba(107,203,119,0.2)",borderRadius:12,padding:"10px 20px",color:"#6BCB77",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>+ Добавить</button></div>}
              </div>
            )}
            {fTab==="add"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:14,padding:4,gap:4}}>
                  <button onClick={()=>{setFType("expense");setFCat("food");}} style={{flex:1,border:"none",borderRadius:10,padding:"9px 4px",fontFamily:"inherit",fontSize:12,cursor:"pointer",transition:"all 0.2s",fontWeight:600,background:fType==="expense"?"rgba(255,107,107,0.2)":"none",color:fType==="expense"?"#FF6B6B":"#555"}}>− Расход</button>
                  <button onClick={()=>{setFType("income");setFCat("salary");}} style={{flex:1,border:"none",borderRadius:10,padding:"9px 4px",fontFamily:"inherit",fontSize:12,cursor:"pointer",transition:"all 0.2s",fontWeight:600,background:fType==="income"?"rgba(107,203,119,0.2)":"none",color:fType==="income"?"#6BCB77":"#555"}}>+ Доход</button>
                  <button onClick={()=>{setFType("deposit");setFCat("bank");}} style={{flex:1,border:"none",borderRadius:10,padding:"9px 4px",fontFamily:"inherit",fontSize:12,cursor:"pointer",transition:"all 0.2s",fontWeight:600,background:fType==="deposit"?"rgba(0,210,211,0.2)":"none",color:fType==="deposit"?"#00D2D3":"#555"}}>🏦 Депозит</button>
                </div>
                <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"20px"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Сумма</div>
                  <div style={{position:"relative"}}>
                    <input className="input-f" type="number" placeholder="0" value={fAmount} onChange={e=>setFAmount(e.target.value)} autoFocus style={{fontSize:28,fontWeight:800,paddingRight:40,background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.1)",borderRadius:0,paddingLeft:0,color:fType==="expense"?"#FF6B6B":fType==="deposit"?"#00D2D3":"#6BCB77"}}/>
                    <span style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",fontSize:20,color:"rgba(255,255,255,0.25)"}}>₸</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Категория</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {(fType==="expense"?EXP_CATS:fType==="income"?INC_CATS:DEP_CATS).map(c=>(
                      <button key={c.id} onClick={()=>setFCat(c.id)} style={{background:fCat===c.id?c.color+"20":"rgba(255,255,255,0.04)",border:`1.5px solid ${fCat===c.id?c.color:"rgba(255,255,255,0.1)"}`,borderRadius:14,padding:"7px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12,color:fCat===c.id?c.color:"rgba(255,255,255,0.4)",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
                        {c.icon} {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input className="input-f" placeholder="Заметка..." value={fNote} onChange={e=>setFNote(e.target.value)}/>
                <input className="input-f" type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={{width:"auto"}}/>
                <button onClick={addTxn} disabled={!fAmount} style={{background:fType==="expense"?"#FF6B6B":fType==="deposit"?"#00D2D3":"#6BCB77",color:fType==="expense"?"#fff":"#0C0C0C",border:"none",borderRadius:14,padding:"14px",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer",opacity:!fAmount?0.4:1,transition:"all 0.2s"}}>
                  Сохранить {fAmount&&`${fType==="expense"?"−":"+"}${fmt(parseFloat(fAmount)||0)} ₸`}
                </button>
              </div>
            )}
            {fTab==="history"&&(
              <div>
                <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:2,scrollbarWidth:"none"}}>
                  {monthsAvail.slice(0,6).map(m=>{const[y,mo]=m.split("-");const isAct=fMonth===m;return(
                    <button key={m} onClick={()=>setFMonth(m)} style={{background:isAct?"rgba(107,203,119,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${isAct?"rgba(107,203,119,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:18,padding:"5px 12px",cursor:"pointer",font:"inherit",fontSize:11,color:isAct?"#6BCB77":"#555",whiteSpace:"nowrap",transition:"all 0.15s"}}>
                      {MONTHS[parseInt(mo)-1]} {y}
                    </button>
                  );})}
                </div>
                {monthTxns.length===0?<div style={{textAlign:"center",padding:"30px 0",color:"rgba(255,255,255,0.25)",fontSize:13}}>Нет транзакций</div>:(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {monthTxns.map(tx=>{
                      const cats=tx.type==="expense"?EXP_CATS:tx.type==="income"?INC_CATS:DEP_CATS;
                      const c=cats.find(c=>c.id===tx.cat)||cats[cats.length-1];
                      return(
                        <div key={tx.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                          <div style={{width:38,height:38,borderRadius:11,background:c.color+"18",border:`1px solid ${c.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:500,color:"#C0BDB8"}}>{tx.note||c.label}</div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:2}}>{c.label} · {tx.date}</div>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:tx.type==="income"?"#6BCB77":tx.type==="deposit"?"#00D2D3":"#FF6B6B",flexShrink:0,marginRight:4}}>{tx.type==="income"?"+":tx.type==="deposit"?"🏦 ":"−"}{fmt(tx.amount)} ₸</div>
                          <button className="del-btn" onClick={()=>setTxns(p=>p.filter(t=>t.id!==tx.id))}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GAME TAB ── */}
      {tab==="game"&&(
        <div className="fade-in">
          <div style={{position:"relative",padding:"48px 24px 24px",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 50% at 50% 0%,rgba(255,215,0,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>прогресс</div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:700,lineHeight:1,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#F0EDE8 30%,#FFD700 120%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Уровень</h2>
            </div>
          </div>
          <div style={{padding:"0 16px 100px",display:"flex",flexDirection:"column",gap:12}}>
            {/* Level card */}
            <div style={{background:"linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,215,0,0.04))",border:"1px solid rgba(255,215,0,0.25)",borderRadius:20,padding:"24px 20px",textAlign:"center",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 0%,rgba(255,215,0,0.1),transparent 60%)",pointerEvents:"none"}}/>
              <CharacterSprite level={curLvl.level} size={160}/>
              <div style={{fontSize:12,color:"rgba(255,215,0,0.7)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:4}}>Уровень {curLvl.level}</div>
              <div style={{fontSize:26,fontWeight:800,color:"#FFD700",marginBottom:4}}>{curLvl.name}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:16}}>{totalXP} XP</div>
              <div style={{height:8,background:"rgba(255,255,255,0.1)",borderRadius:4,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${xpPct}%`,background:"linear-gradient(90deg,#FFB800,#FFD700)",borderRadius:4,transition:"width 0.8s ease",boxShadow:"0 0 8px rgba(255,215,0,0.5)"}}/>
              </div>
              {curLvl.level<10&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,0.35)"}}><span>{totalXP} XP</span><span>до {nxtLvl.name}: {nxtLvl.xpNeeded-totalXP} XP</span></div>}
              {curLvl.level===10&&<div style={{fontSize:12,color:"#FFD700"}}>✦ Максимальный уровень!</div>}
            </div>
            {/* XP sources */}
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:18,padding:"16px 18px"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Как зарабатывать XP</div>
              {[{icon:"◎",label:"Привычка выполнена",xp:"+10"},{icon:"🔥",label:"Серия 7 дней",xp:"+50"},{icon:"💎",label:"Серия 30 дней",xp:"+200"},{icon:"✓",label:"Задача выполнена",xp:"+20"},{icon:"◈",label:"Запись в финансах",xp:"+15"}].map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <span style={{fontSize:16,width:24,textAlign:"center"}}>{s.icon}</span>
                  <span style={{flex:1,fontSize:13,color:"rgba(255,255,255,0.7)"}}>{s.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#FFD700"}}>{s.xp} XP</span>
                </div>
              ))}
            </div>
            {/* Levels list */}
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:18,padding:"16px 18px"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Все уровни</div>
              {G_LEVELS.map(l=>{
                const isAct=l.level===curLvl.level;const done=totalXP>=l.xpNeeded;
                return(<div key={l.level} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",opacity:done?1:0.4}}>
                  <div style={{width:32,height:32,borderRadius:10,background:isAct?"rgba(255,215,0,0.2)":done?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.04)",border:`1.5px solid ${isAct?"#FFD700":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}><span style={{fontSize:14}}>{l.icon}</span></div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:isAct?700:400,color:isAct?"#FFD700":"rgba(255,255,255,0.7)"}}>{l.name}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:1}}>Ур. {l.level} · {l.xpNeeded} XP</div></div>
                  {done&&<span style={{fontSize:14,color:"#FFD700"}}>✓</span>}
                </div>);
              })}
            </div>
            {/* Earned badges */}
            {earnedB.length>0&&(
              <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:18,padding:"16px 18px"}}>
                <div style={{fontSize:11,color:"rgba(255,215,0,0.7)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>🏅 Получено: {earnedB.length}/{G_BADGES.length}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {earnedB.map(b=>(<div key={b.id} style={{background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:22}}>{b.icon}</span>
                    <div><div style={{fontSize:12,fontWeight:600,color:"#FFD700"}}>{b.name}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{b.desc}</div></div>
                  </div>))}
                </div>
              </div>
            )}
            {/* Locked badges */}
            {lockedB.length>0&&(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"16px 18px"}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>🔒 Ещё не получено</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {lockedB.map(b=>(<div key={b.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,opacity:0.5}}>
                    <span style={{fontSize:22,filter:"grayscale(1)"}}>{b.icon}</span>
                    <div><div style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.5)"}}>{b.name}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:1}}>{b.desc}</div></div>
                  </div>))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── AI ADVISOR FLOATING BUTTON + CHAT ── */}
      {(()=>{
      
  // REMINDERS
  async function requestNotifPermission() {
    if(!("Notification" in window)) { alert("Уведомления не поддерживаются"); return "denied"; }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    return perm;
  }

  async function toggleReminders(newTime) {
    const t = newTime || reminderTime;
    if(!remindersOn) {
      const perm = (typeof Notification !== "undefined" && Notification.permission === "granted")
        ? "granted" : await requestNotifPermission();
      if(perm !== "granted") return;
      setRemindersOn(true);
      setReminderTime(t);
      await storage.set("lt-reminder", JSON.stringify({on:true, time:t}));
      scheduleReminder(t);
    } else {
      setRemindersOn(false);
      if(reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
      await storage.set("lt-reminder", JSON.stringify({on:false, time:t}));
    }
  }

  function scheduleReminder(time) {
    const parts = time.split(":");
    const h = parseInt(parts[0]); const m = parseInt(parts[1]);
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if(next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    if(reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    reminderTimerRef.current = setTimeout(() => {
      sendReminderNotif();
      scheduleReminder(time);
    }, ms);
  }

  function sendReminderNotif() {
    if(typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = getToday();
    const undone = habits.filter(h => !h.checks[today]);
    const activeTsk = tasks.filter(t => !t.done);
    const overdue = tasks.filter(t => isOverdue(t));
    let body = "";
    if(undone.length > 0) body += "Привычки: " + undone.map(h=>h.name).join(", ") + ". ";
    if(overdue.length > 0) body += "Просрочено: " + overdue.map(t=>t.title).slice(0,2).join(", ") + ".";
    else if(activeTsk.length > 0) body += "Задачи: " + activeTsk.slice(0,2).map(t=>t.title).join(", ") + ".";
    if(!body) body = "Все привычки и задачи выполнены! Отлично!";
    new Notification("Forma", { body, icon: "/favicon.ico", badge: "/favicon.ico" });
  }

  useEffect(() => {
    if(typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    storage.get("lt-reminder").then(r => {
      if(r && r.value) {
        try {
          const s = JSON.parse(r.value);
          setReminderTime(s.time || "20:00");
          if(s.on && typeof Notification !== "undefined" && Notification.permission === "granted") {
            setRemindersOn(true);
            scheduleReminder(s.time || "20:00");
          }
        } catch(e){}
      }
    }).catch(()=>{});
  }, []);

  // scroll to bottom
        // eslint-disable-next-line react-hooks/exhaustive-deps

        async function sendMessage() {
          if(!aiInput.trim()||aiLoading) return;
          const userMsg = aiInput.trim();
          setAiInput("");
          setAiMessages(p=>[...p,{role:"user",text:userMsg}]);
          setAiLoading(true);

          // Build context from user data
          const todayHabits = habits.filter(h=>h.checks[getToday()]).length;
          const activeTasks = tasks.filter(t=>!t.done);
          const overdueTasks = tasks.filter(t=>isOverdue(t));
          const monthExpense = txns.filter(t=>getMonthKey(t.date)===getCurrentMonthKey()&&t.type==="expense").reduce((s,t)=>s+t.amount,0);
          const monthIncome = txns.filter(t=>getMonthKey(t.date)===getCurrentMonthKey()&&t.type==="income").reduce((s,t)=>s+t.amount,0);
          const context = `Имя пользователя: ${userName||"неизвестно"}. Данные на сегодня (${getToday()}):
- Привычки: ${todayHabits}/${habits.length} выполнено сегодня
- Список привычек: ${habits.map(h=>`${h.name}(серия:${getStreak(h)}дн)`).join(", ")||"нет"}
- Активные задачи: ${activeTasks.length}, просрочено: ${overdueTasks.length}
- Задачи: ${activeTasks.slice(0,5).map(t=>`${t.title}(${t.priority})`).join(", ")||"нет"}
- Финансы за месяц: доходы ${monthIncome}₸, расходы ${monthExpense}₸
- XP: ${totalXP}, уровень: ${curLvl.level} (${curLvl.name})
- Бейджей: ${earnedB.length}/${G_BADGES.length}`;

          try {
            const todayH = habits.filter(h=>h.checks[getToday()]).length;
            const actT = tasks.filter(t=>!t.done).length;
            const mExp = txns.filter(t=>getMonthKey(t.date)===getCurrentMonthKey()&&t.type==="expense").reduce((s,t)=>s+t.amount,0);
            const mInc = txns.filter(t=>getMonthKey(t.date)===getCurrentMonthKey()&&t.type==="income").reduce((s,t)=>s+t.amount,0);
            const sysPrompt = "Your name is Aza. Personal AI advisor in Forma app. "
              +"User: "+(userName||"friend")+". "
              +"Habits today: "+todayH+"/"+habits.length+". "
              +"Active tasks: "+actT+". "
              +"Income: "+mInc+", expenses: "+mExp+". "
              +"Level "+curLvl.level+" "+curLvl.name+". "
              +"Reply ONLY in Russian. 2-3 sentences max. Motivating, use 1 emoji. Call user by name.";
            const todayH = habits.filter(h=>h.checks[getToday()]).length;
            const actT = tasks.filter(t=>!t.done).length;
            const mExp = txns.filter(t=>getMonthKey(t.date)===getCurrentMonthKey()&&t.type==="expense").reduce((s,t)=>s+t.amount,0);
            const mInc = txns.filter(t=>getMonthKey(t.date)===getCurrentMonthKey()&&t.type==="income").reduce((s,t)=>s+t.amount,0);
            const sysPrompt = "You are Aza, personal AI advisor in Forma app. "
              +"User: "+(userName||"friend")+". "
              +"Habits today: "+todayH+"/"+habits.length+". "
              +"Active tasks: "+actT+". "
              +"Income: "+mInc+", expenses: "+mExp+". "
              +"Level "+curLvl.level+". "
              +"Reply ONLY in Russian. 2-3 sentences. Motivating, 1 emoji.";
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ system: sysPrompt, message: userMsg })
            });
            const data = await response.json();
            const text = data.text || data.error || "Нет ответа";
            setAiMessages(p => [...p, { role: "assistant", text }]);
          } catch(err) {
            setAiMessages(p => [...p, { role: "assistant", text: "Ошибка: " + err.message }]);
          }
          setAiLoading(false);
        }

        const quickActions = [
          "Составь план на сегодня",
          "Как мои привычки?",
          "Анализ финансов",
          "Что улучшить?",
        ];

        return <>
          {/* Floating button - only show when not on home or chat is open */}
          {(tab!=="home"||aiOpen)&&(
          <button onClick={()=>setAiOpen(o=>!o)} style={{
            position:"fixed", bottom:90, right:16,
            border:"none", cursor:"pointer", zIndex:200,
            padding:0, background:"none",
            transition:"all 0.25s"
          }}>
            {aiOpen
              ? <div style={{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,#0F2A1C,#1E3932)",border:"2px solid rgba(46,204,143,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#F0EDE8",boxShadow:"0 4px 24px rgba(0,0,0,0.6),0 0 0 3px rgba(46,204,143,0.15)"}}>✕</div>
              : <div style={{position:"relative"}}>
                  <img src="" style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",objectPosition:"center top",border:"2.5px solid #2ECC8F",boxShadow:"0 4px 28px rgba(46,204,143,0.5),0 0 0 4px rgba(46,204,143,0.12),0 8px 20px rgba(0,0,0,0.4)"}}/>
                  <div style={{position:"absolute",bottom:2,right:2,width:14,height:14,borderRadius:"50%",background:"#2ECC8F",border:"2.5px solid #0D1F14",boxShadow:"0 0 8px rgba(46,204,143,1)"}}/>
                </div>
            }
          </button>
          )}



          {/* Chat panel */}
          {aiOpen&&(
            <div style={{
              position:"fixed", bottom:155, right:10, left:10, maxWidth:480,
              margin:"0 auto", background:"#0F2A1C",
              border:"1px solid rgba(46,204,143,0.3)", borderRadius:20,
              zIndex:199, display:"flex", flexDirection:"column",
              height:420, boxShadow:"0 8px 40px rgba(0,0,0,0.5)",
              overflow:"hidden"
            }}>
              {/* Header */}
              <div style={{padding:"14px 16px 12px", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(46,204,143,0.08)", display:"flex", alignItems:"center", gap:10}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <img src="" style={{width:46,height:46,borderRadius:"50%",objectFit:"cover",objectPosition:"center top",border:"2px solid rgba(46,204,143,0.6)",boxShadow:"0 2px 12px rgba(46,204,143,0.3)"}}/>
                  <div style={{position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:"50%",background:"#2ECC8F",border:"2px solid #0F2A1C",boxShadow:"0 0 6px rgba(46,204,143,0.8)"}}/>
                </div>
                <div>
                  <div style={{fontSize:14, fontWeight:700, color:"#F0EDE8", letterSpacing:"-0.01em"}}>Aza AI</div>
                  <div style={{fontSize:10, color:"rgba(46,204,143,0.8)", marginTop:2, display:"flex", alignItems:"center", gap:4}}><span style={{fontSize:8}}>●</span> онлайн · знает все твои данные</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10}}>
                {aiMessages.map((m,i)=>(
                  <div key={i} style={{display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                    <div style={{
                      maxWidth:"82%", padding:"10px 13px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                      background:m.role==="user"?"linear-gradient(135deg,#2ECC8F,#4D96FF)":"rgba(255,255,255,0.07)",
                      fontSize:13, color:"#F0EDE8", lineHeight:1.55,
                      border:m.role==="assistant"?"1px solid rgba(255,255,255,0.08)":"none"
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {aiLoading&&(
                  <div style={{display:"flex", justifyContent:"flex-start"}}>
                    <div style={{padding:"10px 14px", borderRadius:"16px 16px 16px 4px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{display:"flex", gap:4}}>
                        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"rgba(46,204,143,0.7)",animation:`pulse ${0.6+i*0.2}s infinite`}}/>)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* Quick actions */}
              {aiMessages.length<=1&&(
                <div style={{padding:"0 12px 8px", display:"flex", gap:6, flexWrap:"wrap"}}>
                  {quickActions.map(q=>(
                    <button key={q} onClick={()=>{setAiInput(q);}} style={{background:"rgba(46,204,143,0.1)",border:"1px solid rgba(46,204,143,0.25)",borderRadius:12,padding:"5px 10px",cursor:"pointer",fontSize:11,color:"rgba(46,204,143,0.9)",fontFamily:"inherit",transition:"all 0.15s"}}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:8, alignItems:"center", background:"rgba(0,0,0,0.2)"}}>
                <input
                  value={aiInput} onChange={e=>setAiInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&sendMessage()}
                  placeholder="Спроси что угодно..."
                  style={{flex:1, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"9px 13px", color:"#F0EDE8", fontFamily:"inherit", fontSize:13, outline:"none"}}
                />
                <button onClick={sendMessage} disabled={!aiInput.trim()||aiLoading}
                  style={{width:38, height:38, borderRadius:"50%", background:aiInput.trim()?"linear-gradient(135deg,#2ECC8F,#4D96FF)":"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s"}}>
                  ➤
                </button>
              </div>
            </div>
          )}
        </>;
      })()}

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:500,background:"rgba(30,57,50,0.97)",backdropFilter:"blur(16px)",borderTop:"1px solid rgba(255,255,255,0.12)",display:"flex",padding:"10px 0 10px",zIndex:100}}>
        {NAV.map(n=>(
          <button key={n.id} className="nav-btn" onClick={()=>setTab(n.id)} style={{paddingTop:10,paddingBottom:10}}>
            {n.id==="home"
              ? <svg width="22" height="22" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="70" fill={tab==="home"?"#1E3932":"transparent"}/>
                  {tab==="home" && <circle cx="70" cy="70" r="62" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.15"/>}
                  <g transform="translate(26,18)">
                    <polyline points="8,58 8,44 22,44 22,30 36,30 36,16 58,16" fill="none" stroke={tab==="home"?"#FFFFFF":"rgba(255,255,255,0.35)"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="36" cy="16" r="5" fill="none" stroke={tab==="home"?"#FFFFFF":"rgba(255,255,255,0.35)"} strokeWidth="3"/>
                    <circle cx="36" cy="16" r="2.5" fill={tab==="home"?"#FFFFFF":"rgba(255,255,255,0.35)"}/>
                    <polyline points="31,8 36,2 41,8" fill="none" stroke={tab==="home"?"#FFFFFF":"rgba(255,255,255,0.35)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                </svg>
              : <span style={{fontSize:17,color:tab===n.id?"#F0EDE8":"#444",transition:"color 0.2s"}}>{n.icon}</span>
            }
            <span style={{fontSize:9,letterSpacing:"0.06em",textTransform:"uppercase",color:tab===n.id?"#F0EDE8":"#444",transition:"color 0.2s"}}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
