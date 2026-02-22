# Phase 02: Shareable Plan Links - Research

**Researched:** 2026-02-21
**Domain:** URL-based sharing, Next.js 16 dynamic routes, server components, immutable data storage
**Confidence:** HIGH

## Summary

Phase 2 implements shareable plan links that create read-only snapshots of StrategicAssessment results, enabling users to share their hunting strategy via unique URLs. This phase builds directly on Phase 1's Redis infrastructure, using Upstash Redis for token-to-plan storage with 90-day TTL.

The technical foundation is straightforward: a POST endpoint serializes the assessment to Redis with a cryptographically secure token, and a Next.js 16 server component route renders a read-only version of the existing ResultsShell. The main challenge is creating a read-only variant of ResultsShell that doesn't depend on Zustand state, which requires extracting client-only features (edit mode, confirm actions) while preserving the tabbed results UI.

**Primary recommendation:** Create SharedResultsShell as a simplified fork of ResultsShell rather than attempting to make ResultsShell conditionally read-only. This avoids prop-drilling a `readOnly` flag through 5+ dynamically imported components and keeps the shared page isolated from future changes to the interactive results flow.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Dynamic routes `[token]`, server components | Built-in routing with native server-side rendering for shared pages |
| @upstash/redis | (existing) | Token storage, TTL-based expiration | Already integrated in Phase 1, handles graceful degradation |
| crypto.randomUUID | Node.js 14.17+ | Secure token generation | Native Web Crypto API, cryptographically secure v4 UUIDs |
| React Server Components | 19.2.3 | Zero-JS shared page rendering | Default in Next.js 16 App Router, reduces client bundle |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Icons (Share2, Copy, Clock) | Existing icon library, maintains UI consistency |
| class-variance-authority | (existing) | Button variants | Already used in button component |

**Installation:**
No new dependencies required. All libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── share/
│   │       └── route.ts              # POST endpoint for token generation
│   └── shared/
│       └── [token]/
│           └── page.tsx              # Server component for read-only view
├── components/
│   └── results/
│       ├── ResultsShell.tsx          # Existing interactive version (no changes)
│       └── SharedResultsShell.tsx    # New read-only variant (no Zustand, no edits)
└── lib/
    └── redis.ts                       # Already has cacheGet, cacheSet, CACHE_TTLS.share_links
```

### Pattern 1: Next.js 16 Dynamic Route Server Component

**What:** Server component that receives dynamic route params as a Promise
**When to use:** Fetching data based on URL parameters without client-side state

**Example:**
```typescript
// src/app/shared/[token]/page.tsx
import { cacheGet } from "@/lib/redis";
import { notFound } from "next/navigation";
import type { StrategicAssessment } from "@/lib/types";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function SharedPlanPage({ params }: Props) {
  const { token } = await params;

  const assessment = await cacheGet<StrategicAssessment>(`share:${token}`);
  if (!assessment) {
    notFound();
  }

  return <SharedResultsShell assessment={assessment} />;
}
```

**Source:** [Next.js Dynamic Routes - File-system conventions](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)

### Pattern 2: Secure Token Generation with crypto.randomUUID

**What:** Generate non-predictable, cryptographically secure tokens for share links
**When to use:** Creating unique identifiers for shareable resources

**Example:**
```typescript
// src/app/api/share/route.ts
export async function POST(req: NextRequest) {
  const token = crypto.randomUUID(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
  const shareKey = `share:${token}`;

  // Store with 90-day TTL
  await cacheSet(shareKey, assessment, "share_links");

  const shareUrl = `${origin}/shared/${token}`;
  return NextResponse.json({ url: shareUrl });
}
```

**Why this is secure:**
- crypto.randomUUID generates v4 UUIDs using cryptographically secure random number generator (CSPRNG)
- UUID v4 has 122 bits of randomness (2^122 possible values)
- Not guessable like sequential IDs or Math.random()
- Safe to expose in public URLs

**Source:** [MDN - Crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)

### Pattern 3: Rate Limiting with Existing limiters.guest

**What:** Prevent share link abuse by limiting creation to 100 requests per hour per identifier
**When to use:** Unauthenticated POST endpoints

**Example:**
```typescript
import { limiters, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limiter = limiters.guest();
  const identifier = req.ip ?? req.headers.get("x-forwarded-for") ?? "anonymous";
  const rateLimit = await checkRateLimit(limiter, identifier);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rateLimit.reset) } }
    );
  }

  // Continue with share link creation...
}
```

**Source:** Existing codebase pattern in `src/lib/rate-limit.ts`

### Pattern 4: Client Component for Copy-to-Clipboard

**What:** Client-side button that copies share URL and shows visual feedback
**When to use:** Copy-to-clipboard interactions (requires client JS)

**Example:**
```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function ShareButton({ assessment }: { assessment: StrategicAssessment }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessment }),
    });

    const { url } = await res.json();

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button onClick={handleShare} variant="outline" className="gap-1.5">
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied!" : "Share Plan"}
    </Button>
  );
}
```

**Source:** Existing pattern in `src/components/settings/MfaEnrollment.tsx` (lines 189-194)

### Pattern 5: Redis Storage with TTL

**What:** Store serialized assessment with automatic expiration
**When to use:** Temporary data storage with guaranteed cleanup

**Example:**
```typescript
import { cacheSet, CACHE_TTLS } from "@/lib/redis";

