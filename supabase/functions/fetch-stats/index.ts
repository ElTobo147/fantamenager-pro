import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// fantacalcio.it player links look like
// /serie-a/squadre/<team-slug>/<player-slug>/<id> — the team slug lets us attribute
// a player to the right squad even when the page structure changes around it.
const PLAYER_LINK_RE = /href="(https:\/\/www\.fantacalcio\.it)?\/serie-a\/squadre\/([a-z0-9-]+)\/([a-z0-9-]+)\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;

const TEAM_SLUG_TO_NAME: Record<string, string> = {
  "atalanta": "Atalanta", "bologna": "Bologna", "cagliari": "Cagliari",
  "como": "Como", "fiorentina": "Fiorentina", "frosinone": "Frosinone",
  "genoa": "Genoa", "inter": "Inter", "juventus": "Juventus", "lazio": "Lazio",
  "lecce": "Lecce", "milan": "Milan", "monza": "Monza", "napoli": "Napoli",
  "parma": "Parma", "roma": "Roma", "sassuolo": "Sassuolo", "torino": "Torino",
  "udinese": "Udinese", "venezia": "Venezia",
};

function titleizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
    .replace(/\bSe\b$/, "Se.")
    .replace(/\bFp\b$/, "F.P.")
    .replace(/\bA\b$/, "A.")
    .replace(/\bJ\b$/, "J.")
    .replace(/\bK\b$/, "K.")
    .replace(/\bHj\b$/, "Hj.")
    .replace(/\bJu\b$/, "Ju.")
    .replace(/\bAl\b$/, "Al.")
    .replace(/\bM\b$/, "M.")
    .replace(/\bLu\b$/, "Lu.")
    .replace(/\bLo\b$/, "Lo.")
    .replace(/\bD\b$/, "D.");
}

interface PlayerLink { team: string; name: string; id: string; pos: number; }

function extractPlayerLinks(html: string): PlayerLink[] {
  const out: PlayerLink[] = [];
  PLAYER_LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLAYER_LINK_RE.exec(html)) !== null) {
    const teamSlug = m[2];
    const team = TEAM_SLUG_TO_NAME[teamSlug];
    if (!team) continue;
    // Skip image-only links; keep the inner text as the display name
    const name = m[5].replace(/<[^>]*>/g, "").trim();
    if (!name) continue;
    out.push({ team, name, id: m[4], pos: m.index });
  }
  return out;
}

// The formations page is a sequence of match blocks; each block lists 22 starting
// players (11 per side) then the bench options. We split the HTML at the per-match
// "### <Team>" headings so names land under the right team.
function parseProbabiliFormazioni(html: string): { matchday: number | null; teams: Record<string, { titolari: string[]; panchina: string[] }> } {
  let matchday: number | null = null;
  const mdMatch = html.match(/Giornata\s+(\d+)/i);
  if (mdMatch) matchday = parseInt(mdMatch[1]);

  const teams: Record<string, { titolari: string[]; panchina: string[] }> = {};
  const links = extractPlayerLinks(html);
  if (links.length === 0) return { matchday, teams };

  // Heuristic: the page renders every team's XI first (11 links, in team pairs),
  // followed by bench names. Group links by team and split by positional order:
  // within one match block the first 11 names belong to the two XIs. Since we cannot
  // reliably see block boundaries, use the alternating-pair structure: names come in
  // per-match runs where each team contributes 11 titolari. Track per team until we
  // have 11, then the rest are panchina.
  const seen = new Map<string, string[]>(); // team -> ordered unique names
  const key = (t: string, n: string) => `${t}|${n.toLowerCase()}`;
  const dupes = new Set<string>();
  for (const l of links) {
    const k = key(l.team, l.name);
    if (dupes.has(k)) continue;
    dupes.add(k);
    const arr = seen.get(l.team) ?? [];
    arr.push(l.name);
    seen.set(l.team, arr);
  }
  for (const [team, names] of seen) {
    if (names.length < 11) continue;
    teams[team] = {
      titolari: names.slice(0, 11),
      panchina: names.slice(11),
    };
  }
  return { matchday, teams };
}

// The injuries page has one <section id="team-<id>"> per team with
// <span class="team-name">Atalanta</span> and a list of
// <strong class="item-name">Cognome</strong> + <div class="item-description"><p>nota</p></div>.
function parseInjuries(html: string): Record<string, { nome: string; nota: string }[]> {
  const result: Record<string, { nome: string; nota: string }[]> = {};
  const sectionRe = /<(?:div|section|article)[^>]*id="team-\d+"[^>]*>/gi;
  const starts: number[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = sectionRe.exec(html)) !== null) starts.push(sm.index);
  for (let i = 0; i < starts.length; i++) {
    const seg = html.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : starts[i] + 20000);
    const nameMatch = seg.match(/<span class="team-name">([^<]+)<\/span>/);
    if (!nameMatch) continue;
    const squadra = nameMatch[1].trim();
    if (!TEAM_SLUG_TO_NAME[squadra.toLowerCase().replace(/\s+/g, "-")]) continue;
    const players: { nome: string; nota: string }[] = [];
    const itemRe = /<strong class="item-name">([^<]+)<\/strong>(?:[\s\S]*?<div class="item-description"><p>([\s\S]*?)<\/p><\/div>)?/g;
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(seg)) !== null) {
      const nome = im[1].trim();
      if (!nome) continue;
      const nota = (im[2] ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      players.push({ nome, nota });
    }
    if (players.length > 0) result[squadra] = players;
  }
  return result;
}

