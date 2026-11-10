"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, ExternalLink, Globe2, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./global-markets.css";

type Bar = { date: string; open: number; close: number };
type Instrument = {
  symbol: string; name: string; currency: string; price: number | null; previousClose: number | null;
  marketTime: string | null; series: Bar[];
  next?: { symbol: string; name: string; price: number; marketTime: string | null } | null;
};
type Snapshot = { generatedAt: string; source: string; instruments: Record<string, Instrument> };
type Commodity = { id: string; name: string; role: string; unit: string; stock?: string; stockName?: string; url: string };
const commodities: Commodity[] = [
  { id: "wti", name: "WTI", role: "에너지 · 인플레이션", unit: "USD/bbl", stock: "so", stockName: "S-Oil", url: "https://finance.yahoo.com/quote/CL=F/" },
  { id: "brent", name: "브렌트유", role: "에너지 · 인플레이션", unit: "USD/bbl", stock: "sk", stockName: "SK이노베이션", url: "https://finance.yahoo.com/quote/BZ=F/" },
  { id: "copper", name: "구리", role: "산업 수요 · 경기", unit: "USD/lb", stock: "ls", stockName: "LS", url: "https://finance.yahoo.com/quote/HG=F/" },
  { id: "jkm", name: "LNG JKM", role: "아시아 에너지 비용", unit: "USD/MMBtu", url: "https://www.cmegroup.com/markets/energy/natural-gas/lng-japan-korea-marker-platts-swap-futures.html" },
  { id: "iron", name: "철광석", role: "철강 업황", unit: "USD/t", stock: "posco", stockName: "POSCO홀딩스", url: "https://finance.yahoo.com/quote/TIO=F/" },
  { id: "gold", name: "금", role: "안전자산 · 실질금리", unit: "USD/oz", url: "https://finance.yahoo.com/quote/GC=F/" },
  { id: "nickel", name: "니켈", role: "배터리 · 소재", unit: "USD/t", url: "https://www.lme.com/metals/non-ferrous/lme-nickel" },
  { id: "aluminum", name: "알루미늄", role: "배터리 · 소재", unit: "USD/t", stock: "samsungSdi", stockName: "삼성SDI", url: "https://finance.yahoo.com/quote/ALI=F/" },
];
const format = (value: number | null | undefined, digits = 2) => value == null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits }).format(value);
const percent = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : `${value > 0 ? "+" : ""}${format(value)}%`;
const change = (current?: number | null, previous?: number | null) => current != null && previous != null && previous !== 0 ? (current / previous - 1) * 100 : null;
const tone = (value: number | null) => value == null ? "" : value > 0 ? "positive" : value < 0 ? "negative" : "";
const closeSeries = (instrument?: Instrument) => (instrument?.series || []).filter(bar => Number.isFinite(bar.close) && bar.close > 0);
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function metrics(instrument?: Instrument) {
  const series = closeSeries(instrument);
  const price = instrument?.price ?? series.at(-1)?.close ?? null;
  const anchor = (days: number) => series.length > days ? series.at(-days - 1)!.close : null;
  const year = series.slice(-252).map(bar => bar.close);
  const low = year.length >= 20 ? Math.min(...year) : null;
  const high = year.length >= 20 ? Math.max(...year) : null;
  return {
    price, day: change(price, series.length > 1 ? series.at(-2)!.close : instrument?.previousClose),
    five: change(price, anchor(5)), twenty: change(price, anchor(20)),
    ma20: series.length >= 20 ? average(series.slice(-20).map(bar => bar.close)) : null,
    ma60: series.length >= 60 ? average(series.slice(-60).map(bar => bar.close)) : null,
    low, high, position: price != null && low != null && high != null && high > low ? (price - low) / (high - low) * 100 : null,
    spread: price != null && instrument?.next?.price ? price - instrument.next.price : null,
  };
}