// CACHE_TTLS.share_links = 90 * 24 * 60 * 60 (already defined in redis.ts)

await cacheSet(`share:${token}`, assessment, "share_links");
// Automatically expires after 90 days
```

**TTL Options:**
- Use preset keys from CACHE_TTLS for consistency
- `cacheSet` accepts both preset keys ("share_links") and raw seconds
- Upstash Redis evicts expired keys automatically

**Source:** [Upstash Redis TTL Commands](https://upstash.com/docs/redis/sdks/py/commands/generic/ttl)

### Anti-Patterns to Avoid

- **Don't use sequential IDs for tokens:** Predictable tokens allow enumeration attacks. Always use crypto.randomUUID.
- **Don't modify ResultsShell directly:** Adding `readOnly` prop creates complexity and risks breaking interactive mode. Fork instead.
- **Don't skip rate limiting:** Share creation is unauthenticated and can be abused to fill Redis storage.
- **Don't use useSearchParams in server components:** Dynamic route params are passed as props, not via hooks.
- **Don't store user-identifying data in share links:** Shared assessments should be anonymous snapshots (no user IDs, emails).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom random token logic | `crypto.randomUUID()` | Native API handles CSPRNG, collision avoidance, v4 UUID spec compliance. Edge cases: timing attacks, insufficient entropy. |
| Expiration display | Custom date formatting | `Intl.DateTimeFormat` or `new Date(timestamp).toLocaleDateString()` | Handles timezones, locales, edge cases like DST transitions. |
| Share URL construction | String concatenation | `new URL(path, origin).toString()` | Handles protocol, port, path escaping automatically. |
| JSON serialization safety | Manual object cloning | `JSON.parse(JSON.stringify(obj))` + validation | StrategicAssessment already JSON-safe (no functions, class instances, circular refs). |

**Key insight:** Next.js 16 and modern Web APIs provide batteries-included solutions for all core share link requirements. The only custom logic needed is business rules (which data to share, TTL duration, URL structure).

## Common Pitfalls

### Pitfall 1: Params as Promise in Next.js 16

**What goes wrong:** Accessing `params.token` directly causes TypeScript error or runtime undefined
**Why it happens:** Next.js 16 changed params from sync object to Promise for better streaming support
**How to avoid:** Always await params at the top of page component
**Warning signs:** TypeScript error "Property 'token' does not exist on type 'Promise<...>'"

**Example:**
```typescript
// WRONG (Next.js 14 pattern)
export default function Page({ params }: { params: { token: string } }) {
  const token = params.token; // Error in Next.js 16
}

// CORRECT (Next.js 16 pattern)
type Props = { params: Promise<{ token: string }> };
export default async function Page({ params }: Props) {
  const { token } = await params; // ✓ Works
}
```

**Source:** [Next.js generateMetadata with dynamic params](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

### Pitfall 2: Server Component Props Must Be Serializable

**What goes wrong:** Passing StrategicAssessment directly from server to client component fails if it contains functions, Dates, or non-JSON types
**Why it happens:** React Server Components serialize props as JSON over the wire
**How to avoid:** Ensure StrategicAssessment contains only JSON-safe types (string, number, boolean, null, arrays, plain objects)
**Warning signs:** "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components"

**Current status:** StrategicAssessment is already JSON-safe (verified in `src/lib/types/index.ts`). All dates are ISO strings, no class instances, no functions.

**Source:** [React Server Components Types - TypeScript](https://stevekinney.com/courses/react-typescript/react-server-components-types)

### Pitfall 3: Clipboard API Requires Secure Context

**What goes wrong:** `navigator.clipboard.writeText()` fails with "undefined" or security error
**Why it happens:** Clipboard API only works in HTTPS or localhost
**How to avoid:** Ensure production uses HTTPS, dev uses localhost (not 192.168.x.x)
**Warning signs:** Works locally but fails in production, or works on port 3000 but not on LAN IP

**Fallback pattern:**
```typescript
async function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for insecure contexts
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}
```

**Source:** [MDN - Clipboard API Security](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)

### Pitfall 4: Expired Share Links Return 404 with No Context

**What goes wrong:** User visits expired link and sees generic "Page Not Found" with no explanation
**Why it happens:** `cacheGet` returns `null` for missing/expired keys, triggering `notFound()`
**How to avoid:** Add explicit expiration messaging before calling `notFound()`
**Warning signs:** User confusion, support requests about "broken" share links

**Better pattern:**
```typescript
const assessment = await cacheGet<StrategicAssessment>(`share:${token}`);

