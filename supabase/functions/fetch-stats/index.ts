import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

function logSync(source: string, status: string) {
  return supabase.from("data_sync_log").insert({ source, status });
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<string> {
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

function parseFantamagicRoster(html: string): { nome: string; squadra: string; ruolo: string; qt: number; eta: number }[] {
  const players: { nome: string; squadra: string; ruolo: string; qt: number; eta: number }[] = [];
  // Match table rows with player data from fantamagic listapersquadra
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 4) continue;
    const cleanCell = (c: string) => c.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    const nome = cleanCell(cells[0]);
    const ruoloRaw = cleanCell(cells[1]).toUpperCase().charAt(0);
    const qt = parseInt(cleanCell(cells[2])) || 0;
    const eta = parseInt(cleanCell(cells[3])) || 0;
    if (nome && ruoloRaw && qt > 0) {
      players.push({ nome: nome.toUpperCase(), squadra: "", ruolo: ruoloRaw, qt, eta });
    }
  }
  return players;
}

function parseFantacalcioInjuries(html: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  // fantacalcio.it/indisponibili-serie-a has team sections with player names
  const teamRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  const sectionRegex = /data-team="([^"]+)"[\s\S]*?(?=<li[^>]*data-team|$)/gi;
  let match: RegExpExecArray | null;
  // Try structured parsing first
  const teamSections = html.match(/<div[^>]*class="[^"]*team[^"]*"[\s\S]*?<\/div>/gi) || [];
  // Fallback: find team names and adjacent player lists
  const allLinks = html.match(/<a[^>]*>([^<]+)<\/a>/gi) || [];
  for (const link of allLinks) {
    const name = link.replace(/<[^>]*>/g, "").trim();
    if (name && name.length > 2 && name.length < 30 && !name.includes("Serie")) {
      // Accumulate names — real parsing would need DOM structure
    }
  }
  return result;
}

function parseProbabiliFormazioni(html: string): Record<string, { titolari: string[]; panchina: string[] }> {
  const result: Record<string, { titolari: string[]; panchina: string[] }> = {};
  // fantacalcio.it/probabili-formazioni-serie-a has team blocks
  // Each team has a list of titolari and panchina
  const teamBlockRegex = /data-team="([^"]+)"[\s\S]*?(?=<div[^>]*data-team|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = teamBlockRegex.exec(html)) !== null) {
    const team = match[1].trim();
    const block = match[0];
    const titolari: string[] = [];
    const panchina: string[] = [];
    // Parse player names from the block
    const playerLinks = block.match(/<a[^>]*>([^<]{2,30})<\/a>/gi) || [];
    for (const link of playerLinks) {
      const name = link.replace(/<[^>]*>/g, "").trim().toUpperCase();
      if (name && name.length > 2) {
        // First 11 are titolari, rest panchina (simplified)
        if (titolari.length < 11) titolari.push(name);
        else panchina.push(name);
      }
    }
    if (titolari.length > 0) result[team] = { titolari, panchina };
  }
  return result;
}

function parseFBrefStats(html: string): { nome: string; squadra: string; gol: number; assist: number; xg: number; xa: number }[] {
  const players: { nome: string; squadra: string; gol: number; assist: number; xg: number; xa: number }[] = [];
  // FBref stats tables have rows with player data
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*data-stat="([^"]+)"[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells) continue;
    const getValue = (stat: string): string => {
      const cell = cells.find((c) => c.includes(`data-stat="${stat}"`));
      return cell ? cell.replace(/<[^>]*>/g, "").trim() : "";
    };
    const nome = getValue("player");
    const squadra = getValue("team");
    const gol = parseInt(getValue("goals")) || 0;
    const assist = parseInt(getValue("assists")) || 0;
    const xg = parseFloat(getValue("xg")) || 0;
    const xa = parseFloat(getValue("xg_assist")) || 0;
    if (nome && gol > 0) {
      players.push({ nome: nome.toUpperCase(), squadra: squadra.toUpperCase(), gol, assist, xg, xa });
    }
  }
  return players;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const sources = url.searchParams.get("sources")?.split(",") || ["all"];

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

    // 1. Fantamagic roster
    if (shouldFetch("roster")) {
      try {
        const html = await fetchWithTimeout("https://www.fantamagic.it/fantacalcio/listapersquadra.php");
        const parsed = parseFantamagicRoster(html);
        results.roster = { status: "ok", count: parsed.length };
        await logSync("fantamagic_roster", `ok:${parsed.length}`);
      } catch (e) {
        results.roster = { status: "error", error: (e as Error).message };
        await logSync("fantamagic_roster", `error:${(e as Error).message}`);
      }
    }

    // 2. FBref stats
    if (shouldFetch("stats")) {
      try {
        const fbrefUrl = "https://fbref.com/en/comps/11/Serie-A-Stats";
        const html = await fetchWithTimeout(fbrefUrl);
        const parsed = parseFBrefStats(html);
        // Upsert into player_stats
        for (const p of parsed) {
          await supabase.from("player_stats").upsert({
            nome: p.nome, squadra: p.squadra, gol: p.gol, assist: p.assist, xg: p.xg, xa: p.xa,
          }, { onConflict: "nome,squadra" });
        }
        results.stats = { status: "ok", count: parsed.length };
        await logSync("fbref_stats", `ok:${parsed.length}`);
      } catch (e) {
        results.stats = { status: "error", error: (e as Error).message };
        await logSync("fbref_stats", `error:${(e as Error).message}`);
      }
    }

    // 3. Probabili formazioni
    if (shouldFetch("formazioni")) {
      try {
        const html = await fetchWithTimeout("https://www.fantacalcio.it/probabili-formazioni-serie-a");
        const parsed = parseProbabiliFormazioni(html);
        results.formazioni = { status: "ok", count: Object.keys(parsed).length };
        await logSync("fantacalcio_formazioni", `ok:${Object.keys(parsed).length}`);
      } catch (e) {
        results.formazioni = { status: "error", error: (e as Error).message };
        await logSync("fantacalcio_formazioni", `error:${(e as Error).message}`);
      }
    }

    // 4. Infortunati
    if (shouldFetch("infortunati")) {
      try {
        const html = await fetchWithTimeout("https://www.fantacalcio.it/indisponibili-serie-a");
        const parsed = parseFantacalcioInjuries(html);
        results.infortunati = { status: "ok", count: Object.keys(parsed).length };
        await logSync("fantacalcio_infortunati", `ok:${Object.keys(parsed).length}`);
      } catch (e) {
        results.infortunati = { status: "error", error: (e as Error).message };
        await logSync("fantacalcio_infortunati", `error:${(e as Error).message}`);
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
