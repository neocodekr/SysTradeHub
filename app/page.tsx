"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell, Bookmark, BookOpen, CalendarDays, CandlestickChart, ChevronLeft, ChevronRight, CircleHelp, ExternalLink, Filter, Flame, Home, Menu, Newspaper, RefreshCw, Search, Settings2, SlidersHorizontal, Sparkles, TrendingUp, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Tab = "home" | "p" | "c" | "history" | "news" | "disclosure" | "market" | "conditions" | "supply" | "signals" | "tools" | "saved";
type Service = "p" | "c" | "k";
type Obj = Record<string, any>;
declare const __STATIC_DEPLOY__: boolean;
const staticDeploy = typeof __STATIC_DEPLOY__ !== "undefined" && __STATIC_DEPLOY__;
const apiOrigin = "https://stock-neocode.cloud";
const browserTokens = new Map<string, { token: string; until: number }>();

function deviceId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("signal-hub-device-id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("signal-hub-device-id", id); }
  return id;
}
async function api(service: Service, path: string, params: Record<string, string | number | undefined> = {}, body?: Obj) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  let response: Response;
  if (staticDeploy) {
    const headers: Record<string, string> = { accept: "application/json" };
    if (service === "k") {
      const id = deviceId();
      const cached = browserTokens.get(id);
      if (cached && cached.until > Date.now() + 120000) headers.authorization = `Bearer ${cached.token}`;
      else {
        const auth = await fetch(`${apiOrigin}/api/Auth/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: id }), cache: "no-store" });
        if (!auth.ok) throw new Error(`인증 요청 실패 (${auth.status})`);
        const data = await auth.json() as { token?: string; expiresInMinutes?: number };
        if (!data.token) throw new Error("인증 토큰이 없습니다.");
        browserTokens.set(id, { token: data.token, until: Date.now() + (data.expiresInMinutes || 30) * 60000 });
        headers.authorization = `Bearer ${data.token}`;
      }
    } else headers.package = service === "p" ? "com.neocode.signalp" : "com.neocode.signalc";
    if (body) headers["content-type"] = "application/json";
    response = await fetch(`${apiOrigin}/api/${path}${query.size ? `?${query}` : ""}`, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  } else {
    response = await fetch(`/api/proxy/${service}/${path}${query.size ? `?${query}` : ""}`, {
      method: body ? "POST" : "GET", headers: { "x-device-id": deviceId(), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: "no-store",
    });
  }
  const data = await response.json().catch(() => ({})) as Obj;
  if (!response.ok) throw new Error(data.error || data.message || `요청 실패 (${response.status})`);
  return data;
}
function useApi(service: Service, path: string | null, params: Record<string, string | number | undefined> = {}, nonce = 0) {
  const key = JSON.stringify(params);
  const [state, setState] = useState<{ data: Obj | null; loading: boolean; error: string }>({ data: null, loading: !!path, error: "" });
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: "" }); return; }
    let active = true;
    setState(s => ({ ...s, loading: true, error: "" }));
    api(service, path, JSON.parse(key)).then(data => active && setState({ data, loading: false, error: "" })).catch(e => active && setState({ data: null, loading: false, error: e.message }));
    return () => { active = false; };
  }, [service, path, key, nonce]);
  return state;
}
const number = (v: any, digits = 0) => typeof v === "number" ? new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits }).format(v) : v ?? "—";
const clean = (s: any) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const date = (s: any) => { if (!s) return ""; const d = new Date(s); return isNaN(d.getTime()) ? String(s) : d.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
const items = (data: Obj | null): Obj[] => Array.isArray(data) ? data : Array.isArray(data?.items) ? data!.items : [];
const nav: { id: Tab; label: string; group: string; icon: any }[] = [
  { id: "home", label: "홈", group: "overview", icon: Home },
  { id: "p", label: "차트 패턴", group: "analysis", icon: Activity },
  { id: "c", label: "캔들 패턴", group: "analysis", icon: CandlestickChart },
  { id: "history", label: "과거 패턴 검색", group: "analysis", icon: CalendarDays },
  { id: "news", label: "뉴스·통합 피드", group: "information", icon: Newspaper },
  { id: "disclosure", label: "공시", group: "information", icon: Bell },
  { id: "market", label: "시장·종목", group: "information", icon: BarChart3 },
  { id: "conditions", label: "종목 조건 검색", group: "analysis", icon: Filter },
  { id: "supply", label: "투자자 수급", group: "information", icon: Sparkles },
  { id: "signals", label: "테마·기술 신호", group: "analysis", icon: TrendingUp },
  { id: "tools", label: "투자 도구", group: "workspace", icon: SlidersHorizontal },
  { id: "saved", label: "저장함", group: "workspace", icon: Bookmark },
];

function Panel({ children, title, action, className = "" }: { children: React.ReactNode; title?: string; action?: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <div className="panel-head"><h3>{title}</h3>{action}</div>}{children}</section>;
}
function State({ loading, error, retry, empty = false }: { loading: boolean; error: string; retry?: () => void; empty?: boolean }) {
  if (loading) return <div className="state"><span className="spinner"/>데이터를 불러오는 중입니다</div>;
  if (error) return <div className="state error"><CircleHelp size={22}/><strong>데이터를 불러오지 못했습니다</strong><span>{error}</span>{retry && <button className="text-button" onClick={retry}>다시 시도</button>}</div>;
  if (empty) return <div className="state">표시할 데이터가 없습니다.</div>;
  return null;
}
function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={`pill ${tone}`}>{children}</span>; }
function Delta({ value }: { value: any }) { const n = Number(value) || 0; return <span className={`delta ${n >= 0 ? "up" : "down"}`}>{n >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {n > 0 ? "+" : ""}{number(n, 2)}%</span>; }
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) { return <div className="pager"><button disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={18}/></button><span>{page} / {Math.max(1, total)}</span><button disabled={page >= total} onClick={() => onChange(page + 1)}><ChevronRight size={18}/></button></div>; }

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [saved, setSaved] = useState<Obj[]>([]);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("signal-hub-saved") || "[]")); } catch {} }, []);
  const save = (entry: Obj) => setSaved(prev => { const exists = prev.some(x => x.id === entry.id); const next = exists ? prev.filter(x => x.id !== entry.id) : [entry, ...prev]; localStorage.setItem("signal-hub-saved", JSON.stringify(next)); return next; });
  const select = (next: Tab) => { setTab(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const title = nav.find(x => x.id === tab)?.label || "홈";
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "show" : ""}`}>
      <div className="brand"><div className="brand-mark"><Activity size={23}/></div><div><strong>SysTradeHub</strong><span>STOCK INTELLIGENCE</span></div><button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="메뉴 닫기"><X size={20}/></button></div>
      <div className="side-section"><span className="side-caption">WORKSPACE</span>{nav.map(({ id, label, icon: Icon }, i) => <button key={id} className={`nav-item ${tab === id ? "active" : ""} ${i === 1 || i === 3 || i === 6 ? "space-top" : ""}`} onClick={() => select(id)}><Icon size={18}/><span>{label}</span>{tab === id && <span className="active-dot"/>}</button>)}</div>
      <div className="side-bottom"><span className="live-dot"/> 실시간 데이터 연동 <small>시그널 P · C · K</small></div>
    </aside>
    {mobileMenu && <div className="scrim" onClick={() => setMobileMenu(false)}/>}
    <main className="main">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="메뉴 열기"><Menu size={22}/></button><div className="breadcrumb">SysTradeHub <ChevronRight size={14}/> <strong>{title}</strong></div><div className="top-actions"><span className="today-label">{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span><button className="icon-button" aria-label="새로고침" title="새로고침" onClick={() => setRefresh(x => x + 1)}><RefreshCw size={17}/></button></div></header>
      <div className="content">
        {tab === "home" && <Dashboard refresh={refresh} select={select}/>}
        {tab === "p" && <ChartPatterns refresh={refresh} save={save} saved={saved}/>}
        {tab === "c" && <CandlePatterns refresh={refresh} save={save} saved={saved}/>}
        {tab === "history" && <HistoricalPatterns refresh={refresh} save={save} saved={saved}/>}
        {tab === "news" && <NewsFeed refresh={refresh} save={save} saved={saved}/>}
        {tab === "disclosure" && <Disclosures refresh={refresh} save={save} saved={saved}/>}
        {tab === "market" && <Market refresh={refresh} save={save} saved={saved}/>}
        {tab === "conditions" && <Conditions refresh={refresh} save={save} saved={saved}/>}
        {tab === "supply" && <Supply refresh={refresh} save={save} saved={saved}/>}
        {tab === "signals" && <Signals refresh={refresh} save={save} saved={saved}/>}
        {tab === "tools" && <Tools/>}
        {tab === "saved" && <Saved entries={saved} save={save}/>}
      </div>
    </main>
    <nav className="bottom-nav" aria-label="모바일 메뉴">{[{ id: "home", label: "홈", icon: Home }, { id: "p", label: "차트", icon: Activity }, { id: "c", label: "캔들", icon: CandlestickChart }, { id: "news", label: "뉴스", icon: Newspaper }, { id: "market", label: "시장", icon: BarChart3 }].map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => select(id as Tab)}><Icon size={20}/><span>{label}</span></button>)}</nav>
  </div>;
}

function Dashboard({ refresh, select }: { refresh: number; select: (tab: Tab) => void }) {
  const market = useApi("k", "MajorMarketIndex", {}, refresh);
  const ranking = useApi("p", "SignalC/chart-patterns/today/rankings", { count: 5 }, refresh);
  const feed = useApi("k", "UnifiedFeed", { page: 0, pageSize: 6 }, refresh);
  return <><div className="hero"><div><div className="eyebrow"><span className="live-dot"/> LIVE MARKET OVERVIEW</div><h1>오늘의 시장을<br/><em>한눈에 살펴보세요.</em></h1><p>차트 패턴부터 실시간 뉴스와 공시까지, 세 가지 시그널을 하나로.</p><div className="hero-actions"><button className="primary-btn" onClick={() => select("p")}>패턴 탐색하기 <ArrowRight size={17}/></button><button className="ghost-btn" onClick={() => select("news")}>최신 뉴스 보기</button></div></div><div className="hero-visual"><div className="orbit orbit-1"/><div className="orbit orbit-2"/><Activity size={112} strokeWidth={1.15}/><span>MAKE THE SIGNAL CLEAR</span></div></div>
    <div className="section-title"><div><span className="kicker">MARKET PULSE</span><h2>주요 시장 지표</h2></div><button className="text-button" onClick={() => select("market")}>전체 시장 보기 <ArrowRight size={15}/></button></div>
    <div className="index-grid">{market.loading ? [0,1,2,3].map(i => <div className="index-card skeleton" key={i}/>) : market.error ? <Panel><State loading={false} error={market.error}/></Panel> : items(market.data).slice(0, 4).map((x, i) => <div className="index-card" key={i}><span>{x.name}</span><strong>{x.displayValue || number(x.value, 2)}</strong><Delta value={x.changePercent}/><small>{x.symbol || x.category}</small></div>)}</div>
    <div className="dashboard-grid"><Panel title="오늘의 차트 패턴" action={<button className="text-button" onClick={() => select("p")}>전체 보기 <ArrowRight size={15}/></button>}><State loading={ranking.loading} error={ranking.error}/>{items(ranking.data).map((x, i) => <button className="rank-row" key={i} onClick={() => select("p")}><span className="rank-number">{x.rank || i + 1}</span><span className="rank-text"><strong>{x.pattern?.name_ko}</strong><small>{x.representative_stock?.stock_name} · {x.pattern?.name_en}</small></span><span className="rank-count">{number(x.occurrence_count)}건</span></button>)}</Panel>
      <Panel title="최신 뉴스·공시" action={<button className="text-button" onClick={() => select("news")}>전체 보기 <ArrowRight size={15}/></button>}><State loading={feed.loading} error={feed.error}/>{items(feed.data).map((x, i) => <a className="feed-row" key={i} href={x.link || "#"} target="_blank" rel="noopener noreferrer"><Pill tone={x.item_type === "disclosure" ? "blue" : "green"}>{x.item_type === "disclosure" ? "공시" : "뉴스"}</Pill><span><strong>{clean(x.title)}</strong><small>{x.stock_name || x.source} · {date(x.published_at || x.pubDate)}</small></span><ExternalLink size={15}/></a>)}</Panel></div>
    <div className="feature-grid"><button onClick={() => select("c")}><CandlestickChart/><strong>캔들 패턴 스캐너</strong><span>오늘 시장에서 발견된 캔들 패턴을 종목별로 확인</span><ArrowRight size={17}/></button><button onClick={() => select("disclosure")}><Bell/><strong>공시 모니터</strong><span>최신 공시와 기업별 공시 흐름을 빠르게 탐색</span><ArrowRight size={17}/></button><button onClick={() => select("tools")}><Settings2/><strong>투자 계산 도구</strong><span>평단가와 수익률을 간편하게 계산</span><ArrowRight size={17}/></button></div>
  </>;
}

function ChartPatterns({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [query, setQuery] = useState(""); const [market, setMarket] = useState("ALL"); const [selected, setSelected] = useState<Obj | null>(null); const [page, setPage] = useState(1); const [score, setScore] = useState(80);
  const catalog = useApi("p", "SignalC/chart-patterns", {}, refresh);
  const result = useApi("p", selected ? `SignalC/chart-patterns/${encodeURIComponent(selected.key)}/stocks` : null, { windowDays: 40, lookbackDays: 5, market, minScore: score, pageNo: page, pageSize: 20 }, refresh);
  const patterns = items(catalog.data).filter(x => `${x.name_ko} ${x.name_en} ${x.family}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle kicker="SIGNAL P" title="차트 패턴 탐색" desc="종가 흐름의 형태를 비교하고 비슷한 움직임을 보인 종목을 찾습니다." icon={<Activity/>}/><div className="toolbar"><label className="searchbox"><Search size={18}/><input placeholder="패턴 이름 검색" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="시장" value={market} onChange={e => {setMarket(e.target.value); setPage(1);}}><option value="ALL">전체 시장</option><option value="KOSPI">KOSPI</option><option value="KOSDAQ">KOSDAQ</option></select><label className="score-select">유사도 {score}+ <input type="range" min="60" max="95" step="5" value={score} onChange={e => setScore(+e.target.value)}/></label></div>
    <div className="split-grid"><Panel title={`패턴 도감 ${patterns.length ? `· ${patterns.length}개` : ""}`}><State loading={catalog.loading} error={catalog.error} empty={!catalog.loading && !catalog.error && !patterns.length}/><div className="pattern-list">{patterns.map(x => <button key={x.key} className={`pattern-item ${selected?.key === x.key ? "selected" : ""}`} onClick={() => {setSelected(x); setPage(1);}}><MiniLine values={x.template_close}/><span><strong>{x.name_ko}</strong><small>{x.name_en || x.family}</small></span><ChevronRight size={16}/></button>)}</div></Panel><Panel title={selected ? selected.name_ko : "패턴을 선택하세요"} action={selected && <button className="icon-button" onClick={() => save({ id: `p:${selected.key}`, kind: "차트 패턴", title: selected.name_ko, subtitle: selected.name_en })}><Bookmark size={17} fill={saved.some(x => x.id === `p:${selected.key}`) ? "currentColor" : "none"}/></button>}>{selected ? <><p className="muted description">{selected.note_ko || selected.direction || "종가 패턴과 유사한 종목을 검색합니다."}</p><div className="detail-metrics"><div><span>패턴 유형</span><strong>{selected.family || "차트 패턴"}</strong></div><div><span>검색 결과</span><strong>{number(result.data?.total_count)}개</strong></div></div><State loading={result.loading} error={result.error} empty={!result.loading && !result.error && !items(result.data).length}/>{items(result.data).map((x, i) => <StockRow key={i} stock={x} suffix={<span className="score">{number(x.score, 1)}점</span>}/>) }<Pager page={page} total={result.data?.total_pages || 1} onChange={setPage}/></> : <div className="empty-detail"><Activity size={34}/><strong>왼쪽에서 패턴을 선택하세요</strong><span>유사 종목과 점수를 확인할 수 있습니다.</span></div>}</Panel></div>
  </>;
}

function MiniLine({ values }: { values?: number[] }) { if (!values?.length) return <span className="mini-line fallback"><Activity size={20}/></span>; const min = Math.min(...values), max = Math.max(...values), span = max - min || 1; return <svg className="mini-line" viewBox="0 0 64 38" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" points={values.map((v,i) => `${(i/(values.length-1))*60+2},${34-(v-min)/span*29}`).join(" ")}/></svg>; }
function StockRow({ stock, suffix, onClick }: { stock: Obj; suffix?: React.ReactNode; onClick?: () => void }) { const code = stock.stock_code || stock.stockCode || stock.code; return <button className="stock-row" onClick={onClick}><div className="stock-avatar">{String(stock.stock_name || stock.stockName || "종").slice(0,1)}</div><span className="stock-main"><strong>{stock.stock_name || stock.stockName || "종목"}</strong><small>{code} · {stock.market || ""}</small></span>{suffix || <Delta value={stock.change_rate ?? stock.changeRate}/>}</button>; }

function CandlePatterns({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [market, setMarket] = useState("ALL"); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<Obj | null>(null); const [page, setPage] = useState(1); const [day, setDay] = useState("");
  const counts = useApi("c", "SignalC/candle-patterns/counts", { market, date: day.replaceAll("-", "") || undefined, minVolume: 0 }, refresh);
  const found = useApi("c", selected ? `SignalC/candle-patterns/${encodeURIComponent(selected.pattern_code)}/stocks` : null, { market, date: day.replaceAll("-", "") || undefined, pageNo: page, numOfRows: 30, minVolume: 0 }, refresh);
  const patterns = (counts.data?.patterns || []).filter((x: Obj) => `${x.pattern_name} ${x.pattern_name_en}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle kicker="SIGNAL C" title="캔들 패턴 스캐너" desc="최신 거래일의 캔들 패턴 발생 현황과 해당 종목을 확인하세요." icon={<CandlestickChart/>}/><div className="toolbar"><label className="searchbox"><Search size={18}/><input placeholder="캔들 패턴 검색" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="시장" value={market} onChange={e => {setMarket(e.target.value);setPage(1)}}><option value="ALL">전체 시장</option><option value="KOSPI">KOSPI</option><option value="KOSDAQ">KOSDAQ</option></select><input aria-label="기준일" type="date" value={day} onChange={e => setDay(e.target.value)}/></div>
    <div className="split-grid"><Panel title={`발견된 패턴 ${number(counts.data?.total_count)}건`}><State loading={counts.loading} error={counts.error} empty={!counts.loading && !counts.error && !patterns.length}/><div className="pattern-list">{patterns.map((x: Obj) => <button className={`pattern-item ${selected?.pattern_code === x.pattern_code ? "selected" : ""}`} key={x.pattern_code} onClick={() => {setSelected(x);setPage(1)}}><span className="candle-symbol"><CandlestickChart size={21}/></span><span><strong>{x.pattern_name}</strong><small>{x.pattern_name_en || x.type}</small></span><span className="count-badge">{number(x.count)}</span></button>)}</div></Panel><Panel title={selected?.pattern_name || "패턴을 선택하세요"} action={selected && <button className="icon-button" onClick={() => save({ id: `c:${selected.pattern_code}`, kind: "캔들 패턴", title: selected.pattern_name, subtitle: selected.pattern_name_en })}><Bookmark size={17} fill={saved.some(x => x.id === `c:${selected.pattern_code}`) ? "currentColor" : "none"}/></button>}>{selected ? <><div className="tag-row"><Pill tone="green">{selected.signal || "패턴"}</Pill><Pill>{selected.trend || selected.type || ""}</Pill><Pill>{selected.candle_count}봉</Pill></div><p className="muted description">{number(found.data?.total_count)}개 종목에서 발견되었습니다.</p><State loading={found.loading} error={found.error} empty={!found.loading && !found.error && !items(found.data).length}/>{items(found.data).map((x,i) => <StockRow key={i} stock={x}/>)}<Pager page={page} total={Math.ceil((found.data?.total_count || 0) / 30)} onChange={setPage}/></> : <div className="empty-detail"><CandlestickChart size={34}/><strong>패턴을 선택하세요</strong><span>발생 종목과 가격 변화를 확인할 수 있습니다.</span></div>}</Panel></div>
  </>;
}

function HistoricalPatterns({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const now = new Date(); const lastYear = new Date(now); lastYear.setFullYear(now.getFullYear() - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [start, setStart] = useState(iso(lastYear)); const [end, setEnd] = useState(iso(now)); const [market, setMarket] = useState("ALL");
  const [query, setQuery] = useState(""); const [selected, setSelected] = useState<Obj | null>(null); const [applied, setApplied] = useState(false); const [page, setPage] = useState(1);
  const catalog = useApi("c", "SignalC/pattern-search/patterns", {}, refresh);
  const result = useApi("c", applied && selected ? `SignalC/pattern-search/${selected.pattern_id}/stocks` : null, { startDate: start, endDate: end, market, numOfRows: 20, pageNo: page }, refresh);
  const patterns = (Array.isArray(catalog.data) ? catalog.data : items(catalog.data)).filter((x: Obj) => `${x.pattern_id} ${x.pattern_name} ${x.category}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle kicker="SIGNAL P · C" title="과거 패턴 검색" desc="기간과 시장을 정해 과거 패턴 발생 종목을 검색하세요." icon={<CalendarDays/>}/>
    <div className="toolbar"><label className="searchbox"><Search size={18}/><input placeholder="패턴명·코드 검색" value={query} onChange={e => setQuery(e.target.value)}/></label><input aria-label="시작일" type="date" value={start} onChange={e => {setStart(e.target.value);setApplied(false)}}/><input aria-label="종료일" type="date" value={end} onChange={e => {setEnd(e.target.value);setApplied(false)}}/><select aria-label="시장" value={market} onChange={e => {setMarket(e.target.value);setApplied(false)}}><option value="ALL">전체 시장</option><option value="KOSPI">KOSPI</option><option value="KOSDAQ">KOSDAQ</option></select><button className="primary-btn" disabled={!selected || !start || !end} onClick={() => {setPage(1);setApplied(true)}}>검색</button></div>
    <div className="split-grid"><Panel title={`패턴 목록 · ${patterns.length}개`}><State loading={catalog.loading} error={catalog.error} empty={!catalog.loading && !catalog.error && !patterns.length}/><div className="pattern-list">{patterns.map((x: Obj) => <button className={`pattern-item ${selected?.pattern_id === x.pattern_id ? "selected" : ""}`} key={x.pattern_id} onClick={() => {setSelected(x);setApplied(false)}}><span className="candle-symbol"><BookOpen size={19}/></span><span><strong>{x.pattern_name}</strong><small>{x.pattern_id} · {x.category || x.period}</small></span><ChevronRight size={16}/></button>)}</div></Panel><Panel title={selected?.pattern_name || "패턴을 선택하세요"} action={selected && <button className="icon-button" aria-label="패턴 저장" onClick={() => save({id:`history:${selected.pattern_id}`,kind:"과거 패턴",title:selected.pattern_name,subtitle:selected.pattern_id})}><Bookmark size={17} fill={saved.some(x => x.id === `history:${selected.pattern_id}`) ? "currentColor" : "none"}/></button>}>{selected ? <><p className="muted description">{selected.overview || selected.rule}</p><div className="tag-row"><Pill tone="green">{selected.period || "패턴"}</Pill><Pill>{selected.category || "과거 분석"}</Pill></div>{applied ? <><div className="detail-metrics"><div><span>검색 기간</span><strong>{start} ~ {end}</strong></div><div><span>발생 종목</span><strong>{number(result.data?.total_count)}개</strong></div></div><State loading={result.loading} error={result.error} empty={!result.loading && !result.error && !items(result.data).length}/>{items(result.data).map((x,i) => <StockRow key={i} stock={x}/>) }<Pager page={page} total={Math.ceil((result.data?.total_count || 0)/20)} onChange={setPage}/></> : <div className="empty-detail"><Filter size={30}/><strong>조건을 정하고 검색하세요</strong><span>기간별 일치 종목을 확인할 수 있습니다.</span></div>}</> : <div className="empty-detail"><BookOpen size={34}/><strong>패턴을 선택하세요</strong></div>}</Panel></div></>;
}

function NewsFeed({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [mode, setMode] = useState<"feed" | "news" | "search">("feed"); const [query, setQuery] = useState(""); const [submitted, setSubmitted] = useState(""); const [page, setPage] = useState(0);
  const endpoint = mode === "feed" ? "UnifiedFeed" : mode === "search" ? "UnifiedFeed/search" : "News";
  const result = useApi("k", endpoint, { page, pageSize: 20, keyword: mode === "search" ? submitted : undefined }, refresh);
  return <><PageTitle kicker="SIGNAL K" title="뉴스·통합 피드" desc="시장 뉴스와 공시를 최신순으로 확인하고 키워드로 검색하세요." icon={<Newspaper/>}/><div className="toolbar"><div className="segmented"><button className={mode === "feed" ? "active" : ""} onClick={() => {setMode("feed");setPage(0)}}>통합 피드</button><button className={mode === "news" ? "active" : ""} onClick={() => {setMode("news");setPage(0)}}>뉴스</button><button className={mode === "search" ? "active" : ""} onClick={() => {setMode("search");setPage(0)}}>검색</button></div>{mode === "search" && <form className="searchbox" onSubmit={e => {e.preventDefault();setSubmitted(query);setPage(0)}}><Search size={18}/><input placeholder="뉴스·공시 키워드" value={query} onChange={e => setQuery(e.target.value)}/><button type="submit">검색</button></form>}</div><Panel className="list-panel"><State loading={result.loading} error={result.error} empty={!result.loading && !result.error && !items(result.data).length}/>{items(result.data).map((x,i) => { const id = `feed:${x.link || x.title}`; return <article className="article-row" key={i}><div className="article-top"><Pill tone={x.item_type === "disclosure" ? "blue" : "green"}>{x.item_type === "disclosure" ? "공시" : "뉴스"}</Pill><span>{x.source || x.stock_name || "시그널 K"} · {date(x.published_at || x.pubDate)}</span></div><a href={x.link || "#"} target="_blank" rel="noopener noreferrer"><h3>{clean(x.title)}</h3><p>{clean(x.description)}</p></a><div className="article-bottom"><span>{x.stock_name || ""}</span><button onClick={() => save({ id, kind: "뉴스·공시", title: clean(x.title), subtitle: x.source, url: x.link })}><Bookmark size={16} fill={saved.some(s => s.id === id) ? "currentColor" : "none"}/> 저장</button></div></article>})}<Pager page={page + 1} total={result.data?.totalPages || 1} onChange={n => setPage(n - 1)}/></Panel></>;
}

function Disclosures({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [page, setPage] = useState(1); const [query, setQuery] = useState(""); const result = useApi("k", "UnifiedDisclosure", { current_page: page, pageSize: 25 }, refresh);
  const rows = items(result.data).filter(x => `${x.company} ${x.title} ${x.code}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle kicker="SIGNAL K" title="기업 공시" desc="DART를 비롯한 최신 기업 공시를 시간순으로 확인하세요." icon={<Bell/>}/><div className="toolbar"><label className="searchbox"><Search size={18}/><input placeholder="현재 페이지에서 회사·공시 검색" value={query} onChange={e => setQuery(e.target.value)}/></label><Pill tone="blue">{number(result.data?.totalCount)}건</Pill></div><Panel className="list-panel"><State loading={result.loading} error={result.error} empty={!result.loading && !result.error && !rows.length}/>{rows.map((x,i) => <div className="disclosure-row" key={i}><div className="disclosure-icon"><Bell size={18}/></div><div><span className="company">{x.company} <small>{x.code}</small></span><a href={x.link} target="_blank" rel="noopener noreferrer">{clean(x.title)} <ExternalLink size={14}/></a><small>{x.source} · {date(x.dateTime)}</small></div><button className="icon-button" aria-label="공시 저장" onClick={() => save({ id: `disclosure:${x.disclosureNo}`, kind: "공시", title: x.title, subtitle: x.company, url: x.link })}><Bookmark size={17} fill={saved.some(s => s.id === `disclosure:${x.disclosureNo}`) ? "currentColor" : "none"}/></button></div>)}<Pager page={page} total={result.data?.totalPages || 1} onChange={setPage}/></Panel></>;
}

function Market({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [search, setSearch] = useState(""); const [submitted, setSubmitted] = useState(""); const [stock, setStock] = useState<Obj | null>(null);
  const indices = useApi("k", "MajorMarketIndex", {}, refresh);
  const stocks = useApi("k", submitted ? "Krx/stocks/search" : null, { keyword: submitted, market: "ALL", limit: 30 }, refresh);
  const candles = useApi("k", stock ? `Candles/${encodeURIComponent(stock.stock_code)}` : null, {}, refresh);
  const quotes = useApi("k", "PublicData/stocks/quotes", { pageNo: 1, numOfRows: 30 }, refresh);
  const chartData = items(candles.data).slice(0, 160).map(x => ({ date: x.date || x.trade_date || x.bas_dt, close: Number(x.close_price ?? x.close ?? x.closePrice) })).filter(x => x.close).reverse();
  return <><PageTitle kicker="SIGNAL K · P" title="시장·종목 탐색" desc="시장 지표와 종목 시세를 보고, 원하는 종목의 가격 흐름을 탐색하세요." icon={<BarChart3/>}/><div className="market-index-grid"><State loading={indices.loading} error={indices.error}/>{items(indices.data).map((x,i) => <div className="index-card" key={i}><span>{x.name}</span><strong>{x.displayValue || number(x.value,2)}</strong><Delta value={x.changePercent}/><small>{x.source || x.category}</small></div>)}</div><div className="section-title"><div><span className="kicker">STOCK EXPLORER</span><h2>종목 검색</h2></div></div><form className="toolbar" onSubmit={e => {e.preventDefault();setSubmitted(search)}}><label className="searchbox"><Search size={18}/><input placeholder="종목명 또는 코드 입력" value={search} onChange={e => setSearch(e.target.value)}/></label><button className="primary-btn" type="submit">검색</button></form><div className="split-grid"><Panel title={submitted ? `“${submitted}” 검색 결과` : "거래 종목"}><State loading={submitted ? stocks.loading : quotes.loading} error={submitted ? stocks.error : quotes.error}/>{items(submitted ? stocks.data : quotes.data).map((x,i) => <StockRow key={i} stock={x} onClick={() => setStock(x)}/>)}</Panel><Panel title={stock ? `${stock.stock_name} (${stock.stock_code})` : "종목 상세"} action={stock && <button className="icon-button" onClick={() => save({ id: `stock:${stock.stock_code}`, kind: "종목", title: stock.stock_name, subtitle: stock.stock_code })}><Bookmark size={17} fill={saved.some(x => x.id === `stock:${stock.stock_code}`) ? "currentColor" : "none"}/></button>}>{stock ? <><div className="detail-metrics"><div><span>시장</span><strong>{stock.market || "—"}</strong></div><div><span>현재가</span><strong>{number(stock.close_price)}원</strong></div><div><span>등락률</span><strong><Delta value={stock.change_rate}/></strong></div></div><State loading={candles.loading} error={candles.error}/>{chartData.length > 0 && <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#38b79b" stopOpacity=".3"/><stop offset="100%" stopColor="#38b79b" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#e9eef1" vertical={false}/><XAxis dataKey="date" tick={{fontSize:10}} minTickGap={30}/><YAxis domain={["auto","auto"]} tick={{fontSize:10}} width={55}/><Tooltip/><Area type="monotone" dataKey="close" stroke="#12a584" strokeWidth={2} fill="url(#priceFill)"/></AreaChart></ResponsiveContainer></div>}</> : <div className="empty-detail"><BarChart3 size={34}/><strong>종목을 선택하세요</strong><span>가격 정보와 차트를 볼 수 있습니다.</span></div>}</Panel></div></>;
}

function Conditions({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [rows, setRows] = useState<Obj[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [market, setMarket] = useState("ALL"); const [keyword, setKeyword] = useState(""); const [minVolume, setMinVolume] = useState(""); const [minValue, setMinValue] = useState(""); const [minRate, setMinRate] = useState(""); const [maxRate, setMaxRate] = useState(""); const [order, setOrder] = useState("trading_value"); const [page, setPage] = useState(1);
  useEffect(() => { let active = true; setLoading(true); setError(""); (async () => { const first = await api("k", "PublicData/stocks/quotes", { pageNo: 1, numOfRows: 1000 }); const pages = Math.min(10, Number(first.totalPages) || 1); const rest = await Promise.all(Array.from({ length: pages - 1 }, (_,i) => api("k", "PublicData/stocks/quotes", { pageNo: i + 2, numOfRows: 1000 }))); if (active) setRows([...items(first), ...rest.flatMap(items)]); })().catch(e => active && setError(e.message)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [refresh]);
  const filtered = useMemo(() => rows.filter(x => (market === "ALL" || x.market === market) && `${x.stock_name} ${x.stock_code}`.toLowerCase().includes(keyword.toLowerCase()) && (!minVolume || Number(x.volume) >= Number(minVolume)) && (!minValue || Number(x.trading_value) >= Number(minValue) * 100000000) && (!minRate || Number(x.change_rate) >= Number(minRate)) && (!maxRate || Number(x.change_rate) <= Number(maxRate))).sort((a,b) => Number(b[order] || 0) - Number(a[order] || 0)), [rows, market, keyword, minVolume, minValue, minRate, maxRate, order]);
  return <><PageTitle kicker="STOCK SCREENER" title="종목 조건 검색" desc="거래량·거래대금·등락률로 국내 상장 종목을 실시간 필터링합니다." icon={<Filter/>}/><Panel className="filter-panel"><div className="filter-grid"><label>종목명·코드<input value={keyword} onChange={e => {setKeyword(e.target.value);setPage(1)}} placeholder="검색어"/></label><label>시장<select value={market} onChange={e => {setMarket(e.target.value);setPage(1)}}><option value="ALL">전체</option><option value="KOSPI">KOSPI</option><option value="KOSDAQ">KOSDAQ</option></select></label><label>최소 거래량<input type="number" min="0" value={minVolume} onChange={e => {setMinVolume(e.target.value);setPage(1)}} placeholder="주"/></label><label>최소 거래대금<input type="number" min="0" value={minValue} onChange={e => {setMinValue(e.target.value);setPage(1)}} placeholder="억원"/></label><label>등락률 이상<input type="number" value={minRate} onChange={e => {setMinRate(e.target.value);setPage(1)}} placeholder="%"/></label><label>등락률 이하<input type="number" value={maxRate} onChange={e => {setMaxRate(e.target.value);setPage(1)}} placeholder="%"/></label><label>정렬<select value={order} onChange={e => setOrder(e.target.value)}><option value="trading_value">거래대금순</option><option value="volume">거래량순</option><option value="change_rate">등락률순</option></select></label></div></Panel><Panel title={`검색 결과 · ${number(filtered.length)}개`} className="list-panel"><State loading={loading} error={error} empty={!loading && !error && !filtered.length}/>{filtered.slice((page-1)*30,page*30).map((x,i) => <div className="signal-row" key={i}><StockRow stock={x}/><span className="condition-value">{number(x.close_price)}원</span><button className="icon-button" aria-label="종목 저장" onClick={() => save({id:`stock:${x.stock_code}`,kind:"종목",title:x.stock_name,subtitle:x.stock_code})}><Bookmark size={17} fill={saved.some(s => s.id === `stock:${x.stock_code}`) ? "currentColor" : "none"}/></button></div>)}<Pager page={page} total={Math.ceil(filtered.length/30)} onChange={setPage}/></Panel></>;
}

function Supply({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [market, setMarket] = useState("KOSPI"); const [investor, setInvestor] = useState("foreign"); const [side, setSide] = useState("buy");
  const data = useApi("k", "KiwoomInvestorTrading", {}, refresh);
  const chosen = (data.data?.markets || []).find((x: Obj) => x.marketName === market)?.investors?.find((x: Obj) => x.investorCode === investor);
  const ranked = [...(chosen?.items || [])].sort((a: Obj,b: Obj) => side === "buy" ? Number(b.netBuyAmountMillion) - Number(a.netBuyAmountMillion) : Number(a.netBuyAmountMillion) - Number(b.netBuyAmountMillion)).slice(0, 30);
  return <><PageTitle kicker="SIGNAL K" title="투자자 수급" desc="시장별 외국인·기관·투신·연기금의 순매수와 순매도 상위 종목을 살펴보세요." icon={<Sparkles/>}/><div className="toolbar"><div className="segmented"><button className={market === "KOSPI" ? "active" : ""} onClick={() => setMarket("KOSPI")}>KOSPI</button><button className={market === "KOSDAQ" ? "active" : ""} onClick={() => setMarket("KOSDAQ")}>KOSDAQ</button></div><select aria-label="투자자" value={investor} onChange={e => setInvestor(e.target.value)}><option value="foreign">외국인</option><option value="institution">기관계</option><option value="investmentTrust">투신</option><option value="pension">연기금</option></select><div className="segmented"><button className={side === "buy" ? "active" : ""} onClick={() => setSide("buy")}>순매수</button><button className={side === "sell" ? "active" : ""} onClick={() => setSide("sell")}>순매도</button></div></div><Panel title={`${market} · ${chosen?.investorName || "투자자"}`} className="list-panel"><State loading={data.loading} error={data.error} empty={!data.loading && !data.error && !ranked.length}/>{ranked.map((x: Obj,i: number) => <div className="supply-row" key={x.stockCode}><span className="rank-number">{i+1}</span><span className="supply-name"><strong>{x.stockName}</strong><small>{x.stockCode} · {number(x.currentPrice)}원</small></span><span className={`supply-amount ${Number(x.netBuyAmountMillion) >= 0 ? "positive" : "negative"}`}>{number(x.netBuyAmountMillion)}백만원</span><button className="icon-button" aria-label="종목 저장" onClick={() => save({id:`stock:${x.stockCode}`,kind:"종목",title:x.stockName,subtitle:x.stockCode})}><Bookmark size={17} fill={saved.some(s => s.id === `stock:${x.stockCode}`) ? "currentColor" : "none"}/></button></div>)}</Panel></>;
}

function Signals({ refresh, save, saved }: { refresh: number; save: (x: Obj) => void; saved: Obj[] }) {
  const [mode, setMode] = useState<"themes" | "ma" | "bollinger" | "target">("themes");
  const [direction, setDirection] = useState(1); const [theme, setTheme] = useState<Obj | null>(null); const [page, setPage] = useState(1); const [market, setMarket] = useState("ALL");
  const themeList = useApi("k", mode === "themes" ? "LsTheme" : null, { direction, limit: 20 }, refresh);
  const themeStocks = useApi("k", mode === "themes" && theme ? `LsTheme/${theme.themeCode}/stocks` : null, {}, refresh);
  const technical = useApi("k", mode === "ma" ? "TechnicalSignals/ma" : mode === "bollinger" ? "TechnicalSignals/bollinger" : mode === "target" ? "Candles/target-reach" : null,
    mode === "ma" ? { ma1: 5, ma2: 20, position: "above", market, pageNo: page, numOfRows: 20 } : mode === "bollinger" ? { signal: "below_lower", period: 20, standardDeviation: 2, squeezePercent: 5, market, pageNo: page, numOfRows: 20 } : { target: "period_high", period: 252, maxRisePercent: 30, market, pageNo: page, numOfRows: 20 }, refresh);
  const themes = Array.isArray(themeList.data?.themes) ? themeList.data.themes : [];
  const themeRows = Array.isArray(themeStocks.data?.stocks) ? themeStocks.data.stocks : [];
  return <><PageTitle kicker="SIGNAL K" title="테마·기술 신호" desc="테마 순위와 이동평균선, 볼린저 밴드, 목표가 도달 종목을 확인하세요." icon={<TrendingUp/>}/>
    <div className="toolbar"><div className="segmented signal-tabs">{[["themes","테마"],["ma","이동평균"],["bollinger","볼린저"],["target","신고가"]].map(([id,label]) => <button key={id} className={mode === id ? "active" : ""} onClick={() => {setMode(id as typeof mode);setPage(1)}}>{label}</button>)}</div>{mode === "themes" ? <select aria-label="테마 방향" value={direction} onChange={e => {setDirection(+e.target.value);setTheme(null)}}><option value={1}>상승 테마</option><option value={0}>하락 테마</option></select> : <select aria-label="시장" value={market} onChange={e => {setMarket(e.target.value);setPage(1)}}><option value="ALL">전체 시장</option><option value="KOSPI">KOSPI</option><option value="KOSDAQ">KOSDAQ</option></select>}</div>
    {mode === "themes" ? <div className="split-grid"><Panel title={`테마 순위 · ${number(themeList.data?.totalAvailableCount)}개`}><State loading={themeList.loading} error={themeList.error} empty={!themeList.loading && !themeList.error && !themes.length}/>{themes.map((x: Obj,i: number) => <button className={`pattern-item ${theme?.themeCode === x.themeCode ? "selected" : ""}`} key={x.themeCode} onClick={() => setTheme(x)}><span className="rank-number">{i+1}</span><span><strong>{x.themeName}</strong><small>{x.totalStockCount}개 종목 · {x.rankDate || themeList.data?.rankDate}</small></span><Delta value={x.averageChangeRate}/></button>)}</Panel><Panel title={theme?.themeName || "테마를 선택하세요"}>{theme ? <><div className="detail-metrics"><div><span>평균 등락률</span><strong><Delta value={theme.averageChangeRate}/></strong></div><div><span>상승 종목</span><strong>{number(theme.upStockCount)}개</strong></div></div><State loading={themeStocks.loading} error={themeStocks.error} empty={!themeStocks.loading && !themeStocks.error && !themeRows.length}/>{themeRows.map((x: Obj,i: number) => <StockRow key={i} stock={{stock_name:x.stockName,stock_code:x.stockCode,market:x.market,change_rate:x.changeRate}}/>)}</> : <div className="empty-detail"><Flame size={34}/><strong>테마를 선택하세요</strong><span>테마별 구성 종목을 볼 수 있습니다.</span></div>}</Panel></div> : <Panel title={mode === "ma" ? "5일선 > 20일선" : mode === "bollinger" ? "볼린저 하단 이탈" : "52주 신고가 근접"} className="list-panel"><State loading={technical.loading} error={technical.error} empty={!technical.loading && !technical.error && !items(technical.data).length}/>{items(technical.data).map((x,i) => <div className="signal-row" key={i}><StockRow stock={x}/><button className="icon-button" aria-label="종목 저장" onClick={() => save({ id:`stock:${x.stock_code}`,kind:"종목",title:x.stock_name,subtitle:x.stock_code })}><Bookmark size={17} fill={saved.some(s => s.id === `stock:${x.stock_code}`) ? "currentColor" : "none"}/></button></div>)}<Pager page={page} total={Math.ceil((technical.data?.total_count || 0)/20)} onChange={setPage}/></Panel>}</>;
}

function Tools() {
  const [buys, setBuys] = useState([{ price: "", qty: "" }, { price: "", qty: "" }]); const [sell, setSell] = useState("");
  const quantity = buys.reduce((sum,x) => sum + (Number(x.qty) || 0), 0);
  const cost = buys.reduce((sum,x) => sum + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
  const average = quantity ? cost / quantity : 0; const profit = sell && quantity ? (Number(sell) - average) * quantity : 0;
  return <><PageTitle kicker="INVESTMENT TOOLS" title="투자 계산 도구" desc="매수 평균 단가와 예상 수익을 즉시 계산합니다. 입력 값은 이 화면에만 남습니다." icon={<SlidersHorizontal/>}/><div className="tools-grid"><Panel title="평균 매입 단가"><div className="calc-head"><span>매수가</span><span>수량</span></div>{buys.map((row,i) => <div className="calc-row" key={i}><input inputMode="decimal" type="number" min="0" placeholder="0 원" value={row.price} onChange={e => setBuys(buys.map((x,j) => i === j ? {...x,price:e.target.value} : x))}/><input inputMode="numeric" type="number" min="0" placeholder="0 주" value={row.qty} onChange={e => setBuys(buys.map((x,j) => i === j ? {...x,qty:e.target.value} : x))}/>{buys.length > 1 && <button className="icon-button" aria-label="매수 내역 삭제" onClick={() => setBuys(buys.filter((_,j) => i !== j))}><X size={16}/></button>}</div>)}<button className="text-button add-row" onClick={() => setBuys([...buys, {price:"",qty:""}])}>+ 매수 내역 추가</button><div className="calc-results"><div><span>총 수량</span><strong>{number(quantity)}주</strong></div><div><span>총 매수 금액</span><strong>{number(cost)}원</strong></div><div className="highlight"><span>평균 매입 단가</span><strong>{number(average, 2)}원</strong></div></div></Panel><Panel title="목표가 수익률"><label className="field-label">목표 매도가</label><input className="full-input" type="number" min="0" inputMode="decimal" placeholder="매도가 입력" value={sell} onChange={e => setSell(e.target.value)}/><div className="calc-results"><div><span>예상 매도 금액</span><strong>{number(Number(sell) * quantity)}원</strong></div><div><span>예상 손익</span><strong className={profit >= 0 ? "positive" : "negative"}>{profit > 0 ? "+" : ""}{number(profit)}원</strong></div><div className="highlight"><span>예상 수익률</span><strong className={profit >= 0 ? "positive" : "negative"}>{average && sell ? `${number((Number(sell)/average-1)*100, 2)}%` : "—"}</strong></div></div><p className="calc-note">수수료와 세금은 포함되지 않은 단순 계산입니다.</p></Panel></div></>;
}

function Saved({ entries, save }: { entries: Obj[]; save: (x: Obj) => void }) { return <><PageTitle kicker="MY WORKSPACE" title="저장함" desc="관심 있는 패턴과 뉴스, 공시, 종목을 이 브라우저에 저장합니다." icon={<Bookmark/>}/><Panel className="list-panel">{entries.length ? entries.map(x => <div className="saved-row" key={x.id}><Pill>{x.kind}</Pill><div><strong>{x.title}</strong><small>{x.subtitle}</small></div>{x.url && <a href={x.url} target="_blank" rel="noopener noreferrer" aria-label="원문 열기"><ExternalLink size={17}/></a>}<button className="icon-button" onClick={() => save(x)} aria-label="저장 삭제"><X size={17}/></button></div>) : <div className="empty-detail"><Bookmark size={34}/><strong>아직 저장한 항목이 없습니다</strong><span>각 화면의 북마크 버튼으로 저장할 수 있습니다.</span></div>}</Panel></>; }
function PageTitle({ kicker, title, desc, icon }: { kicker: string; title: string; desc: string; icon: React.ReactNode }) { return <div className="page-title"><div><span className="kicker">{kicker}</span><h1>{title}</h1><p>{desc}</p></div><div className="page-icon">{icon}</div></div>; }