// The stats page table rows carry player link + team abbrev + PV/MV/FM/gol/gs/rigori/
// rp/assist/amm/esp cells in a fixed order. Parse each row's cells.
function parseStats(html: string): { nome: string; squadra: string; pv: number; fm: number; gol: number; golSubiti: number; assist: number }[] {
  const out: { nome: string; squadra: string; pv: number; fm: number; gol: number; golSubiti: number; assist: number }[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const rowHtml = row[1];
    if (!rowHtml.includes("/serie-a/squadre/")) continue;
    const cells: string[] = [];
    let cm: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      cells.push(cm[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());
    }
    // find player link + team slug inside this row
    const linkMatch = rowHtml.match(/\/serie-a\/squadre\/([a-z0-9-]+)\/([a-z0-9-]+)\/\d+/i);
    if (!linkMatch) continue;
    const squadra = TEAM_SLUG_TO_NAME[linkMatch[1].toLowerCase()];
    if (!squadra) continue;
    const nameText = linkMatch[0]; // not used for name; use cell text below
    // The first cell containing the player link has the display name; re-derive from row html
    const nameMatch = rowHtml.match(/\/serie-a\/squadre\/[a-z0-9-]+\/[a-z0-9-]+\/\d+"[^>]*>([\s\S]*?)<\/a>/i);
    const nome = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    if (!nome) continue;
    // Numeric cells after the name: PV, MV, FM, Gol, GS, Rig(t/f), RP, Ass, Amm, Esp
    const nums = cells.filter((c) => /^-?\d+([.,]\d+)?$/.test(c));
    const toNum = (s: string) => parseFloat(s.replace(",", ".")) || 0;
    // PV=nums[0], MV=nums[1], FM=nums[2], Gol=nums[3], GS=nums[4], rigori "x / y" is one cell (skipped by filter), RP, Ass, Amm, Esp
    const pv = toNum(nums[0] ?? "0");
    const fm = toNum(nums[2] ?? "0");
    const gol = Math.round(toNum(nums[3] ?? "0"));
    const golSubiti = Math.round(toNum(nums[4] ?? "0"));
    const assist = Math.round(toNum(nums[6] ?? "0"));
    void nameText;
    out.push({ nome, squadra, pv, fm, gol, golSubiti, assist });
  }
  return out;
}

function logSync(source: string, status: string) {
  return supabase.from("data_sync_log").insert({ source, status });
}

async function fetchWithTimeout(url: string, timeoutMs = 20000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const sources = url.searchParams.get("sources")?.split(",") || ["all"];
    const matchdayParam = url.searchParams.get("matchday");
    const matchday = matchdayParam ? parseInt(matchdayParam) : null;

    const results: Record<string, { status: string; count?: number; error?: string }> = {};

    // Check last sync time (unless forced)
    if (!force) {
      const { data: lastSync } = await supabase
        .from("data_sync_log")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastSync) {
        const age = Date.now() - new Date(lastSync.fetched_at).getTime();
        if (age < 6 * 60 * 60 * 1000) {
          return new Response(
            JSON.stringify({ message: "Data synced recently. Use ?force=true to override.", lastSync: lastSync.fetched_at }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const shouldFetch = (s: string) => sources.includes("all") || sources.includes(s);
    let currentMatchday = matchday;

    // 1. Probabili formazioni -> team_formations
    if (shouldFetch("formazioni")) {
      try {
        const html = await fetchWithTimeout("https://www.fantacalcio.it/probabili-formazioni-serie-a");
        const { matchday: md, teams } = parseProbabiliFormazioni(html);
        const mdToUse = matchday ?? md;
        if (mdToUse != null) currentMatchday = mdToUse;
        let count = 0;
        for (const [squadra, data] of Object.entries(teams)) {
          const { error } = await supabase.from("team_formations").upsert({
            matchday: mdToUse, squadra, titolari: data.titolari, panchina: data.panchina,
          }, { onConflict: "matchday,squadra" });
          if (!error) count++;
        }
        results.formazioni = { status: "ok", count };
        await logSync("fantacalcio_formazioni", `ok:${count}`);
      } catch (e) {
        results.formazioni = { status: "error", error: (e as Error).message };
        await logSync("fantacalcio_formazioni", `error:${(e as Error).message}`);
      }
    }

    // 2. Infortunati -> team_injuries
    if (shouldFetch("infortunati")) {
      try {
        const html = await fetchWithTimeout("https://www.fantacalcio.it/infortunati-serie-a");
        const parsed = parseInjuries(html);
        let count = 0;
        for (const [squadra, players] of Object.entries(parsed)) {
          const { error } = await supabase.from("team_injuries").upsert({
            matchday: currentMatchday ?? 0, squadra, players,
          }, { onConflict: "matchday,squadra" });
          if (!error) count++;
        }
        results.infortunati = { status: "ok", count };
        await logSync("fantacalcio_infortunati", `ok:${count}`);
      } catch (e) {
        results.infortunati = { status: "error", error: (e as Error).message };
        await logSync("fantacalcio_infortunati", `error:${(e as Error).message}`);
      }
    }

    // 3. Statistiche -> player_stats
    if (shouldFetch("stats")) {
      try {
        const html = await fetchWithTimeout("https://www.fantacalcio.it/statistiche-serie-a");
        const parsed = parseStats(html);
        let count = 0;
        for (const p of parsed) {
          const { error } = await supabase.from("player_stats").upsert({
            nome: p.nome, squadra: p.squadra, gol: p.gol, assist: p.assist,
            fm: p.fm, pv: p.pv,
          }, { onConflict: "nome,squadra" });
          if (!error) count++;
        }
        results.stats = { status: "ok", count };
        await logSync("fantacalcio_stats", `ok:${count}`);
      } catch (e) {
        results.stats = { status: "error", error: (e as Error).message };
        await logSync("fantacalcio_stats", `error:${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ message: "Sync completed", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
