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
// /serie-a/squadre/<team-slug>/<player-slug>/<id>
const PLAYER_LINK_RE = /href="(https:\/\/www\.fantacalcio\.it)?\/serie-a\/squadre\/([a-z0-9-]+)\/([a-z0-9-]+)\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;

const TEAM_SLUG_TO_NAME: Record<string, string> = {
  "atalanta": "Atalanta", "bologna": "Bologna", "cagliari": "Cagliari",
  "como": "Como", "fiorentina": "Fiorentina", "frosinone": "Frosinone",
  "genoa": "Genoa", "inter": "Inter", "juventus": "Juventus", "lazio": "Lazio",
  "lecce": "Lecce", "milan": "Milan", "monza": "Monza", "napoli": "Napoli",
  "parma": "Parma", "roma": "Roma", "sassuolo": "Sassuolo", "torino": "Torino",
  "udinese": "Udinese", "venezia": "Venezia",
};

interface PlayerLink { team: string; name: string; id: string; pos: number; }

function extractPlayerLinks(html: string): PlayerLink[] {
  const out: PlayerLink[] = [];
  PLAYER_LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLAYER_LINK_RE.exec(html)) !== null) {
    const teamSlug = m[2];
    const team = TEAM_SLUG_TO_NAME[teamSlug];
    if (!team) continue;
    const name = m[5].replace(/<[^>]*>/g, "").trim();
    if (!name) continue;
    out.push({ team, name, id: m[4], pos: m.index });
  }
  return out;
}

function parseProbabiliFormazioni(html: string): { matchday: number | null; teams: Record<string, { titolari: string[]; panchina: string[] }> } {
  let matchday: number | null = null;
  const mdMatch = html.match(/Giornata\s+(\d+)/i);
  if (mdMatch) matchday = parseInt(mdMatch[1]);

  const teams: Record<string, { titolari: string[]; panchina: string[] }> = {};
  const links = extractPlayerLinks(html);
  if (links.length === 0) return { matchday, teams };

  const seen = new Map<string, string[]>();
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
    const linkMatch = rowHtml.match(/\/serie-a\/squadre\/([a-z0-9-]+)\/([a-z0-9-]+)\/\d+/i);
    if (!linkMatch) continue;
    const squadra = TEAM_SLUG_TO_NAME[linkMatch[1].toLowerCase()];
    if (!squadra) continue;
    const nameMatch = rowHtml.match(/\/serie-a\/squadre\/[a-z0-9-]+\/[a-z0-9-]+\/\d+"[^>]*>([\s\S]*?)<\/a>/i);
    const nome = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, "").trim() : "";
    if (!nome) continue;
    const nums = cells.filter((c) => /^-?\d+([.,]\d+)?$/.test(c));
    const toNum = (s: string) => parseFloat(s.replace(",", ".")) || 0;
    const pv = toNum(nums[0] ?? "0");
    const fm = toNum(nums[2] ?? "0");
    const gol = Math.round(toNum(nums[3] ?? "0"));
    const golSubiti = Math.round(toNum(nums[4] ?? "0"));
    const assist = Math.round(toNum(nums[6] ?? "0"));
    out.push({ nome, squadra, pv, fm, gol, golSubiti, assist });
  }
  return out;
}

function parseCoaches(html: string): { squadra: string; allenatore: string; statuso: string }[] {
  const out: { squadra: string; allenatore: string; statuso: string }[] = [];
  const capRe = /<p class="c-gallery-item__caption"><b>([^<]+)<\/b>/g;
  let m: RegExpExecArray | null;
  while ((m = capRe.exec(html)) !== null) {
    const caption = m[1];
    const sep = caption.indexOf(" - ");
    if (sep === -1) continue;
    const teamName = caption.slice(0, sep).trim();
    const squadra = TEAM_SLUG_TO_NAME[teamName.toLowerCase()];
    if (!squadra) continue;
    const rest = caption.slice(sep + 3).trim();
    const statusMatch = rest.match(/\(([^)]+)\)\s*$/);
    const statuso = statusMatch ? statusMatch[1].trim().toLowerCase() : "confermato";
    const allenatore = (statusMatch ? rest.slice(0, statusMatch.index) : rest).trim();
    if (!allenatore) continue;
    out.push({ squadra, allenatore, statuso });
  }
  return out;
}