function correlation(pairs: { x: number; y: number }[]) {
  if (pairs.length < 20) return null;
  const mx = average(pairs.map(pair => pair.x))!;
  const my = average(pairs.map(pair => pair.y))!;
  const numerator = pairs.reduce((sum, pair) => sum + (pair.x - mx) * (pair.y - my), 0);
  const dx = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair.x - mx) ** 2, 0));
  const dy = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair.y - my) ** 2, 0));
  return dx && dy ? numerator / (dx * dy) : null;
}

function pairedSessions(commodity?: Instrument, stock?: Instrument) {
  const futures = closeSeries(commodity);
  const shares = closeSeries(stock);
  const byNextSession = new Map<string, { x: number; gap: number; intraday: number; y: number }>();
  for (let i = 1; i < futures.length; i++) {
    const x = change(futures[i].close, futures[i - 1].close);
    if (x == null) continue;
    const index = shares.findIndex(bar => bar.date > futures[i].date && (new Date(bar.date).getTime() - new Date(futures[i].date).getTime()) <= 4 * 86400000);
    if (index < 1) continue;
    const stockBar = shares[index];
    const gap = change(stockBar.open, shares[index - 1].close);
    const intraday = change(stockBar.close, stockBar.open);
    const y = change(stockBar.close, shares[index - 1].close);
    if (gap != null && intraday != null && y != null) byNextSession.set(stockBar.date, { x, gap, intraday, y });
  }
  const pairs = [...byNextSession.values()].slice(-60);
  const events = pairs.filter(pair => Math.abs(pair.x) >= 2);
  return { count: pairs.length, correlation: correlation(pairs), eventCount: events.length, gap: average(events.map(pair => pair.gap)), intraday: average(events.map(pair => pair.intraday)) };
}