if (!assessment) {
  // Could be expired or never existed
  return (
    <div className="text-center py-16">
      <h2>Share Link Expired or Invalid</h2>
      <p>This plan link has expired (90-day limit) or doesn't exist.</p>
      <Button asChild><Link href="/plan-builder">Create your own plan</Link></Button>
    </div>
  );
}
```

### Pitfall 5: Rate Limit Headers Not Set on 429 Response

**What goes wrong:** Client retries immediately after hitting rate limit, causing cascade of 429s
**Why it happens:** Missing `Retry-After` header doesn't tell client when to retry
**How to avoid:** Always include rate limit info in response headers
**Warning signs:** API logs show repeated 429s from same IP in tight loop

**Pattern:**
```typescript
if (!rateLimit.success) {
  return NextResponse.json(
    { error: "Too many share link requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      }
    }
  );
}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Dynamic Route Page Component (Next.js 16)
```typescript
// src/app/shared/[token]/page.tsx
import { cacheGet } from "@/lib/redis";
import { notFound } from "next/navigation";
import { SharedResultsShell } from "@/components/results/SharedResultsShell";
import type { StrategicAssessment } from "@/lib/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const assessment = await cacheGet<StrategicAssessment>(`share:${token}`);

  if (!assessment) {
    return { title: "Share Link Not Found" };
  }

  return {
    title: `Hunt Strategy Plan | Odyssey Outdoors`,
    description: assessment.strategyOverview.slice(0, 160),
  };
}

export default async function SharedPlanPage({ params }: Props) {
  const { token } = await params;
  const assessment = await cacheGet<StrategicAssessment>(`share:${token}`);

  if (!assessment) {
    notFound();
  }

  return <SharedResultsShell assessment={assessment} token={token} />;
}
```

### Share API Route with Rate Limiting
```typescript
// src/app/api/share/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cacheSet } from "@/lib/redis";
import { limiters, checkRateLimit } from "@/lib/rate-limit";
import type { StrategicAssessment } from "@/lib/types";

export async function POST(req: NextRequest) {
  // Rate limit check
  const limiter = limiters.guest();
  const identifier = req.ip ?? req.headers.get("x-forwarded-for") ?? "anonymous";
  const rateLimit = await checkRateLimit(limiter, identifier);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many share link requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) }
      }
    );
  }

  // Parse and validate request
  let body: { assessment: StrategicAssessment };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.assessment || !body.assessment.id) {
    return NextResponse.json({ error: "Missing assessment data" }, { status: 400 });
  }

  // Generate token and store
  const token = crypto.randomUUID();
  const shareKey = `share:${token}`;

  await cacheSet(shareKey, body.assessment, "share_links"); // 90-day TTL

  // Build share URL
  const origin = req.nextUrl.origin;
  const shareUrl = `${origin}/shared/${token}`;

  return NextResponse.json({
    url: shareUrl,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  });
}
```

### Share Button Client Component
```typescript
// src/components/results/ShareButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2 } from "lucide-react";
import type { StrategicAssessment } from "@/lib/types";

interface ShareButtonProps {
  assessment: StrategicAssessment;
}

export function ShareButton({ assessment }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "copied">("idle");

  async function handleShare() {
    setStatus("loading");

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment }),
      });

      if (!res.ok) {
        throw new Error("Failed to create share link");
      }

      const { url } = await res.json();
      await navigator.clipboard.writeText(url);

      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      console.error("Share failed:", error);
      setStatus("idle");
    }
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      disabled={status === "loading"}
      className="gap-1.5"
    >
      {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
      {status === "copied" && <Check className="w-4 h-4" />}
      {status === "idle" && <Share2 className="w-4 h-4" />}
      {status === "copied" ? "Link Copied!" : "Share Plan"}
    </Button>
  );
}
```

