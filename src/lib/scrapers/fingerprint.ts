/**
 * Structural Fingerprinting Module
 *
 * Computes a structural fingerprint of a web page by hashing the CSS selector
 * paths of key elements (tables, forms, data containers). Stores fingerprints
 * in Supabase and compares against the last-known fingerprint to detect
 * website redesigns.
 *
 * When a fingerprint changes, the scraper logs a warning but does NOT skip
 * the scrape -- the data may still be parseable with the current logic.
 */

import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StructuralFingerprint {
  stateId: string;
  url: string;
  selectorHash: string; // SHA-256 of sorted selector paths (first 16 chars)
  selectorPaths: string[]; // e.g. ["body > div.content > table.draw-data"]
  scrapedAt: string; // ISO timestamp
}

// ---------------------------------------------------------------------------
// computeFingerprint
// ---------------------------------------------------------------------------

/**
 * Compute a structural fingerprint from HTML by hashing the CSS selector
 * paths of key structural elements (table, form, main, article, section).
 *
 * Each element's path walks up to 5 parent levels collecting
 * `tagName.class1.class2` (classes sorted alphabetically).
 */
export function computeFingerprint(
  html: string,
  url: string,
  stateId: string
): StructuralFingerprint {
  const $ = cheerio.load(html);
  const paths: string[] = [];

  // Structural elements we care about
  $("table, form, main, article, section").each((_, el) => {
    const path = buildSelectorPath($, el);
    paths.push(path);
  });

  // Sort for deterministic hashing
  paths.sort();

  const joined = paths.join("|");
  const hash = createHash("sha256").update(joined).digest("hex");
  const selectorHash = hash.substring(0, 16);

  return {
    stateId,
    url,
    selectorHash,
    selectorPaths: paths,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Build a selector path for an element by walking up parents (max 5 levels).
 * Format: `depth:tag.class1.class2 > depth:tag.class1.class2 > ...`
 */
function buildSelectorPath(
  $: cheerio.CheerioAPI,
  el: AnyNode
): string {
  const parts: string[] = [];
  let current: cheerio.Cheerio<AnyNode> = $(el);
  let depth = 0;
  const maxDepth = 5;

  while (depth < maxDepth && current.length > 0) {
    const tagName = (current.get(0) as Element)?.tagName;
    if (!tagName || tagName === "html" || tagName === "body") break;

    const classAttr = current.attr("class") || "";
    const classes = classAttr
      .split(/\s+/)
      .filter((c) => c.length > 0)
      .sort()
      .join(".");

    const part = classes ? `${depth}:${tagName}.${classes}` : `${depth}:${tagName}`;
    parts.push(part);

    current = current.parent();
    depth++;
  }

  // Reverse so root is first
  return parts.reverse().join(" > ");
}

// ---------------------------------------------------------------------------
// compareFingerprint
// ---------------------------------------------------------------------------

/**
 * Compare a current fingerprint against a previous one.
 * If no previous exists, reports "First fingerprint recorded" (not a change).
 */
export function compareFingerprint(
  current: StructuralFingerprint,
  previous: StructuralFingerprint | null
): { changed: boolean; details: string } {
  if (!previous) {
    return { changed: false, details: "First fingerprint recorded" };
  }

  if (current.selectorHash === previous.selectorHash) {
    return { changed: false, details: "Structure unchanged" };
  }

  // Find added and removed paths
  const prevSet = new Set(previous.selectorPaths);
  const currSet = new Set(current.selectorPaths);

  const added = current.selectorPaths.filter((p) => !prevSet.has(p));
  const removed = previous.selectorPaths.filter((p) => !currSet.has(p));

  return {
    changed: true,
    details: `Structure changed: ${added.length} paths added, ${removed.length} removed`,
  };
}

// ---------------------------------------------------------------------------
// storeFingerprint
// ---------------------------------------------------------------------------

/**
 * Upsert a fingerprint into the scraper_fingerprints table.
 * Conflict key: (state_id, url).
 */
export async function storeFingerprint(
  fingerprint: StructuralFingerprint,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase.from("scraper_fingerprints").upsert(
    {
      state_id: fingerprint.stateId,
      url: fingerprint.url,
      selector_hash: fingerprint.selectorHash,
      selector_paths: fingerprint.selectorPaths,
      scraped_at: fingerprint.scrapedAt,
    },
    { onConflict: "state_id,url" }
  );

  if (error) {
    console.log(
      `[fingerprint] Store error for ${fingerprint.stateId} ${fingerprint.url}: ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// getLastFingerprint
// ---------------------------------------------------------------------------

/**
 * Retrieve the most recent fingerprint for a state + URL combination.
 */
export async function getLastFingerprint(
  stateId: string,
  url: string,
  supabase: SupabaseClient
): Promise<StructuralFingerprint | null> {
  const { data, error } = await supabase
    .from("scraper_fingerprints")
    .select("state_id, url, selector_hash, selector_paths, scraped_at")
    .eq("state_id", stateId)
    .eq("url", url)
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    stateId: data.state_id,
    url: data.url,
    selectorHash: data.selector_hash,
    selectorPaths: data.selector_paths,
    scrapedAt: data.scraped_at,
  };
}