function parseEsonerati(html: string): { squadra: string; allenatore: string; statuso: string }[] {
  const out: { squadra: string; allenatore: string; statuso: string }[] = [];
  const capRe = /<p class="c-gallery-item__caption"><b>([^<]+)<\/b>/g;
  const seenTeams = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = capRe.exec(html)) !== null) {
    const caption = m[1].trim().toUpperCase();
    if (caption.includes('ANNO SCORSO') || caption.includes('CAMBI DI ALLENATORE')) continue;
    const matchOfficial = caption.match(/^([A-Z]+),?\s+.*UFFICIALE\s+([A-Z'\s]+?)\s+PER\s+IL\s+POST\s+([A-Z'\s]+)/);
    if (matchOfficial) {
      const squadra = TEAM_SLUG_TO_NAME[matchOfficial[1].toLowerCase()];
      if (squadra && !seenTeams.has(squadra)) {
        seenTeams.add(squadra);
        out.push({ squadra, allenatore: matchOfficial[2].trim(), statuso: 'nuovo' });
        continue;
      }
    }
    const matchNuovo = caption.match(/([A-Z'\s]+?)\s+NUOVO\s+ALLENATORE\s+DEL?L?['\s]*([A-Z]+)/);
    if (matchNuovo) {
      const squadra = TEAM_SLUG_TO_NAME[matchNuovo[2].toLowerCase()];
      if (squadra && !seenTeams.has(squadra)) {
        seenTeams.add(squadra);
        out.push({ squadra, allenatore: matchNuovo[1].trim(), statuso: 'nuovo' });
        continue;
      }
    }
  }
  return out;
}

function normalizeWsTeam(name: string): string | null {
  const t = name.trim();
  if (t === 'AC Milan' || t === 'Milan') return 'Milan';
  if (t === 'Parma Calcio 1913' || t === 'Parma') return 'Parma';
  return TEAM_SLUG_TO_NAME[t.toLowerCase()] ?? null;
}