### SharedResultsShell (Read-only Fork)
```typescript
// src/components/results/SharedResultsShell.tsx
import { HeroSummary } from "./sections/HeroSummary";
import { PortfolioOverview } from "./sections/PortfolioOverview";
import { StatePortfolio } from "./sections/StatePortfolio";
import { TimelineRoadmap } from "./sections/TimelineRoadmap";
import { LogisticsTab } from "./sections/LogisticsTab";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";
import type { StrategicAssessment } from "@/lib/types";
import Link from "next/link";

interface SharedResultsShellProps {
  assessment: StrategicAssessment;
  token: string;
}

export function SharedResultsShell({ assessment, token }: SharedResultsShellProps) {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Expiration banner */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            This shared plan expires on {expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/plan-builder" className="gap-1.5">
            Create your own plan <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <HeroSummary assessment={assessment} />

      {/* Static tabs (no interactivity needed for MVP) */}
      <div className="space-y-6">
        <PortfolioOverview assessment={assessment} />
        <StatePortfolio assessment={assessment} />
        <TimelineRoadmap
          assessment={assessment}
          editedActions={{}}
          onEditedActionsChange={() => {}} // No-op for read-only
        />
        <LogisticsTab assessment={assessment} />
      </div>

      {/* CTA */}
      <div className="text-center p-8 border-t border-border">
        <h3 className="text-lg font-semibold mb-2">Ready to build your own strategy?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get a personalized 10-year western big game hunting roadmap in minutes.
        </p>
        <Button asChild size="lg">
          <Link href="/plan-builder">Start Your Plan</Link>
        </Button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side share via localStorage | Server-side share via Redis + unique URLs | Phase 2 (2026) | Enables sharing across devices/users, immutable snapshots |
| Math.random() for tokens | crypto.randomUUID() | Node.js 14.17 (2021) | Cryptographically secure, prevents enumeration attacks |
| Params as sync object | Params as Promise | Next.js 15 (2024) | Enables better streaming, requires await in components |
| Client components everywhere | Server components by default | React 19 / Next.js 13+ (2024) | Reduces client JS bundle, faster initial load |

**Deprecated/outdated:**
- **JWT for share tokens:** Overkill for this use case. UUIDs are simpler, equally secure for ephemeral sharing. JWTs add payload encoding complexity with no benefit (no claims needed).
- **Vercel KV namespace:** Upstash Redis already integrated. No need for separate KV store.
- **next-share package:** Designed for social media Open Graph sharing, not private plan links. Use custom implementation.

## Open Questions

1. **Should we support custom expiration durations?**
   - What we know: Requirements specify 90-day expiration
   - What's unclear: Whether users might want shorter/longer durations (7 days for temporary shares, 365 days for long-term reference)
   - Recommendation: Start with fixed 90-day TTL. Add custom durations if users request it (low effort: accept `ttl` param in POST body).

2. **Should shared links be revocable?**
   - What we know: Current design has no revocation mechanism
   - What's unclear: Whether users need to "un-share" a link after sending it
   - Recommendation: Defer to future phase. Revocation requires tracking link creator (auth), UI for managing shared links, database of share records. Phase 2 focuses on anonymous sharing.

3. **Should we deduplicate identical assessments?**
   - What we know: Same assessment shared twice creates two tokens
   - What's unclear: Whether we should hash assessment content and return existing token if duplicate
   - Recommendation: Don't deduplicate. Redis storage is cheap, and users may want separate expiration timelines. Complexity not justified.

4. **How should we handle pre-Phase-1 assessments without Redis?**
   - What we know: Share feature gracefully degrades if Redis unavailable (cacheSet no-ops)
   - What's unclear: Should we show error UI or silently fail?
   - Recommendation: Return 503 from POST /api/share if Redis unavailable. Better UX than silent failure. Check `getRedis() !== null` before processing.

## Sources

### Primary (HIGH confidence)
- [Next.js Dynamic Routes - File Conventions](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
- [Next.js generateMetadata Function](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [MDN - Crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [Upstash Redis TTL Documentation](https://upstash.com/docs/redis/sdks/py/commands/generic/ttl)
- Existing codebase: `src/lib/redis.ts`, `src/lib/rate-limit.ts`, `src/components/results/ResultsShell.tsx`

### Secondary (MEDIUM confidence)
- [React Server Components Types - TypeScript](https://stevekinney.com/courses/react-typescript/react-server-components-types)
- [Practical Guide to Generating UUIDs in JavaScript](https://blog.openreplay.com/practical-guide-generating-uuids-javascript/)
- [How to Share Files Temporarily (Expiring Links Guide)](https://fast.io/resources/share-files-temporarily/)

### Tertiary (LOW confidence)
- None. All core findings verified with official docs or existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Next.js 16, Upstash Redis, crypto.randomUUID all verified in codebase and official docs
- Architecture: HIGH - Dynamic routes, server components, rate limiting patterns proven in existing code
- Pitfalls: HIGH - Next.js 16 params-as-Promise, clipboard security, expiration messaging verified via official docs and recent web searches

**Research date:** 2026-02-21
**Valid until:** 2026-03-23 (30 days - stable ecosystem, Next.js 16 recently released)
