import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/* ─── UTILS ─── */
const toDay = () => new Date().toISOString().slice(0, 10);
const gId = () => Math.random().toString(36).slice(2, 9);
const YKS = new Date("2026-06-20");
const dLeft = () => Math.max(0, Math.ceil((YKS - new Date()) / 86400000));

const DB = {
  get(k) {
    try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

function shiftGunluk(d) {
  const t = toDay();
  if (!d) return { date: t, dun: [], bugun: [], yarin: [] };
  if (d.date === t) return d;
  const n = Math.round((new Date(t) - new Date(d.date)) / 86400000);
  if (n === 1) return { date: t, dun: d.bugun, bugun: d.yarin.map(x => ({ ...x, done: false })), yarin: [] };
  return { date: t, dun: [], bugun: [], yarin: [] };
}

function resetProgram(d) {
  const t = toDay();
  if (!d) return { date: t, cards: [], doneToday: 0 };
  if (d.date === t) return d;
  return { date: t, cards: (d.cards || []).filter(c => c.status !== "complete"), doneToday: 0 };
}

/* ─── THEME ─── */
const C = {
  bg: "#090c14", card: "#0e1220", card2: "#131826",
  border: "#1a2035", borderH: "#28304d",
  accent: "#7b6dfa", accentBg: "rgba(123,109,250,0.1)",
  text: "#dce3f2", dim: "#7a86a0", muted: "#30394f",
  red: "#f87171", redBg: "#190d0d", redBd: "#3d1818",
  yellow: "#fbbf24", yellowBd: "#3d2f00",
  green: "#34d399", greenBg: "#081912", greenBd: "#0d3421",
  gold: "#f5c542",
};

const inp = {
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "8px 12px", color: C.text, fontSize: 13,
  outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};

const cardS = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 };

/* ─── ATOMS ─── */
function PBar({ val, color = C.accent, h = 5 }) {
  return (
    <div style={{ background: C.border, borderRadius: 99, height: h, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, val))}%`, height: "100%", background: color, transition: "width 0.4s", borderRadius: 99 }} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: 400, maxWidth: "90vw", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, ghost, color, small, full, style }) {
  const bg = ghost ? "transparent" : (color || C.accent);
  return (
    <button onClick={onClick} style={{
      background: bg, border: `1px solid ${ghost ? C.border : (color || C.accent)}`,
      borderRadius: 8, padding: small ? "6px 12px" : "9px 18px",
      color: ghost ? C.dim : "#fff", cursor: "pointer",
      fontFamily: "inherit", fontWeight: 600, fontSize: small ? 12 : 13,
      width: full ? "100%" : undefined, transition: "opacity 0.15s", ...style,
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >{children}</button>
  );
}

function ChkBox({ done, onChange, color = C.green, size = 16 }) {
  return (
    <div onClick={onChange} style={{
      width: size, height: size, borderRadius: 4, flexShrink: 0,
      border: `2px solid ${done ? color : C.border}`,
      background: done ? color : "transparent", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
    }}>
      {done && <span style={{ color: C.bg, fontSize: size * 0.6, fontWeight: 800, lineHeight: 1 }}>✓</span>}
    </div>
  );
}

/* ─── SAVE BAR ─── */
function SaveBar({ onSave, saved }) {
  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 90,
      padding: "12px 28px",
      background: `linear-gradient(to top, ${C.bg} 60%, transparent)`,
      display: "flex", justifyContent: "flex-end", pointerEvents: "none",
    }}>
      <button onClick={onSave} style={{
        pointerEvents: "all",
        background: saved ? C.greenBg : C.accent,
        border: `1px solid ${saved ? C.greenBd : C.accent}`,
        borderRadius: 10, padding: "10px 28px",
        color: saved ? C.green : "#fff",
        cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13,
        boxShadow: saved ? "none" : "0 4px 24px rgba(123,109,250,0.35)",
        transition: "all 0.3s",
      }}>
        {saved ? "✓ Kaydedildi" : "💾 Kaydet"}
      </button>
    </div>
  );
}

function useSave(key, data) {
  const [saved, setSaved] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const save = () => {
    DB.set(key, dataRef.current);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return { save, saved };
}

/* ─── HEADER ─── */
function Header({ page, setPage }) {
  const [days, setDays] = useState(dLeft());
  useEffect(() => {
    const t = setInterval(() => setDays(dLeft()), 60000);
    return () => clearInterval(t);
  }, []);
  const urgent = days <= 30;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 28px", borderBottom: `1px solid ${C.border}`,
      background: C.card, position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
        <span onClick={() => setPage(null)} style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          color: page ? C.dim : C.text, cursor: "pointer", fontSize: 16,
        }}>🧠 BBB</span>
        {page && <>
          <span style={{ color: C.muted }}>›</span>
          <span style={{ color: C.text, fontWeight: 600 }}>{page.label}</span>
        </>}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: urgent ? C.redBg : C.accentBg,
        border: `1px solid ${urgent ? C.redBd : C.border}`,
        borderRadius: 10, padding: "8px 18px",
      }}>
        <span style={{ fontSize: 11, color: C.dim }}>YKS&apos;ye</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: urgent ? C.red : C.gold, letterSpacing: "-0.03em", lineHeight: 1 }}>{days}</span>
        <span style={{ fontSize: 11, color: C.dim }}>gün</span>
      </div>
    </div>
  );
}

/* ─── HOME PAGE ─── */
const NAV_CARDS = [
  { key: "dersler", label: "📚 Dersler", desc: "Konu takibi & ilerleme" },
  { key: "program", label: "📋 Ders Programı", desc: "Kanban planlama" },
  { key: "deneme", label: "📈 Deneme Analizi", desc: "Net grafikleri" },
  { key: "haftalik", label: "🎯 Haftalık Hedefler", desc: "Haftalık planlar" },
];

function GunlukKol({ col, tasks, onAdd, onToggle, onDel }) {
  const [val, setVal] = useState("");
  const add = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };
  const done = tasks.filter(t => t.done).length;
  const colColors = { dun: C.dim, bugun: C.accent, yarin: C.green };
  const color = colColors[col.key];

  return (
    <div style={{ ...cardS, flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color, textTransform: "uppercase", fontFamily: "'Syne', sans-serif" }}>{col.label}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted }}>{done}/{tasks.length}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {tasks.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)" }}>
            {col.readonly
              ? <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${t.done ? C.green : C.border}`, background: t.done ? C.green : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.done && <span style={{ color: C.bg, fontSize: 9, fontWeight: 800 }}>✓</span>}
                </div>
              : <ChkBox done={t.done} onChange={() => onToggle(t.id)} />
            }
            <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? C.muted : C.text }}>{t.text}</span>
            {!col.readonly && <button onClick={() => onDel(t.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15, padding: 0 }}>×</button>}
          </div>
        ))}
        {tasks.length === 0 && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: "16px 0" }}>boş</div>}
      </div>
      {!col.readonly && (
        <div style={{ display: "flex", gap: 8 }}>
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
            placeholder="Görev ekle…" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
          <Btn small onClick={add}>+</Btn>
        </div>
      )}
    </div>
  );
}

