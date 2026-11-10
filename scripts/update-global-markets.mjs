import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(import.meta.dirname, "../public/global-markets.json");
const symbols = {
  wti: { symbol: "CL=F", contract: "CL" },
  brent: { symbol: "BZ=F", contract: "BZ" },
  copper: { symbol: "HG=F", contract: "HG" },
  iron: { symbol: "TIO=F", contract: "TIO" },
  gold: { symbol: "GC=F", contract: "GC" },
  aluminum: { symbol: "ALI=F", contract: "ALI" },
  nasdaqFuture: { symbol: "NQ=F", contract: "NQ" },
  spFuture: { symbol: "ES=F", contract: "ES" },
  usdkrw: { symbol: "KRW=X" },
  ls: { symbol: "006260.KS" },
  so: { symbol: "010950.KS" },
  posco: { symbol: "005490.KS" },
  sk: { symbol: "096770.KS" },
  samsungSdi: { symbol: "006400.KS" },
};
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthCodes = "FGHJKMNQUVXZ";

async function json(url) {
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 SysTradeHub/1.0", accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}
async function chart(symbol, range = "1y") {
  const data = await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`);
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`${symbol}: ${data.chart?.error?.description || "시세 없음"}`);
  const quote = result.indicators?.quote?.[0] || {};
  const tz = result.meta?.exchangeTimezoneName || "UTC";
  const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const series = (result.timestamp || []).map((time, i) => ({
    date: dateFormat.format(new Date(time * 1000)),
    open: quote.open?.[i], close: quote.close?.[i],
  })).filter(row => Number.isFinite(row.close) && Number.isFinite(row.open));
  const meta = result.meta || {};
  const quotedAt = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : null;
  const lastBarDate = series.at(-1)?.date;
  const quoteIsCurrent = quotedAt && lastBarDate && quotedAt.getTime() >= new Date(`${lastBarDate}T00:00:00Z`).getTime() - 3 * 86400000;
  return {
    symbol, name: meta.shortName || meta.longName || symbol, currency: meta.currency || "USD",
    price: quoteIsCurrent && Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : series.at(-1)?.close ?? null,
    previousClose: Number.isFinite(meta.previousClose) ? meta.previousClose : (series.length > 1 ? series.at(-2).close : null),
    marketTime: quoteIsCurrent ? quotedAt.toISOString() : lastBarDate ? `${lastBarDate}T00:00:00.000Z` : null,
    series,
  };
}
async function nextContract(code, frontName) {
  const match = frontName.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[- ](\d{2,4})\b/i);
  if (!match) return null;
  const frontMonth = monthNames.findIndex(name => name.toLowerCase() === match[1].toLowerCase());
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  for (let step = 1; step <= 3; step++) {
    const month = (frontMonth + step) % 12;
    const candidateYear = year + Math.floor((frontMonth + step) / 12);
    const query = `${code}${monthCodes[month]}${String(candidateYear).slice(-2)}`;
    try {
      const search = await json(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`);
      const found = search.quotes?.find(item => item.quoteType === "FUTURE" && item.symbol?.startsWith(`${query}.`));
      if (!found) continue;
      const next = await chart(found.symbol, "5d");
      if (Number.isFinite(next.price) && next.price > 0) return { symbol: next.symbol, name: next.name, price: next.price, marketTime: next.marketTime };
    } catch (error) { console.warn(`Next contract ${query}: ${error.message}`); }
  }
  return null;
}

let previous = { instruments: {} };
try { previous = JSON.parse(await readFile(output, "utf8")); } catch {}
const instruments = {};
for (const [id, config] of Object.entries(symbols)) {
  try {
    const data = await chart(config.symbol);
    instruments[id] = { ...data, ...(config.contract ? { next: await nextContract(config.contract, data.name) } : {}) };
    console.log(`${id}: ${data.series.length} bars${instruments[id].next ? `, next ${instruments[id].next.symbol}` : ""}`);
  } catch (error) {
    console.warn(`${id}: ${error.message}`);
    if (previous.instruments?.[id]) instruments[id] = previous.instruments[id];
  }
}
if (!instruments.wti?.series?.length || !instruments.copper?.series?.length) throw new Error("필수 원자재 시세를 가져오지 못했습니다.");
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), source: "Yahoo Finance daily chart", instruments })}\n`);