export default function GlobalMarkets({ refresh, indices, indicesLoading }: { refresh: number; indices: Record<string, any>[]; indicesLoading: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("copper");
  useEffect(() => {
    let active = true;
    fetch(`/global-markets.json?v=${refresh}-${Math.floor(Date.now() / 3600000)}`, { cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(`시황 데이터 요청 실패 (${response.status})`); return response.json() as Promise<Snapshot>; })
      .then(data => { if (active) { setSnapshot(data); setError(""); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "시황 데이터를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [refresh]);
  const selectedCommodity = commodities.find(item => item.id === selected)!;
  const selectedData = snapshot?.instruments[selected];
  const selectedMetrics = metrics(selectedData);
  const study = useMemo(() => pairedSessions(selectedData, selectedCommodity.stock ? snapshot?.instruments[selectedCommodity.stock] : undefined), [selectedData, selectedCommodity.stock, snapshot]);
  const market = (id: string) => indices.find(item => item.id === id);
  const environments = [
    { name: "나스닥100 선물", role: "미국 기술주 · 국내 반도체 심리", value: snapshot?.instruments.nasdaqFuture?.price, daily: metrics(snapshot?.instruments.nasdaqFuture).day, unit: "pt", source: "Yahoo Finance" },
    { name: "S&P500 선물", role: "글로벌 위험선호", value: snapshot?.instruments.spFuture?.price, daily: metrics(snapshot?.instruments.spFuture).day, unit: "pt", source: "Yahoo Finance" },
    { name: "코스피200 선물", role: "국내 대형주 · 선현물 수급", value: market("kospi200_futures")?.value, daily: market("kospi200_futures")?.changePercent, unit: "pt", source: "Signal K" },
    { name: "달러/원 환율", role: "수출기업 · 외국인 투자환경", value: market("usd_krw")?.value ?? snapshot?.instruments.usdkrw?.price, daily: market("usd_krw")?.changePercent ?? metrics(snapshot?.instruments.usdkrw).day, unit: "KRW", source: market("usd_krw") ? "Signal K" : "Yahoo Finance" },
  ];
  const chart = closeSeries(selectedData).slice(-60);
  return <div className="global-markets">
    <div className="page-title"><div><span className="kicker">GLOBAL MARKET MONITOR</span><h1>글로벌 시황</h1><p>원자재를 업종 필터로, 주가지수 선물과 환율을 시장환경 필터로 살펴보세요.</p></div><div className="page-icon"><Globe2/></div></div>
    <div className="global-meta"><span><span className="live-dot"/> 일별 시세 스냅샷 · {snapshot ? new Date(snapshot.generatedAt).toLocaleString("ko-KR") : "불러오는 중"}</span><span>출처: Yahoo Finance / Signal K · 지연 시세</span></div>
    {error && <div className="global-alert">{error} <button onClick={() => window.location.reload()}><RefreshCw size={14}/> 다시 시도</button></div>}
    <div className="section-title"><div><span className="kicker">COMMODITY WATCH</span><h2>글로벌 원자재 모니터링</h2></div></div>
    <div className="commodity-grid">{commodities.map(item => {
      const data = snapshot?.instruments[item.id]; const m = metrics(data);
      return <button key={item.id} className={`commodity-card ${selected === item.id ? "selected" : ""}`} onClick={() => setSelected(item.id)}>
        <span className="commodity-card-top"><span className="commodity-symbol">{item.id === "gold" ? "Au" : item.id === "copper" ? "Cu" : item.id === "iron" ? "Fe" : item.id === "aluminum" ? "Al" : item.id === "nickel" ? "Ni" : item.id === "jkm" ? "LNG" : "Oil"}</span><span className="commodity-role">{item.role}</span></span>
        <strong>{item.name}</strong><span className="commodity-price">{data ? format(m.price) : "시세 미연결"}<small>{data && item.unit}</small></span>
        <span className="commodity-change"><span className={tone(m.day)}>{percent(m.day)} <small>전일</small></span><span className={tone(m.five)}>{percent(m.five)} <small>5일</small></span></span>
      </button>;
    })}</div>
    <div className="global-detail">
      <section className="global-panel"><div className="global-panel-head"><div><span className="kicker">SELECTED CONTRACT</span><h3>{selectedCommodity.name} <small>{selectedData?.symbol || ""}</small></h3><p>{selectedCommodity.role}</p></div><a href={selectedCommodity.url} target="_blank" rel="noopener noreferrer" aria-label={`${selectedCommodity.name} 원문 시세 열기`}><ExternalLink size={17}/></a></div>
        {selectedData ? <><div className="global-price"><strong>{format(selectedMetrics.price)}</strong><span>{selectedCommodity.unit}</span><em className={tone(selectedMetrics.day)}>{percent(selectedMetrics.day)}</em></div><div className="global-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="globalGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#19b99a" stopOpacity={0.23}/><stop offset="100%" stopColor="#19b99a" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e8eff0" vertical={false}/><XAxis dataKey="date" tickFormatter={value => value.slice(5)} tick={{ fontSize: 10 }} minTickGap={28}/><YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={55}/><Tooltip formatter={(value) => format(Number(value))} labelFormatter={value => String(value)}/><Area dataKey="close" name="종가" stroke="#159b83" strokeWidth={2} fill="url(#globalGradient)" dot={false}/></AreaChart></ResponsiveContainer></div></> : <div className="global-unavailable">검증 가능한 공개 시세가 연결되지 않았습니다. 원문 거래소의 계약 정보를 확인할 수 있습니다.</div>}
      </section>
      <section className="global-panel"><div className="global-panel-head"><div><span className="kicker">CALCULATED SIGNALS</span><h3>가격 변화와 추세</h3><p>최근 거래일 종가를 기준으로 계산</p></div><Activity size={19}/></div><div className="global-metrics">
        <div><span>전일 대비</span><strong className={tone(selectedMetrics.day)}>{percent(selectedMetrics.day)}</strong></div>
        <div><span>최근 5거래일</span><strong className={tone(selectedMetrics.five)}>{percent(selectedMetrics.five)}</strong></div>
        <div><span>최근 20거래일</span><strong className={tone(selectedMetrics.twenty)}>{percent(selectedMetrics.twenty)}</strong></div>
        <div><span>20일 이동평균</span><strong>{format(selectedMetrics.ma20)}</strong></div>
        <div><span>60일 이동평균</span><strong>{format(selectedMetrics.ma60)}</strong></div>
        <div><span>52주 종가 범위 위치</span><strong>{selectedMetrics.position == null ? "—" : `${format(selectedMetrics.position, 1)}%`}</strong></div>
        <div><span>52주 종가 최저 / 최고</span><strong>{format(selectedMetrics.low)} / {format(selectedMetrics.high)}</strong></div>
        <div><span>근월 − 차근월</span><strong>{selectedMetrics.spread == null ? "—" : `${format(selectedMetrics.spread)} ${selectedCommodity.unit.split("/")[0]}`}</strong></div>
      </div><p className="global-footnote">{selectedData?.next ? `차근월물: ${selectedData.next.symbol} (${format(selectedData.next.price)}). 월물 가격의 관측 시각이 다를 수 있습니다.` : "차근월물 시세가 확인되지 않으면 월물 차이는 표시하지 않습니다."}</p></section>
    </div>
    <div className="section-title"><div><span className="kicker">MARKET REGIME</span><h2>주식 선물과 환율</h2></div></div>
    <div className="environment-grid">{environments.map(item => <div className="environment-card" key={item.name}><span>{item.name}</span><strong>{item.value == null ? "—" : `${format(item.value)} ${item.unit}`}</strong><em className={tone(item.daily ?? null)}>{percent(item.daily ?? null)}</em><small>{item.role}</small><small>{item.source}{indicesLoading && item.source === "Signal K" ? " · 로딩 중" : ""}</small></div>)}</div>
    <div className="global-detail global-analysis"><section className="global-panel"><div className="global-panel-head"><div><span className="kicker">SECTOR RESPONSE</span><h3>{selectedCommodity.name} ↔ {selectedCommodity.stockName || "관련 종목"}</h3><p>원자재 일별 등락과 다음 국내 거래일 주가 반응</p></div></div>{selectedCommodity.stock && study.count >= 20 ? <div className="global-metrics"><div><span>비교 종목</span><strong>{selectedCommodity.stockName}</strong></div><div><span>최근 60쌍 수익률 상관계수</span><strong>{study.correlation == null ? "—" : format(study.correlation, 2)}</strong></div><div><span>원자재 ±2% 이상 발생</span><strong>{study.eventCount}회</strong></div><div><span>다음 거래일 평균 시가 갭</span><strong className={tone(study.gap)}>{study.eventCount ? percent(study.gap) : "—"}</strong></div><div><span>다음 거래일 평균 장중 수익률</span><strong className={tone(study.intraday)}>{study.eventCount ? percent(study.intraday) : "—"}</strong></div></div> : <div className="global-unavailable">{selectedCommodity.stock ? "비교할 일별 종목 시세가 충분하지 않습니다." : "비교 종목이 지정되지 않았습니다. 업종별 매출·원가 노출을 먼저 확인하세요."}</div>}<p className="global-footnote">상관관계는 인과관계나 매매 신호가 아닙니다. 가격 반영 시차, 환율, 기업별 원가 구조와 헤지 여부를 함께 확인하세요.</p></section>
      <section className="global-panel"><div className="global-panel-head"><div><span className="kicker">SYSTEMATIC CHECKLIST</span><h3>매매 전 확인 순서</h3></div></div><ol className="global-steps"><li><strong>시장환경</strong><span>나스닥100·S&P500·코스피200 선물, 달러/원을 확인합니다.</span></li><li><strong>업종 노출</strong><span>원자재 상승이 기업의 매출·마진에 미치는 방향을 확인합니다.</span></li><li><strong>과거 반응</strong><span>전날 원자재 급등락 후 국내 종목의 시가 갭과 장중 수익률을 비교합니다.</span></li><li><strong>전략 검증</strong><span>시초가 매매·변동성 돌파는 거래비용을 포함한 백테스트 후 판단합니다.</span></li></ol></section></div>
    <p className="global-disclaimer"><ArrowRight size={15}/> 일별 지연 시세 기반 참고 화면입니다. JKM·니켈은 검증 가능한 시세가 연결되기 전까지 값을 표시하지 않습니다.</p>
  </div>;
}