function HomePage({ setPage, gunluk, setGunluk }) {
  const { save, saved } = useSave("bbb-gunluk", gunluk);
  const upd = (col, fn) => setGunluk(prev => ({ ...prev, [col]: fn(prev[col] || []) }));
  const cols = [
    { key: "dun", label: "Dün", readonly: true },
    { key: "bugun", label: "Bugün" },
    { key: "yarin", label: "Yarın" },
  ];

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 16 }}>
        {cols.map(col => (
          <GunlukKol key={col.key} col={col} tasks={gunluk[col.key] || []}
            onAdd={t => upd(col.key, a => [...a, { id: gId(), text: t, done: false }])}
            onToggle={id => upd(col.key, a => a.map(x => x.id === id ? { ...x, done: !x.done } : x))}
            onDel={id => upd(col.key, a => a.filter(x => x.id !== id))} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {NAV_CARDS.map(c => (
          <div key={c.key} onClick={() => setPage(c)} style={{
            ...cardS, cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 6,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderH; e.currentTarget.style.background = C.card2; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}>
            <span style={{ fontSize: 24 }}>{c.label.split(" ")[0]}</span>
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Syne', sans-serif" }}>{c.label.split(" ").slice(1).join(" ")}</span>
            <span style={{ fontSize: 12, color: C.dim }}>{c.desc}</span>
          </div>
        ))}
      </div>
      <SaveBar onSave={save} saved={saved} />
    </div>
  );
}

/* ─── DERSLER PAGE ─── */
function DerslerPage({ dersler, setDersler }) {
  const [tab, setTab] = useState("ayt");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState({});
  const [addKonuFor, setAddKonuFor] = useState(null);
  const [konuVal, setKonuVal] = useState("");

  const { save: saveToStorage, saved } = useSave("bbb-dersler", dersler);
  const upd = d => setDersler(d);
  const list = dersler[tab] || [];

  const addDers = () => {
    if (!newName.trim()) return;
    upd({ ...dersler, [tab]: [...list, { id: gId(), name: newName.trim(), konular: [] }] });
    setNewName(""); setShowAdd(false);
  };

  const delDers = id => upd({ ...dersler, [tab]: list.filter(d => d.id !== id) });

  const addKonu = dId => {
    if (!konuVal.trim()) return;
    upd({ ...dersler, [tab]: list.map(d => d.id !== dId ? d : { ...d, konular: [...d.konular, { id: gId(), name: konuVal.trim(), ko: false, sc: false, gy: false }] }) });
    setKonuVal(""); setAddKonuFor(null);
  };

  const toggleField = (dId, kId, field) =>
    upd({ ...dersler, [tab]: list.map(d => d.id !== dId ? d : { ...d, konular: d.konular.map(k => k.id !== kId ? k : { ...k, [field]: !k[field] }) }) });

  const delKonu = (dId, kId) =>
    upd({ ...dersler, [tab]: list.map(d => d.id !== dId ? d : { ...d, konular: d.konular.filter(k => k.id !== kId) }) });

  const getDersProg = d => !d.konular.length ? 0 : (d.konular.filter(k => k.ko).length / d.konular.length) * 100;
  const konuDone = k => k.ko && k.sc && k.gy;

  const FIELDS = [
    { key: "ko", label: "Konu Öğrenme", color: C.accent },
    { key: "sc", label: "Soru Çözme", color: C.yellow },
    { key: "gy", label: "Gelişi-Yorum", color: C.green },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center" }}>
        {["ayt", "tyt"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? C.accent : "transparent",
            border: `1px solid ${tab === t ? C.accent : C.border}`,
            borderRadius: 8, padding: "7px 24px", color: tab === t ? "#fff" : C.dim,
            cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>{t}</button>
        ))}
        <Btn small onClick={() => setShowAdd(true)} style={{ marginLeft: "auto" }}>+ Ders Ekle</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 14 }}>
        {list.map(d => {
          const prog = getDersProg(d);
          const isOpen = open[d.id];
          return (
            <div key={d.id} style={{ ...cardS }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}
                onClick={() => setOpen(o => ({ ...o, [d.id]: !o[d.id] }))}>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>{d.name}</span>
                <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{Math.round(prog)}%</span>
                <span style={{ color: C.dim }}>{isOpen ? "▲" : "▼"}</span>
                <button onClick={e => { e.stopPropagation(); delDers(d.id); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15, marginLeft: 4 }}>×</button>
              </div>
              <PBar val={prog} />
              {isOpen && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {d.konular.map(k => (
                    <div key={k.id} style={{
                      padding: "10px 12px", borderRadius: 10,
                      border: `1px solid ${konuDone(k) ? C.greenBd : C.border}`,
                      background: konuDone(k) ? "rgba(52,211,153,0.04)" : "rgba(255,255,255,0.02)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textDecoration: konuDone(k) ? "line-through" : "none", color: konuDone(k) ? C.dim : C.text }}>{k.name}</span>
                        <button onClick={() => delKonu(d.id, k.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>×</button>
                      </div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                        {FIELDS.map(f => (
                          <div key={f.key} onClick={() => toggleField(d.id, k.id, f.key)}
                            style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                            <div style={{
                              width: 14, height: 14, borderRadius: 3,
                              border: `2px solid ${k[f.key] ? f.color : C.border}`,
                              background: k[f.key] ? f.color : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {k[f.key] && <span style={{ fontSize: 9, color: C.bg, fontWeight: 800 }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 11, color: k[f.key] ? f.color : C.muted }}>{f.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {addKonuFor === d.id ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={konuVal} onChange={e => setKonuVal(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addKonu(d.id)}
                        placeholder="Konu adı…" autoFocus style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
                      <Btn small onClick={() => addKonu(d.id)}>Ekle</Btn>
                      <Btn small ghost onClick={() => setAddKonuFor(null)}>İptal</Btn>
                    </div>
                  ) : (
                    <button onClick={() => { setAddKonuFor(d.id); setKonuVal(""); }} style={{
                      background: "none", border: `1px dashed ${C.border}`, borderRadius: 8,
                      color: C.muted, cursor: "pointer", padding: "7px", fontSize: 12,
                      width: "100%", fontFamily: "inherit",
                    }}>+ Konu Ekle</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <div style={{ ...cardS, textAlign: "center", color: C.muted, padding: 48, gridColumn: "1/-1" }}>
            Henüz ders yok. &quot;+ Ders Ekle&quot; butonuna bas.
          </div>
        )}
      </div>
      {showAdd && (
        <Modal title={`${tab.toUpperCase()} Dersi Ekle`} onClose={() => setShowAdd(false)}>
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addDers()}
            placeholder="Ders adı (örn: Matematik)" autoFocus style={{ ...inp, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={addDers} full>Ekle</Btn>
            <Btn ghost onClick={() => setShowAdd(false)} full>İptal</Btn>
          </div>
        </Modal>
      )}
      <SaveBar onSave={saveToStorage} saved={saved} />
    </div>
  );
}

/* ─── DERS PROGRAMI PAGE ─── */
const KANBAN_COLS = [
  { key: "not-started", label: "Not Started", color: "#f87171", bg: "#190d0d", bd: "#3d1818" },
  { key: "in-progress", label: "In Progress", color: "#fbbf24", bg: "#140f00", bd: "#3d2f00" },
  { key: "complete", label: "Complete", color: "#34d399", bg: "#081912", bd: "#0d3421" },
];

function DesProgramiPage({ program, setProgram }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ders: "", konu: "", tarih: "", etiket: "Konu" });
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const { save: saveToStorage, saved } = useSave("bbb-program", program);
  const upd = d => setProgram(d);
  const cards = program.cards || [];
  const doneCount = cards.filter(c => c.status === "complete").length;
  const pct = cards.length ? (doneCount / cards.length) * 100 : 0;

  const addCard = () => {
    if (!form.ders.trim()) return;
    upd({ ...program, cards: [...cards, { id: gId(), ...form, status: "not-started" }] });
    setForm({ ders: "", konu: "", tarih: "", etiket: "Konu" }); setShowAdd(false);
  };

  const move = (id, to) => {
    const was = cards.find(c => c.id === id)?.status;
    const goingDone = to === "complete";
    const wasDone = was === "complete";
    upd({
      ...program,
      cards: cards.map(c => c.id === id ? { ...c, status: to } : c),
      doneToday: goingDone && !wasDone ? (program.doneToday || 0) + 1
        : !goingDone && wasDone ? Math.max(0, (program.doneToday || 0) - 1)
          : (program.doneToday || 0),
    });
  };

  const del = id => upd({ ...program, cards: cards.filter(c => c.id !== id) });

  const onDrop = (e, toKey) => {
    e.preventDefault(); setDragOver(null);
    if (dragId) { move(dragId, toKey); setDragId(null); }
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ ...cardS, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: C.dim, whiteSpace: "nowrap" }}>Günlük İlerleme</span>
        <div style={{ flex: 1 }}><PBar val={pct} color={C.green} h={8} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.green, whiteSpace: "nowrap" }}>{doneCount} / {cards.length}</span>
        <Btn small onClick={() => setShowAdd(true)}>+ Kart Ekle</Btn>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {KANBAN_COLS.map(col => (
          <div key={col.key} style={{
            flex: 1, background: col.bg, border: `1px solid ${dragOver === col.key ? col.color : col.bd}`,
            borderRadius: 14, padding: 16, minHeight: 420, transition: "border-color 0.15s",
          }}
            onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => onDrop(e, col.key)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
              <span style={{ fontWeight: 800, fontSize: 11, color: col.color, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Syne', sans-serif" }}>{col.label}</span>
              <span style={{ marginLeft: "auto", background: col.bd, borderRadius: 99, padding: "2px 8px", fontSize: 11, color: col.color, fontWeight: 700 }}>
                {cards.filter(c => c.status === col.key).length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cards.filter(c => c.status === col.key).map(card => (
                <div key={card.id} draggable
                  onDragStart={() => setDragId(card.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null); }}
                  style={{
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
                    cursor: "grab", opacity: dragId === card.id ? 0.4 : 1, transition: "opacity 0.15s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{card.ders}</span>
                    <button onClick={() => del(card.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>×</button>
                  </div>
                  {card.konu && <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>{card.konu}</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {card.tarih && <span style={{ fontSize: 11, color: C.muted, background: C.border, borderRadius: 4, padding: "2px 6px" }}>{card.tarih}</span>}
                    <span style={{
                      fontSize: 11, borderRadius: 4, padding: "2px 7px",
                      background: card.etiket === "Deneme" ? "#1f0a0a" : card.etiket === "Test" ? "#1a1400" : C.accentBg,
                      color: card.etiket === "Deneme" ? C.red : card.etiket === "Test" ? C.yellow : C.accent,
                      fontWeight: 600,
                    }}>{card.etiket}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {KANBAN_COLS.filter(c => c.key !== col.key).map(c => (
                      <button key={c.key} onClick={() => move(card.id, c.key)} style={{
                        background: "none", border: `1px solid ${c.bd}`, borderRadius: 6,
                        color: c.color, cursor: "pointer", fontSize: 10, padding: "3px 8px", fontFamily: "inherit",
                      }}>→ {c.label.split(" ")[0]}</button>
                    ))}
                  </div>
                </div>
              ))}
              {cards.filter(c => c.status === col.key).length === 0 && (
                <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: "24px 0", borderRadius: 8, border: `1px dashed ${col.bd}` }}>boş</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showAdd && (
        <Modal title="Yeni Kart Ekle" onClose={() => setShowAdd(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={form.ders} onChange={e => setForm({ ...form, ders: e.target.value })} placeholder="Ders *" style={inp} />
            <input value={form.konu} onChange={e => setForm({ ...form, konu: e.target.value })} placeholder="Konu (opsiyonel)" style={inp} />
            <input type="date" value={form.tarih} onChange={e => setForm({ ...form, tarih: e.target.value })} style={inp} />
            <select value={form.etiket} onChange={e => setForm({ ...form, etiket: e.target.value })} style={inp}>
              {["Konu", "Deneme", "Test"].map(e => <option key={e}>{e}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn onClick={addCard} full>Ekle</Btn>
              <Btn ghost onClick={() => setShowAdd(false)} full>İptal</Btn>
            </div>
          </div>
        </Modal>
      )}
      <SaveBar onSave={saveToStorage} saved={saved} />
    </div>
  );
}

/* ─── HAFTALIK KART ─── */
function HaftalikKart({ h, onAdd, onToggle, onDel, big }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const total = h.hedefler.length;
  const done = h.hedefler.filter(x => x.done).length;
  const pct = total ? (done / total) * 100 : 0;
  const add = () => { if (val.trim()) { onAdd(h.id, val.trim()); setVal(""); } };

  return (
    <div style={{ ...cardS, padding: big ? 20 : 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <span style={{ flex: 1, fontWeight: 700, fontSize: big ? 15 : 13, fontFamily: "'Syne', sans-serif" }}>{h.hafta}</span>
        {total > 0 && <div style={{ display: "flex", alignItems: "center", gap: 8, width: big ? 140 : 80 }}>
          <div style={{ flex: 1 }}><PBar val={pct} color={C.accent} /></div>
          <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, width: 28, textAlign: "right" }}>{Math.round(pct)}%</span>
        </div>}
        <span style={{ color: C.dim, fontSize: 12, marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
        <button onClick={e => { e.stopPropagation(); onDel(h.id); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15, marginLeft: 4 }}>×</button>
      </div>
      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {h.hedefler.map(x => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: big ? "7px 10px" : "5px 8px", borderRadius: 8, background: "rgba(255,255,255,0.025)", cursor: "pointer" }}
              onClick={() => onToggle(h.id, x.id)}>
              <ChkBox done={x.done} onChange={() => onToggle(h.id, x.id)} color={C.accent} size={big ? 16 : 14} />
              <span style={{ fontSize: big ? 13 : 12, textDecoration: x.done ? "line-through" : "none", color: x.done ? C.muted : C.text }}>{x.text}</span>
            </div>
          ))}
          {h.hedefler.length === 0 && <div style={{ color: C.muted, fontSize: 12, padding: "8px 0" }}>Hedef ekle…</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
              placeholder="Hedef ekle…" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
            <Btn small onClick={add}>+</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DENEME ANALİZİ PAGE ─── */
const CHART_COLORS = ["#7b6dfa", "#f87171", "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"];

function DenemeAnaliziPage({ deneme, setDeneme }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tip: "AYT", ders: "", net: "" });
  const [showAddHafta, setShowAddHafta] = useState(false);
  const [newHafta, setNewHafta] = useState("");

  const { save: saveToStorage, saved } = useSave("bbb-deneme", deneme);
  const upd = d => setDeneme(d);
  const dersMap = deneme.dersler || {};
  const haftalar = deneme.haftalar || [];

  const addNet = () => {
    if (!form.ders.trim() || !form.net) return;
    const key = `${form.tip}_${form.ders.trim()}`;
    const existing = dersMap[key] || [];
    upd({ ...deneme, dersler: { ...dersMap, [key]: [...existing, { no: existing.length + 1, net: parseFloat(form.net) }] } });
    setForm({ tip: "AYT", ders: "", net: "" }); setShowAdd(false);
  };

  const delDers = key => {
    const { [key]: _, ...rest } = dersMap;
    upd({ ...deneme, dersler: rest });
  };

  const addHafta = () => {
    if (!newHafta.trim()) return;
    upd({ ...deneme, haftalar: [...haftalar, { id: gId(), hafta: newHafta.trim(), hedefler: [] }] });
    setNewHafta(""); setShowAddHafta(false);
  };

  const addHedef = (hId, text) =>
    upd({ ...deneme, haftalar: haftalar.map(h => h.id !== hId ? h : { ...h, hedefler: [...h.hedefler, { id: gId(), text, done: false }] }) });

  const toggleHedef = (hId, xId) =>
    upd({ ...deneme, haftalar: haftalar.map(h => h.id !== hId ? h : { ...h, hedefler: h.hedefler.map(x => x.id !== xId ? x : { ...x, done: !x.done }) }) });

  const delHafta = hId => upd({ ...deneme, haftalar: haftalar.filter(h => h.id !== hId) });

  const entries = Object.entries(dersMap);

  return (
    <div style={{ padding: 28, display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 17, fontFamily: "'Syne', sans-serif" }}>Net Grafikleri</span>
          <Btn small onClick={() => setShowAdd(true)}>+ Net Ekle</Btn>
        </div>
        {entries.length === 0 && (
          <div style={{ ...cardS, textAlign: "center", color: C.muted, padding: 48 }}>
            Henüz deneme verisi yok. Net ekleyerek başla.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {entries.map(([key, data], i) => {
            const [tip, ...rest] = key.split("_");
            const dName = rest.join("_");
            return (
              <div key={key} style={{ ...cardS }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 4, padding: "2px 6px", background: tip === "AYT" ? C.accentBg : "#1a1200", color: tip === "AYT" ? C.accent : C.yellow }}>{tip}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{dName}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.dim }}>Son: <strong style={{ color: C.text }}>{data[data.length - 1]?.net}</strong></span>
                    <button onClick={() => delDers(key)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>×</button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="no" tick={{ fill: C.muted, fontSize: 10 }} tickFormatter={v => `D${v}`} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                      labelFormatter={v => `Deneme ${v}`} formatter={v => [v, "Net"]} />
                    <Line type="monotone" dataKey="net" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 0 }}
                      activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ width: 290, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>Haftalık Hedefler</span>
          <Btn small onClick={() => setShowAddHafta(true)}>+ Hafta</Btn>
        </div>
        {haftalar.map(h => (
          <HaftalikKart key={h.id} h={h} onAdd={addHedef} onToggle={toggleHedef} onDel={delHafta} />
        ))}
        {haftalar.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>Hafta ekleyin.</div>}
      </div>
      {showAdd && (
        <Modal title="Deneme Neti Ekle" onClose={() => setShowAdd(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select value={form.tip} onChange={e => setForm({ ...form, tip: e.target.value })} style={inp}>
              <option>AYT</option><option>TYT</option>
            </select>
            <input value={form.ders} onChange={e => setForm({ ...form, ders: e.target.value })} placeholder="Ders adı (örn: Matematik)" style={inp} />
            <input type="number" value={form.net} onChange={e => setForm({ ...form, net: e.target.value })}
              onKeyDown={e => e.key === "Enter" && addNet()} placeholder="Net sayısı" style={inp} />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn onClick={addNet} full>Ekle</Btn>
              <Btn ghost onClick={() => setShowAdd(false)} full>İptal</Btn>
            </div>
          </div>
        </Modal>
      )}
      {showAddHafta && (
        <Modal title="Hafta Ekle" onClose={() => setShowAddHafta(false)}>
          <input value={newHafta} onChange={e => setNewHafta(e.target.value)} onKeyDown={e => e.key === "Enter" && addHafta()}
            placeholder="örn: Mayıs 1. Hafta" autoFocus style={{ ...inp, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={addHafta} full>Ekle</Btn>
            <Btn ghost onClick={() => setShowAddHafta(false)} full>İptal</Btn>
          </div>
        </Modal>
      )}
      <SaveBar onSave={saveToStorage} saved={saved} />
    </div>
  );
}

/* ─── HAFTALIK HEDEFLER PAGE ─── */
function HaftalikHedeflerPage({ haftalik, setHaftalik }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newHafta, setNewHafta] = useState("");

  const { save: saveToStorage, saved } = useSave("bbb-haftalik", haftalik);
  const upd = d => setHaftalik(d);
  const haftalar = haftalik.haftalar || [];

  const addHafta = () => {
    if (!newHafta.trim()) return;
    upd({ haftalar: [...haftalar, { id: gId(), hafta: newHafta.trim(), hedefler: [] }] });
    setNewHafta(""); setShowAdd(false);
  };

  const addHedef = (hId, text) =>
    upd({ haftalar: haftalar.map(h => h.id !== hId ? h : { ...h, hedefler: [...h.hedefler, { id: gId(), text, done: false }] }) });

  const toggleHedef = (hId, xId) =>
    upd({ haftalar: haftalar.map(h => h.id !== hId ? h : { ...h, hedefler: h.hedefler.map(x => x.id !== xId ? x : { ...x, done: !x.done }) }) });

  const delHafta = hId => upd({ haftalar: haftalar.filter(h => h.id !== hId) });

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <span style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Syne', sans-serif" }}>Haftalık Hedefler</span>
        <Btn onClick={() => setShowAdd(true)}>+ Hafta Ekle</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700 }}>
        {haftalar.map(h => (
          <HaftalikKart key={h.id} h={h} big onAdd={addHedef} onToggle={toggleHedef} onDel={delHafta} />
        ))}
        {haftalar.length === 0 && (
          <div style={{ ...cardS, textAlign: "center", color: C.muted, padding: 48 }}>Henüz hafta eklenmemiş.</div>
        )}
      </div>
      {showAdd && (
        <Modal title="Hafta Ekle" onClose={() => setShowAdd(false)}>
          <input value={newHafta} onChange={e => setNewHafta(e.target.value)} onKeyDown={e => e.key === "Enter" && addHafta()}
            placeholder="örn: Mayıs 2. Hafta" autoFocus style={{ ...inp, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={addHafta} full>Ekle</Btn>
            <Btn ghost onClick={() => setShowAdd(false)} full>İptal</Btn>
          </div>
        </Modal>
      )}
      <SaveBar onSave={saveToStorage} saved={saved} />
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(null);
  const [gunluk, setGunluk] = useState({ date: toDay(), dun: [], bugun: [], yarin: [] });
  const [dersler, setDersler] = useState({ ayt: [], tyt: [] });
  const [program, setProgram] = useState({ date: toDay(), cards: [], doneToday: 0 });
  const [deneme, setDeneme] = useState({ dersler: {}, haftalar: [] });
  const [haftalik, setHaftalik] = useState({ haftalar: [] });

  useEffect(() => {
    const g = DB.get("bbb-gunluk");
    const d = DB.get("bbb-dersler");
    const p = DB.get("bbb-program");
    const dn = DB.get("bbb-deneme");
    const h = DB.get("bbb-haftalik");

    const sg = shiftGunluk(g);
    const rp = resetProgram(p);

    setGunluk(sg);
    setDersler(d || { ayt: [], tyt: [] });
    setProgram(rp);
    setDeneme(dn || { dersler: {}, haftalar: [] });
    setHaftalik(h || { haftalar: [] });

    if (!g || g.date !== toDay()) DB.set("bbb-gunluk", sg);
    if (!p || p.date !== toDay()) DB.set("bbb-program", rp);

    setLoading(false);
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#090c14", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a86a0", fontFamily: "sans-serif", fontSize: 14 }}>
      Yükleniyor…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Outfit:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #090c14; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2035; border-radius: 2px; }
        input[type=date] { color-scheme: dark; }
        input::placeholder { color: #30394f; }
        select option { background: #0e1220; }
      `}</style>
      <div style={{ fontFamily: "'Outfit', sans-serif", background: "#090c14", color: "#dce3f2", minHeight: "100vh" }}>
        <Header page={page} setPage={setPage} />
        <div style={{ maxWidth: 1500, margin: "0 auto" }}>
          {!page && <HomePage setPage={setPage} gunluk={gunluk} setGunluk={setGunluk} />}
          {page?.key === "dersler" && <DerslerPage dersler={dersler} setDersler={setDersler} />}
          {page?.key === "program" && <DesProgramiPage program={program} setProgram={setProgram} />}
          {page?.key === "deneme" && <DenemeAnaliziPage deneme={deneme} setDeneme={setDeneme} />}
          {page?.key === "haftalik" && <HaftalikHedeflerPage haftalik={haftalik} setHaftalik={setHaftalik} />}
        </div>
      </div>
    </>
  );
}
