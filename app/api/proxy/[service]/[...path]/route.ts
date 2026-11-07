import { NextRequest, NextResponse } from "next/server";

const origin = "https://stock-neocode.cloud";
const allowed = [
  /^SignalC\/(chart-patterns|candle-patterns|pattern-search|candles)(\/|$)/,
  /^Krx\/stocks\/search$/,
  /^PublicData\/(stocks|stock-price)(\/|$)/,
  /^(MajorMarketIndex|News|UnifiedDisclosure|UnifiedFeed|DisclosureArchive|CandlePatterns|Candles|TechnicalSignals|LsTheme|KiwoomInvestorTrading|StockNews|NotificationSettings|Push)(\/|$)/,
];
const tokenCache = new Map<string, { token: string; until: number }>();

async function tokenFor(device: string) {
  const cached = tokenCache.get(device);
  if (cached && cached.until > Date.now() + 120000) return cached.token;
  const response = await fetch(`${origin}/api/Auth/token`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: device }), cache: "no-store",
  });
  if (!response.ok) throw new Error(`인증 요청 실패 (${response.status})`);
  const data = await response.json() as { token?: string; expiresInMinutes?: number };
  if (!data.token) throw new Error("인증 토큰이 없습니다.");
  tokenCache.set(device, { token: data.token, until: Date.now() + (data.expiresInMinutes || 30) * 60000 });
  return data.token;
}

async function handle(request: NextRequest, context: { params: Promise<{ service: string; path: string[] }> }) {
  const { service, path } = await context.params;
  if (!["p", "c", "k"].includes(service)) return NextResponse.json({ error: "알 수 없는 서비스" }, { status: 400 });
  const endpoint = path.map(decodeURIComponent).join("/");
  if (!allowed.some(pattern => pattern.test(endpoint))) return NextResponse.json({ error: "허용되지 않은 API" }, { status: 403 });
  const target = new URL(`/api/${endpoint}`, origin);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const headers: Record<string, string> = { accept: "application/json" };
  try {
    if (service === "k") {
      const device = request.headers.get("x-device-id") || "";
      if (!/^[a-zA-Z0-9-]{16,80}$/.test(device)) return NextResponse.json({ error: "기기 ID가 올바르지 않습니다." }, { status: 400 });
      headers.authorization = `Bearer ${await tokenFor(device)}`;
    } else headers.package = service === "p" ? "com.neocode.signalp" : "com.neocode.signalc";
    const upstream = await fetch(target, { method: "GET", headers, cache: "no-store", signal: AbortSignal.timeout(16000) });
    const content = await upstream.text();
    return new NextResponse(content, { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") || "application/json", "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "서버 연결에 실패했습니다." }, { status: 502 });
  }
}

export const GET = handle;