function parseStandings(html: string): {
  posizione: number; squadra: string; gare: number; vittorie: number; pareggi: number;
  sconfitte: number; gol_fatti: number; gol_subiti: number; punti: number;
}[] {
  const out: { posizione: number; squadra: string; gare: number; vittorie: number; pareggi: number; sconfitte: number; gol_fatti: number; gol_subiti: number; punti: number; }[] = [];
  const rowRe = /\|\s*(\d+)\[([^\]]+)\]\(https:\/\/www\.whoscored\.com\/teams\/\d+[^)]*\)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*[+-]?\d+\s*\|\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const squadra = normalizeWsTeam(m[2]);
    if (!squadra) continue;
    out.push({
      posizione: parseInt(m[1]), squadra,
      gare: parseInt(m[3]), vittorie: parseInt(m[4]),
      pareggi: parseInt(m[5]), sconfitte: parseInt(m[6]),
      gol_fatti: parseInt(m[7]), gol_subiti: parseInt(m[8]),
      punti: parseInt(m[9]),
    });
  }
  return out;
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
    const data: {
      formations?: { matchday: number; squadra: string; titolari: string[]; panchina: string[] }[];
      injuries?: { matchday: number; squadra: string; players: { nome: string; nota?: string }[] }[];
      stats?: { nome: string; squadra: string; gol: number; assist: number; fm: number; pv: number }[];
      coaches?: { squadra: string; allenatore: string; statuso: string }[];
      standings?: { posizione: number; squadra: string; gare: number; vittorie: number; pareggi: number; sconfitte: number; gol_fatti: number; gol_subiti: number; punti: number }[];
    } = {};

    // Check last sync time from the database (unless forced)
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

    // Load data source URLs from the database
    const { data: sourceRows } = await supabase
      .from("data_sources")
      .select("source_key, label, url, parser_type, enabled")
      .order("created_at", { ascending: true });
    const sourceMap = new Map<string, { url: string; parser_type: string }>();
    for (const r of sourceRows ?? []) {
      if (!r.enabled) continue;
      sourceMap.set(r.source_key, { url: r.url, parser_type: r.parser_type });
    }
    const getSourceUrl = (key: string): string | null => {
      const entry = sourceMap.get(key);
      return entry ? entry.url : null;
    };

    // 1. Probabili formazioni
    if (shouldFetch("formazioni")) {
      try {
        const srcUrl = getSourceUrl("formazioni");
        if (!srcUrl) throw new Error("Nessun URL configurato per 'formazioni'");
        const html = await fetchWithTimeout(srcUrl);
        const { matchday: md, teams } = parseProbabiliFormazioni(html);
        const mdToUse = matchday ?? md ?? 0;
        if (mdToUse != null) currentMatchday = mdToUse;
        const formations: typeof data.formations = [];
        let count = 0;
        for (const [squadra, fdata] of Object.entries(teams)) {
          formations.push({ matchday: mdToUse, squadra, titolari: fdata.titolari, panchina: fdata.panchina });
          count++;
        }
        data.formations = formations;
        results.formazioni = { status: "ok", count };
        await supabase.from("data_sync_log").insert({ source: "fantacalcio_formazioni", status: `ok:${count}` });
      } catch (e) {
        results.formazioni = { status: "error", error: (e as Error).message };
        await supabase.from("data_sync_log").insert({ source: "fantacalcio_formazioni", status: `error:${(e as Error).message}` });
      }
    }

    // 2. Infortunati
    if (shouldFetch("infortunati")) {
      try {
        const srcUrl = getSourceUrl("infortunati");
        if (!srcUrl) throw new Error("Nessun URL configurato per 'infortunati'");
        const html = await fetchWithTimeout(srcUrl);
        const parsed = parseInjuries(html);
        const injuries: typeof data.injuries = [];
        let count = 0;
        for (const [squadra, players] of Object.entries(parsed)) {
          injuries.push({ matchday: currentMatchday ?? 0, squadra, players });
          count++;
        }
        data.injuries = injuries;
        results.infortunati = { status: "ok", count };
        await supabase.from("data_sync_log").insert({ source: "fantacalcio_infortunati", status: `ok:${count}` });
      } catch (e) {
        results.infortunati = { status: "error", error: (e as Error).message };
        await supabase.from("data_sync_log").insert({ source: "fantacalcio_infortunati", status: `error:${(e as Error).message}` });
      }
    }

    // 3. Statistiche
    if (shouldFetch("stats")) {
      try {
        const srcUrl = getSourceUrl("stats");
        if (!srcUrl) throw new Error("Nessun URL configurato per 'stats'");
        const html = await fetchWithTimeout(srcUrl);
        const parsed = parseStats(html);
        const stats = parsed.map((p) => ({ nome: p.nome, squadra: p.squadra, gol: p.gol, assist: p.assist, fm: p.fm, pv: p.pv }));
        data.stats = stats;
        results.stats = { status: "ok", count: stats.length };
        await supabase.from("data_sync_log").insert({ source: "fantacalcio_stats", status: `ok:${stats.length}` });
      } catch (e) {
        results.stats = { status: "error", error: (e as Error).message };
        await supabase.from("data_sync_log").insert({ source: "fantacalcio_stats", status: `error:${(e as Error).message}` });
      }
    }

    // 4. Allenatori
    if (shouldFetch("allenatori")) {
      try {
        const srcUrl = getSourceUrl("allenatori");
        if (!srcUrl) throw new Error("Nessun URL configurato per 'allenatori'");
        const html = await fetchWithTimeout(srcUrl, 25000);
        const parsed = parseCoaches(html);
        data.coaches = parsed;
        results.allenatori = { status: "ok", count: parsed.length };
        await supabase.from("data_sync_log").insert({ source: "sky_allenatori", status: `ok:${parsed.length}` });
      } catch (e) {
        results.allenatori = { status: "error", error: (e as Error).message };
        await supabase.from("data_sync_log").insert({ source: "sky_allenatori", status: `error:${(e as Error).message}` });
      }
    }

    // 5. Allenatori esonerati
    if (shouldFetch("esonerati")) {
      try {
        const srcUrl = getSourceUrl("esonerati");
        if (!srcUrl) throw new Error("Nessun URL configurato per 'esonerati'");
        const html = await fetchWithTimeout(srcUrl, 25000);
        const parsed = parseEsonerati(html);
        // Merge: override coaches with "nuovo" status
        if (data.coaches) {
          for (const c of parsed) {
            if (c.statuso === "nuovo") {
              const idx = data.coaches.findIndex((x) => x.squadra === c.squadra);
              if (idx >= 0) data.coaches[idx] = c;
              else data.coaches.push(c);
            }
          }
        }
        results.esonerati = { status: "ok", count: parsed.length };
        await supabase.from("data_sync_log").insert({ source: "sky_esonerati", status: `ok:${parsed.length}` });
      } catch (e) {
        results.esonerati = { status: "error", error: (e as Error).message };
        await supabase.from("data_sync_log").insert({ source: "sky_esonerati", status: `error:${(e as Error).message}` });
      }
    }

    // 6. Classifica
    if (shouldFetch("classifica")) {
      try {
        const srcUrl = getSourceUrl("classifica");
        if (!srcUrl) throw new Error("Nessun URL configurato per 'classifica'");
        const html = await fetchWithTimeout(srcUrl, 25000);
        const parsed = parseStandings(html);
        if (parsed.length === 0) throw new Error("Nessuna riga di classifica riconosciuta");
        data.standings = parsed;
        results.classifica = { status: "ok", count: parsed.length };
        await supabase.from("data_sync_log").insert({ source: "whoscored_classifica", status: `ok:${parsed.length}` });
      } catch (e) {
        results.classifica = { status: "error", error: (e as Error).message };
        await supabase.from("data_sync_log").insert({ source: "whoscored_classifica", status: `error:${(e as Error).message}` });
      }
    }

    return new Response(
      JSON.stringify({ message: "Sync completed", results, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
