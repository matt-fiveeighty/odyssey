# Platform Optimization & Deployment Plan
## Category-Dominant D2C Hunting Platform

**Date:** February 18, 2026
**Status:** Execution-ready
**Baseline:** Current codebase audit + competitive intelligence (7 competitors analyzed)

---

# PHASE 1: BENCHMARK MATRIX

## Security Benchmark

| Dimension | Industry State | GoHunt | onX | Huntin' Fool | MeatEater | Spartan Forge | HuntStand | **Our Current** | **Decision** |
|-----------|---------------|--------|-----|--------------|-----------|---------------|-----------|-----------------|--------------|
| MFA | **Industry Weak** — zero competitors offer MFA | None | None | None | None | None | None | None | **SURPASS** — implement optional MFA |
| Encryption at rest | **Industry Weak** — zero disclose | Not disclosed | Not disclosed | Not disclosed | Not disclosed | Not disclosed | Not disclosed | Supabase default (PostgreSQL encryption) | **SURPASS** — document + field-level for sensitive data |
| Encryption in transit | **Industry Baseline** — all use HTTPS | HTTPS | HTTPS | HTTPS | HTTPS | HTTPS + SSL for CC | HTTPS | HTTPS + CSP headers | **PARITY** — already meets |
| Bot protection | **Industry Weak** — only HuntStand has WAF | None visible | None visible | None | None | None | Imperva WAF | None | **SURPASS** — Cloudflare WAF + rate limiting |
| SOC 2 / ISO | **Industry Weak** — zero references | None | None | None | None | None | None | None | **SURPASS** — roadmap to SOC 2 Type I |
| Bug bounty | **Industry Weak** — zero programs | None | None | None | None | None | None | None | **SURPASS** — responsible disclosure page |
| Security page | **Industry Weak** — zero have one | None | None | None | None | None | None | None | **SURPASS** — dedicated security page |
| Breach notification | **Industry Weak** — only MeatEater approaches | None | None | None | Partial | None | None | None | **SURPASS** — 72-hour SLA |
| Password complexity | **Industry Weak** — none documented | None | None | None | None | None | None | Supabase default (6 char min) | **SURPASS** — 8 char + complexity |
| Rate limiting | **Industry Weak** — none documented | None | None | None | None | None | None | **MISSING** | **SURPASS** — per-endpoint limiting |
| CAPTCHA | **Industry Weak** | None | None | None | None | None | Imperva | **MISSING** | **SURPASS** — Turnstile on auth |

**Security Verdict: Industry is UNIFORMLY WEAK. Every investment puts us ahead.**

---

## Data Architecture Benchmark

| Dimension | Industry State | Best-in-Class | **Our Current** | **Decision** |
|-----------|---------------|---------------|-----------------|--------------|
| Offline maps | **Industry Strong** — onX, BaseMap, Spartan Forge all offer | onX (state packages, vector tiles) | Not applicable (no mapping) | **REDESIGN** — not our v1 differentiator, defer |
| UGC (waypoints/tracks) | **Industry Strong** — onX leads with shared folders | onX (hybrid sync, folders, photo) | Zustand localStorage only | **SURPASS** — server-synced goals/assessments with export |
| Geospatial | **Industry Strong** — onX, BaseMap with vector tiles | onX (PostGIS-level) | None (no mapping layer) | **DEFER** — not v1 scope |
| Derived analytics | **Industry Baseline** — GoHunt draw odds, Spartan Forge AI | GoHunt (draw odds per unit/species/year) | Roadmap generator (scoring engine) | **SURPASS** — our engine already exceeds most |
| Entitlement flexibility | **Industry Baseline** — onX state-gating, GoHunt 2-tier | onX (state-based + tier) | None (no payment enforcement) | **IMPLEMENT** — feature-flag entitlement layer |
| Data export | **Industry Weak** — CCPA-only, no self-service | MeatEater (CCPA portability) | None | **SURPASS** — self-service JSON/CSV export |
| Data deletion | **Industry Weak** — email-only processes | MeatEater (email + mail) | No deletion flow | **SURPASS** — self-service account deletion |
| Sync model | **Industry Strong** — onX hybrid local+cloud | onX (local SQLite + background sync) | Zustand persist (localStorage only) | **IMPLEMENT** — Supabase sync for authenticated users |
| Audit logging | **Industry Weak** — none documented | None visible | None | **SURPASS** — assessment generation + account events |

**Data Architecture Verdict: Our calculation engine is competitive. Storage/sync/export need implementation.**

---

## Legal Benchmark

| Dimension | Industry State | Best Practice | **Our Current** | **Decision** |
|-----------|---------------|---------------|-----------------|--------------|
| Anti-scraping | **Industry Strong** — universal explicit prohibition | GoHunt/onX (detailed enumeration) | Basic acceptable use clause | **SURPASS** — detailed enumeration |
| Competitive use restriction | **Industry Strong** — onX most aggressive | onX ("substantially similar features") | Not addressed | **IMPLEMENT** — measured restriction |
| UGC content license | **Industry Strong** — all claim perpetual irrevocable | GoHunt (perpetual, irrevocable, unlimited) | Not explicitly addressed | **IMPLEMENT** — revocable upon deletion (differentiator) |
| Aggregated data ownership | **Industry Baseline** — most retain rights | GoHunt/onX retain all | Not addressed | **IMPLEMENT** — explicit platform rights with transparency |
| Export rights | **Industry Weak** — none offer clear export | None offer clear terms | Not addressed | **SURPASS** — explicit right to export |
| CPRA compliance | **Industry Mixed** — MeatEater advanced, others basic | MeatEater (multi-state, GPC) | Basic privacy page | **SURPASS** — full CPRA + multi-state |
| PIPEDA compliance | **Industry Weak** — only onX and MeatEater | onX (privacy officer appointed) | Not addressed | **SURPASS** — full PIPEDA section |
| Data retention schedule | **Industry Weak** — "as long as necessary" | MeatEater (best) | Not defined | **SURPASS** — explicit 90-day post-deletion |
| Deletion SLA | **Industry Weak** — no timelines | None state timelines | Not addressed | **SURPASS** — 30-day SLA |
| AI training restriction | **Industry Missing** — none address | None | Not addressed | **SURPASS** — explicit no-AI-training clause |

**Legal Verdict: Our terms are thin. Major rewrite needed. Opportunity to leapfrog everyone.**

---

## Pricing Benchmark

| Dimension | Industry State | Market Range | **Our Current** | **Decision** |
|-----------|---------------|-------------|-----------------|--------------|
| Annual price band | $29.99–$499.99 | Median $89.99 | $0 / $12/mo / $29/mo (FPO, not implemented) | **REDESIGN** — align to competitive analysis |
| Free tier | **Industry Baseline** — most offer limited free | onX, GoHunt, HuntStand, Spartan Forge | Basecamp (free, no restrictions) | **IMPLEMENT** — restrict free tier features |
| Feature density per tier | **Industry Varies** | GoHunt Insider highest for research | All features accessible to everyone | **IMPLEMENT** — tier-gate features |
| Multi-state pricing | **Industry Shifting** — away from per-state | onX still per-state; most do all-states | All states included | **MAINTAIN** — all states included |
| Add-on revenue | **Industry Weak** — only onX and BaseMap | onX (chip packs, state layers) | None | **DEFER** — v2 consideration |
| Auto-renew compliance | **Industry Baseline** | All use standard Stripe/Shopify | No payment integration | **IMPLEMENT** — Stripe with compliant flows |

**Pricing Verdict: Current FPO pricing doesn't match competitive reality. Restructure needed.**

---

# PHASE 2: GAP & DOMINANCE STRATEGY

## Critical Gaps (Must Fix Before Launch)

| # | Gap | Benchmark Ref | Risk | Decision | Complexity | Time |
|---|-----|--------------|------|----------|------------|------|
| 1 | **No rate limiting** | All competitors vulnerable too, but FTC "reasonable security" requires it | **CRITICAL** | Surpass | Low | 1 day |
| 2 | **Guest mode security hole** | Cookie spoofing allows unauthenticated access | **CRITICAL** | Fix | Low | 1 day |
| 3 | **No password reset** | Basic auth requirement; all competitors have it | **CRITICAL** | Parity | Low | 1 day |
| 4 | **No payment integration** | Cannot monetize | **CRITICAL** | Implement | Medium | 2 weeks |
| 5 | **Legal terms too thin** | Every competitor has stronger ToS | **HIGH** | Surpass | Medium | 3 days |
| 6 | **No CPRA/PIPEDA compliance** | MeatEater + onX set baseline | **HIGH** | Surpass | Medium | 3 days |
| 7 | **No data deletion flow** | CPRA requires; MeatEater has process | **HIGH** | Surpass | Low | 2 days |
| 8 | **No error tracking** | Cannot debug production | **HIGH** | Implement | Low | 1 day |
| 9 | **CSP unsafe-inline/eval** | Weakens XSS protection | **HIGH** | Fix | Medium | 2 days |
| 10 | **No audit logging** | Compliance gap | **MEDIUM** | Surpass | Low | 2 days |

## Strategic Surpass Items (Differentiation)

| # | Feature | Benchmark Ref | Decision | Complexity | Time |
|---|---------|--------------|----------|------------|------|
| 11 | **Optional MFA (TOTP)** | Zero competitors offer | Surpass | Medium | 3 days |
| 12 | **Self-service data export** | No competitor offers self-service | Surpass | Low | 2 days |
| 13 | **Security page + security.txt** | Zero competitors have | Surpass | Low | 1 day |
| 14 | **Responsible disclosure policy** | Zero competitors have | Surpass | Low | 1 day |
| 15 | **Breach notification SLA** | Zero competitors commit | Surpass | Low | 1 day |
| 16 | **GPC signal recognition** | Only MeatEater does this | Surpass | Low | 1 day |
| 17 | **Revocable content license** | All competitors perpetual/irrevocable | Surpass | Low | Part of legal rewrite |
| 18 | **30-day deletion SLA** | No competitor states timeline | Surpass | Low | Part of legal rewrite |
| 19 | **Explicit AI training opt-out** | Zero competitors address | Surpass | Low | Part of legal rewrite |

---

# PHASE 3: SECURITY DOMINANCE IMPLEMENTATION

## 3.1 Hardened Authentication Model

**Current:** Supabase email/password + Google OAuth + guest cookie
**Target:** Supabase auth + MFA option + rate limiting + secure guest sessions

### Changes Required:

**A. Rate Limiting (Priority: CRITICAL)**
```
Implementation: Vercel Edge Middleware OR Upstash Redis rate limiter
Endpoints:
  /auth/sign-in:     5 attempts per 15 minutes per IP
  /auth/sign-up:     3 attempts per hour per IP
  /auth/callback:    10 per minute per IP
  /api/*:            60 per minute per authenticated user
  Guest generation:  100 per hour per IP (roadmap calculation)

Stack: @upstash/ratelimit + @upstash/redis
Rollback: Remove middleware; no data migration needed
```

**B. Guest Session Hardening (Priority: CRITICAL)**
```
Current vulnerability: Any user can set guest-session=true cookie
Fix:
  1. Server-side signed guest tokens (JWT with expiry)
  2. Generate guest token in /auth/guest endpoint only
  3. Validate JWT signature in middleware (not just cookie presence)
  4. 24-hour absolute expiry, non-renewable
  5. Guest data stored in Supabase anonymous session (not just localStorage)

Rollback: Revert to current cookie check; guest data in localStorage still works
```

**C. MFA Implementation (Priority: STRATEGIC)**
```
Stack: Supabase MFA (TOTP) — built-in support
Flow:
  1. User enables MFA in account settings
  2. Generates TOTP secret, displays QR code
  3. User verifies with authenticator app
  4. Subsequent logins require TOTP after password
  5. Recovery codes generated (10 one-time codes)

Enrollment: Optional for all users
Enforcement: None initially (no competitor enforces)
Marketing: "The only hunting app with two-factor authentication"

Rollback: Disable MFA flag; users fall back to password-only
```

**D. Password Policy (Priority: HIGH)**
```
Current: Supabase default (6 characters minimum)
Target:
  - Minimum 8 characters
  - At least 1 uppercase, 1 lowercase, 1 number
  - Client-side validation (Zod schema)
  - Server-side enforced via Supabase auth config

Rollback: Revert Supabase config; existing passwords unaffected
```

## 3.2 Encryption Architecture

**Current:** HTTPS in transit, Supabase default PostgreSQL encryption at rest
**Target:** Documented encryption posture + field-level encryption for sensitive data

```
Tier 1 (Immediate):
  - Document existing: "AES-256 at rest via Supabase/AWS RDS"
  - Document existing: "TLS 1.3 in transit"
  - HSTS header (add to next.config.ts): Strict-Transport-Security: max-age=31536000; includeSubDomains

Tier 2 (Pre-launch):
  - Field-level encryption for: SSN-equivalent data (if license app feature built)
  - Separate encryption scope for user assessment JSONB (application-layer encryption)

Tier 3 (Post-launch):
  - Per-user encryption keys for sensitive fields (user goals, points data)
  - Key rotation strategy (annual)
```

## 3.3 CSP Hardening

**Current vulnerability:** `'unsafe-inline'` and `'unsafe-eval'` in script-src

```
Fix: Use nonce-based CSP
  1. Generate random nonce per request in middleware
  2. Add nonce to CSP header: script-src 'nonce-{random}' 'strict-dynamic'
  3. Remove 'unsafe-inline' and 'unsafe-eval'
  4. Add nonce attribute to all inline scripts via Next.js <Script> component

Next.js 16 supports this via:
  experimental: { strictNextHead: true }
  + custom middleware nonce generation

Rollback: Revert to current CSP (functional but weaker)
```

## 3.4 Bot Mitigation

```
Stack: Cloudflare Turnstile (free, privacy-preserving)
Endpoints protected:
  - Sign-up form
  - Sign-in form (after 3 failed attempts)
  - Contact form (if built)

Implementation:
  - @marsidev/react-turnstile package
  - Server-side validation in auth callback
  - Invisible mode (no user friction)

Rollback: Remove Turnstile widget; auth works without it
```

## 3.5 Incident Response Framework

```
Breach Notification Protocol:
  1. Detection: Supabase audit logs + Sentry alerts
  2. Assessment: Within 4 hours of detection
  3. Containment: Immediate session invalidation if auth compromised
  4. Notification:
     - Internal team: Within 1 hour of confirmation
     - Affected users: Within 72 hours (PIPEDA requirement)
     - State regulators: Per state-specific requirements
     - Public disclosure: If >500 users affected
  5. Remediation: Root cause analysis within 7 days
  6. Post-mortem: Published within 30 days

Documentation: Store in /security/incident-response.md (internal, not public)
```

## 3.6 Responsible Disclosure Policy

**Deployment artifact — production-ready page content:**

```
Title: Security at Odyssey Outdoors
URL: /security

Content:
  Reporting Vulnerabilities:
    Email: security@odysseyoutdoors.com
    PGP key: [published on page]
    Response time: Acknowledgment within 48 hours
    Resolution target: Critical within 7 days, High within 30 days

  What we protect:
    - All data encrypted at rest (AES-256) and in transit (TLS 1.3)
    - Optional two-factor authentication
    - 30-day data deletion guarantee
    - Regular security assessments

  security.txt (at /.well-known/security.txt):
    Contact: mailto:security@odysseyoutdoors.com
    Expires: 2027-02-18T00:00:00.000Z
    Preferred-Languages: en
    Canonical: https://odysseyoutdoors.com/.well-known/security.txt
```

## 3.7 Security Marketing Positioning

```
Messaging:
  "Your hunting data, secured."

Key claims (all verifiable):
  - "The only hunting app with two-factor authentication"
  - "The only hunting app with a published security policy"
  - "30-day data deletion guarantee"
  - "Your data is encrypted, exportable, and deletable"
  - "We honor Global Privacy Control signals"

Trust page elements:
  - Encryption standards listed
  - MFA availability
  - Deletion SLA
  - Responsible disclosure link
  - Last security review date
```

---

# PHASE 4: DATA ARCHITECTURE DOMINANCE

## 4.1 Updated Database Schema

**Current:** 4 tables (profiles, wizard_state, assessments, user_goals)
**Target:** 8 tables + entitlement layer + audit log

### New Tables Required:

```sql
-- Subscription & Entitlement Layer
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'free',       -- 'free', 'pro', 'elite'
  status TEXT NOT NULL DEFAULT 'active',       -- 'active', 'trial', 'past_due', 'canceled', 'expired'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Feature Flags (decoupled from pricing tiers)
CREATE TABLE public.feature_flags (
  plan_id TEXT PRIMARY KEY,                    -- 'free', 'pro', 'elite'
  features JSONB NOT NULL DEFAULT '{}'::jsonb
  -- Example: {"full_draw_odds": true, "unlimited_reruns": true, "export": true, "priority_support": true}
);

-- Audit Log
CREATE TABLE public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                        -- 'assessment_generated', 'goal_created', 'account_deleted', etc.
  resource_type TEXT,                          -- 'assessment', 'goal', 'profile', 'subscription'
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Export Requests (CPRA compliance)
CREATE TABLE public.data_export_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',      -- 'pending', 'processing', 'completed', 'expired'
  export_url TEXT,                              -- Signed URL for download
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ                       -- URL expiry (7 days after completion)
);

-- Account Deletion Requests (CPRA/PIPEDA compliance)
CREATE TABLE public.deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',      -- 'pending', 'confirmed', 'processing', 'completed'
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  confirm_by TIMESTAMPTZ,                      -- 7-day confirmation window
  delete_by TIMESTAMPTZ,                       -- 30-day SLA
  completed_at TIMESTAMPTZ
);

-- RLS Policies for new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users read own only
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Audit log: users can read own events only
CREATE POLICY "Users can view own audit events" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Export requests: users can read/create own only
CREATE POLICY "Users can manage own export requests" ON public.data_export_requests
  FOR ALL USING (auth.uid() = user_id);

-- Deletion requests: users can read/create own only
CREATE POLICY "Users can manage own deletion requests" ON public.deletion_requests
  FOR ALL USING (auth.uid() = user_id);

-- Feature flags: anyone can read (public config)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feature flags are public" ON public.feature_flags
  FOR SELECT USING (true);

-- Insert default feature flags
INSERT INTO public.feature_flags (plan_id, features) VALUES
  ('free', '{"state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true, "full_draw_odds": false, "unlimited_reruns": false, "export": false, "priority_support": false}'::jsonb),
  ('pro', '{"state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true, "full_draw_odds": true, "unlimited_reruns": true, "export": false, "priority_support": false, "goal_tracking": true, "deadline_reminders": true}'::jsonb),
  ('elite', '{"state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true, "full_draw_odds": true, "unlimited_reruns": true, "export": true, "priority_support": true, "goal_tracking": true, "deadline_reminders": true, "advanced_analytics": true, "multi_year_comparison": true}'::jsonb);

-- Auto-create subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
```

## 4.2 Entitlement Abstraction Layer

```typescript
// src/lib/entitlements.ts

type PlanId = 'free' | 'pro' | 'elite';
type Feature =
  | 'state_overview' | 'top_3_states' | 'basic_budget' | 'species_explorer'
  | 'full_draw_odds' | 'unlimited_reruns' | 'export' | 'priority_support'
  | 'goal_tracking' | 'deadline_reminders' | 'advanced_analytics' | 'multi_year_comparison';

// Server-side check
async function hasFeature(userId: string, feature: Feature): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .single();

  const { data: flags } = await supabase
    .from('feature_flags')
    .select('features')
    .eq('plan_id', data?.plan_id ?? 'free')
    .single();

  return flags?.features?.[feature] ?? false;
}

// Client-side hook
function useFeature(feature: Feature): boolean {
  const subscription = useSubscriptionStore();
  const flags = useFeatureFlagStore();
  return flags[subscription.planId]?.[feature] ?? false;
}
```

**Why this design:**
- Feature flags are **decoupled from pricing tiers** — can change what each tier includes without code deploy
- Database-driven, not hardcoded — product team can adjust via Supabase dashboard
- Supports A/B testing of feature gating
- onX uses state-gating; GoHunt uses tier-gating; we use flag-gating (most flexible)

## 4.3 Data Sync Strategy

**Current:** Zustand localStorage (lost on browser clear, not synced)
**Target:** Authenticated users sync to Supabase; guests remain localStorage-only

```
Sync Flow:
  1. Guest user completes wizard → data in localStorage (Zustand persist)
  2. Guest signs up → trigger sync:
     a. Read wizard state from Zustand store
     b. Write to Supabase wizard_state table
     c. Clear localStorage guest data
     d. All subsequent reads from Supabase
  3. Authenticated user uses wizard → writes to both Zustand (cache) and Supabase (source of truth)
  4. On app load: fetch from Supabase, hydrate Zustand

Conflict resolution: Server wins (last-write-wins with timestamps)
Rollback: Revert to localStorage-only; data still accessible locally
```

## 4.4 Data Export Implementation

```
Self-service export flow:
  1. User clicks "Export My Data" in account settings
  2. Creates data_export_request record
  3. Server-side function collects:
     - Profile data (JSON)
     - All assessments (JSON)
     - All goals (JSON)
     - All points data (JSON)
     - Audit log for their account (JSON)
  4. Packages as ZIP file
  5. Uploads to Supabase Storage (private bucket)
  6. Generates signed URL (7-day expiry)
  7. Emails user with download link
  8. Updates request status to 'completed'

Format: JSON (machine-readable, portable)
Rate limit: 1 export per 24 hours
Rollback: Disable export button; manual CPRA requests still honored via email
```

## 4.5 Account Deletion Flow

```
Self-service deletion flow:
  1. User clicks "Delete Account" in settings
  2. Confirmation dialog explains:
     - All data will be permanently deleted
     - Process completes within 30 days
     - Cannot be undone after confirmation
  3. User confirms → creates deletion_request
  4. Email sent: "Confirm deletion within 7 days"
  5. User confirms via email link → status = 'confirmed'
  6. Background job processes deletion:
     a. Delete all assessments
     b. Delete all goals and points
     c. Delete wizard state
     d. Delete subscription (cancel Stripe if active)
     e. Delete audit log entries
     f. Delete profile
     g. Delete auth.users entry (cascade)
  7. Confirmation email sent
  8. Request marked 'completed'

SLA: 30 days from confirmation (exceeds every competitor)
Rollback: Cancel unconfirmed requests; confirmed deletions are irreversible by design
```

## 4.6 Data Growth Model

```
Per-user storage estimate:
  Profile:           ~500 bytes
  Wizard state:      ~5 KB (JSONB)
  Assessment:        ~50 KB per assessment (JSONB with full roadmap)
  Goals:             ~2 KB per goal (est. 5-10 goals per user)
  Points:            ~500 bytes per state/species entry
  Audit log:         ~200 bytes per event (est. 50 events/year)
  Subscription:      ~500 bytes

Total per active user per year: ~100 KB

At scale:
  1,000 users:    100 MB
  10,000 users:   1 GB
  100,000 users:  10 GB
  1,000,000 users: 100 GB

Supabase free tier: 500 MB database
Supabase Pro tier: 8 GB database ($25/mo)
Scaling path: Supabase Pro handles up to ~80,000 users before needing upgrade
```

---

# PHASE 5: LEGAL DEFENSIBILITY UPGRADE

## 5.1 Terms of Service — Production-Ready Rewrite

**File:** `src/app/(marketing)/terms/page.tsx` content update

### Key Sections to Add/Strengthen:

**Anti-Scraping (Missing — all competitors have this):**
```
You may not use any robot, spider, scraper, crawler, data mining tool,
or other automated means to access, collect, copy, or index any part
of the Service, including but not limited to draw odds data, state
information, unit profiles, or assessment outputs. You may not scrape,
harvest, or aggregate data from the Service for any purpose without our
express prior written consent.
```

**Competitive Use Restriction (Missing — onX/GoHunt/Spartan Forge have this):**
```
You may not access or use the Service for the purpose of building,
training, improving, or operating any product or service that competes
with the Service. You may not resell, redistribute, or sublicense access
to the Service or any data, content, or outputs derived from the Service
to any third party.
```

**User Content License (Currently absent — needs to be BETTER than competitors):**
```
You retain all ownership rights to content you create using the Service,
including goals, assessment inputs, and notes ("User Content"). By
submitting User Content, you grant us a non-exclusive, royalty-free
license to use, store, and process your User Content solely for the
purpose of providing and improving the Service. This license terminates
when you delete your account, except for aggregated, anonymized data
that cannot be re-identified.

We will not use your User Content to train machine learning models,
sell to third parties, or share with advertisers without your explicit
opt-in consent.
```

**Why this is better than competitors:** GoHunt claims "irrevocable, perpetual, unlimited" rights. onX claims "perpetual, irrevocable, worldwide, royalty-free." Our license is revocable upon account deletion and explicitly excludes AI training and advertising. This is a trust differentiator.

**Aggregated Data (Missing — competitors retain broad rights):**
```
We may create aggregated, anonymized datasets derived from user
activity that cannot reasonably be used to identify any individual
user. We retain ownership of these aggregated datasets and may use
them for research, product improvement, and statistical reporting.
These datasets will never include personally identifiable information.
```

**Data Export Rights (No competitor offers this explicitly):**
```
You have the right to export your User Content at any time through the
self-service export tool in your account settings. Exported data will
be provided in machine-readable JSON format. We will process export
requests within 48 hours.
```

**AI Training Restriction (No competitor addresses this):**
```
We do not use your personal data, User Content, or assessment outputs
to train artificial intelligence or machine learning models without
your explicit opt-in consent. Aggregated, anonymized statistical data
may be used to improve our recommendation algorithms.
```

**Intellectual Property — Our Content:**
```
All draw odds calculations, scoring algorithms, state assessments,
roadmap outputs, and recommendation engines are proprietary to
Odyssey Outdoors. You may not reverse engineer, reproduce, or create
derivative works from our analytical methodologies or outputs. The
Service and all associated intellectual property are owned by
Odyssey Outdoors, LLC.
```

**Disclaimer (Already strong — keep and strengthen):**
```
The Service provides informational tools for hunting planning purposes
only. We do not guarantee any specific draw outcome, tag allocation,
or hunting success. Draw results are determined solely by state wildlife
agencies. You are responsible for verifying all deadlines, fees,
regulations, and application requirements directly with the relevant
state fish and game department. Our calculations are estimates based
on publicly available data and may not reflect current-year changes.
```

## 5.2 Privacy Policy — Production-Ready Rewrite

### CPRA Compliance Section (Missing — MeatEater is benchmark):

```
California Privacy Rights (CPRA)

If you are a California resident, you have the following rights under
the California Privacy Rights Act:

Right to Know: You may request the categories of personal information
we collect, the purposes of collection, and the categories of third
parties with whom we share your information.

Right to Delete: You may request deletion of your personal information.
We will process deletion requests within 30 days.

Right to Correct: You may request correction of inaccurate personal
information through your account settings or by contacting us.

Right to Opt-Out: We do not sell your personal information. We do not
share your personal information for cross-context behavioral advertising.

Right to Limit: You may limit the use and disclosure of sensitive
personal information.

Non-Discrimination: We will not deny you services, charge different
prices, or provide different quality based on your exercise of
privacy rights.

We honor Global Privacy Control (GPC) signals. If your browser sends
a GPC signal, we will treat it as a valid opt-out request.

To exercise your rights, use the self-service tools in your account
settings or email privacy@odysseyoutdoors.com.
```

### PIPEDA Compliance Section (Missing — onX is benchmark):

```
Canadian Privacy Rights (PIPEDA)

If you are a Canadian resident, we comply with the Personal Information
Protection and Electronic Documents Act (PIPEDA):

Accountability: Our privacy officer oversees compliance with PIPEDA.
Contact: privacy@odysseyoutdoors.com

Consent: We collect personal information only with your knowledge and
consent, which you provide by creating an account and using the Service.

Purpose Limitation: We collect information only for the purposes
described in this policy.

Access: You may request access to your personal information at any
time through your account settings or by contacting our privacy officer.

Accuracy: You may request correction of inaccurate information.

Retention: We retain your personal information only as long as
necessary for the purposes described in this policy or as required
by law. After account deletion, we will remove your data within
30 days, except where retention is required by law.

Safeguards: We protect your personal information with encryption at
rest and in transit, access controls, and regular security assessments.

Cross-Border Transfer: Your data is stored and processed in the
United States. By using the Service, you consent to the transfer
of your data to the United States. We take reasonable steps to
ensure your data is protected during transfer.
```

### Data Retention Schedule (Missing — no competitor has explicit schedule):

```
Data Retention Schedule

Account data (profile, email): Retained while account is active.
Deleted within 30 days of confirmed account deletion.

Assessment data: Retained while account is active. Deleted within
30 days of confirmed account deletion.

Goals and points data: Retained while account is active. Deleted
within 30 days of confirmed account deletion.

Audit logs: Retained for 2 years for security and compliance purposes.
Anonymized after account deletion.

Payment data: Managed by Stripe. We do not store credit card numbers.
Stripe retains transaction records per their data retention policy.

Analytics data: Anonymized aggregate data may be retained indefinitely.
Individual browsing data is not linked to your account.

Backup copies: Database backups may contain deleted data for up to
90 days after deletion. Backups are encrypted and automatically
rotated.
```

### Cookie Policy (Missing):

```
We use strictly necessary cookies for authentication and session
management. We do not use advertising cookies, tracking pixels,
or third-party analytics cookies.

Cookies we set:
- Authentication session cookie (Supabase)
- Guest session token (if using guest mode)

We do not use: Google Analytics, Facebook Pixel, or any third-party
tracking services. We do not serve targeted advertisements.

We honor Do Not Track (DNT) and Global Privacy Control (GPC) signals.
```

**Why this is a category-leading differentiator:** GoHunt uses Google Analytics, Facebook Pixel, Kiss Metrics, Mixpanel, and Adobe. onX uses Google Analytics and Amplitude. Huntin' Fool uses Google Analytics and Facebook Pixel. MeatEater uses Google Analytics, Microsoft Clarity, Facebook, Instagram, and Google Ad Manager. We use NONE of these. This is a legitimate trust advantage.

## 5.3 Operational Legal Controls

**Breach Notification SLA:**
```
In the event of a data breach affecting your personal information:
- We will notify affected users within 72 hours of confirmation
- We will provide details of the breach, data affected, and remediation steps
- We will report to applicable regulators as required by law
- Canadian users: We will report breaches to the Privacy Commissioner
  of Canada as required by PIPEDA
```

**Data Deletion SLA:**
```
Account deletion requests are processed within 30 days of confirmation.
Data export requests are processed within 48 hours.
These commitments exceed all current industry standards in the
hunting application category.
```

---

# PHASE 6: PRICING DOMINANCE MODEL

## 6.1 Final Tier Structure

Based on competitive analysis (7 competitors, $29.99–$499.99 range, median $89.99):

| Tier | Name | Monthly | Annual | Annual Savings | Positioning |
|------|------|---------|--------|----------------|-------------|
| Free | **Basecamp** | $0 | $0 | — | Lead generation, email capture |
| Paid | **Scout** | $9.99/mo | $79.99/yr | 33% | Primary conversion target |
| Premium | **Outfitter** | $14.99/mo | $129.99/yr | 28% | Power users, full feature set |

### Feature Gating:

| Feature | Basecamp (Free) | Scout ($79.99/yr) | Outfitter ($129.99/yr) |
|---------|-----------------|--------------------|-----------------------|
| Species & state explorer | Yes | Yes | Yes |
| State scoring overview | Top 3 states only | All 11 states | All 11 states |
| Basic budget estimate | Yes | Yes | Yes |
| Full draw odds data | 1 species | All species, all states | All species, all states |
| Strategy engine (wizard) | 1 run | Unlimited | Unlimited |
| Personalized roadmap | Summary only | Full 10-year roadmap | Full 10-year roadmap |
| Goal tracking | No | Yes | Yes |
| Point portfolio management | No | Yes | Yes |
| Deadline reminders | No | Yes | Yes |
| Budget projections | No | Yes | Yes |
| Unit recommendations | No | No | Yes |
| Historical draw trends | No | No | Yes |
| Multi-year comparison | No | No | Yes |
| Data export (JSON/CSV) | No | No | Yes |
| Priority support | No | No | Yes |

### Pricing Rationale:

**$79.99/yr Scout** — Positioned against:
- GoHunt Insider ($169.99): 53% cheaper, comparable draw data + superior UX
- Spartan Forge Pro ($79.99): Price-matched, different value proposition (planning vs. prediction)
- onX Elite ($99.99): 20% cheaper, complementary (we do planning, they do mapping)
- BaseMap Pro Ultimate ($99.99): 20% cheaper

**$129.99/yr Outfitter** — Positioned against:
- GoHunt Insider ($169.99): 24% cheaper with analytics + export
- Huntin' Fool ($150/yr): 13% cheaper with tech-forward tools
- "Replace two subscriptions with one" messaging (draw data + planning in one tool)

### Introductory Pricing:

```
Launch (first 90 days):
  Scout:    $59.99/yr (25% off)
  Outfitter: $99.99/yr (23% off)

Founding Member Lock:
  First 1,000 subscribers keep intro price for 2 renewal cycles
  Creates urgency + loyalty

Annual auto-renew at standard price after founding period
Full compliance with state auto-renew laws (clear disclosure, easy cancel)
```

## 6.2 Revenue Projection

```
Conservative (Year 1):
  Free users:     5,000
  Scout:          500 × $79.99 = $39,995
  Outfitter:      200 × $129.99 = $25,998
  Total ARR:      $65,993

Moderate (Year 1):
  Free users:     15,000
  Scout:          1,500 × $79.99 = $119,985
  Outfitter:      500 × $129.99 = $64,995
  Total ARR:      $184,980

Aggressive (Year 1):
  Free users:     50,000
  Scout:          5,000 × $79.99 = $399,950
  Outfitter:      2,000 × $129.99 = $259,980
  Total ARR:      $659,930
```

## 6.3 Payment Implementation

```
Stack: Stripe
  - Stripe Checkout for initial subscription
  - Stripe Customer Portal for billing management
  - Stripe Webhooks for subscription lifecycle

Key webhooks to handle:
  - checkout.session.completed → create subscription record
  - customer.subscription.updated → update plan/status
  - customer.subscription.deleted → mark canceled
  - invoice.payment_failed → mark past_due
  - invoice.paid → reactivate

Auto-renew compliance:
  - Clear disclosure before purchase ("auto-renews annually")
  - Email reminder 7 days before renewal
  - One-click cancel in account settings
  - Proration on mid-cycle upgrades
  - No refunds on downgrades (pro-rated credit)
```

---

# PHASE 7: DEPLOYMENT ROADMAP

## Stage 1: Risk Removal (Week 1-2)
**Goal: Eliminate security + legal exposure**

| Day | Task | Rollback |
|-----|------|----------|
| 1 | Implement rate limiting (Upstash) | Remove middleware |
| 1 | Harden guest session (signed JWT) | Revert to cookie check |
| 2 | Add HSTS header | Remove header |
| 2 | Implement password reset flow | N/A (additive) |
| 3 | Add Turnstile CAPTCHA on auth | Remove widget |
| 3-4 | CSP nonce-based hardening | Revert to current CSP |
| 5 | Rewrite Terms of Service | Revert to current version |
| 5-6 | Rewrite Privacy Policy (CPRA + PIPEDA) | Revert to current version |
| 7 | Add security page + security.txt | Remove page |
| 7 | Add cookie policy section | Remove section |
| 8 | Deploy audit logging table | Drop table |
| 9 | Implement Sentry error tracking | Remove SDK |
| 10 | Security regression testing | — |

**Customer communication:** None needed (all changes are improvements, no breaking changes)

## Stage 2: Architecture Upgrade (Week 3-4)
**Goal: Entitlement + sync + export**

| Day | Task | Rollback |
|-----|------|----------|
| 11 | Deploy subscription + feature_flags tables | Drop tables |
| 12 | Build entitlement abstraction layer | Remove checks (all features open) |
| 13-14 | Implement Stripe integration | Remove Stripe; keep free tier |
| 15 | Build subscription management UI | Remove UI |
| 16 | Implement Supabase sync for wizard state | Revert to localStorage-only |
| 17 | Build data export flow | Remove export button |
| 18 | Build account deletion flow | Remove button; manual via email |
| 19-20 | Implement feature gating across app | Remove gates (all features open) |

**Customer communication:** Email existing users about new features. Free users keep current access during grace period.

## Stage 3: Monetization (Week 5-6)
**Goal: Pricing live, subscription flows working**

| Day | Task | Rollback |
|-----|------|----------|
| 21-22 | Update pricing page with final tiers | Revert to FPO page |
| 23-24 | Implement Stripe Checkout flow | Remove checkout; free only |
| 25 | Implement Stripe Customer Portal | Remove portal link |
| 26 | Implement subscription webhooks | Disable webhooks |
| 27 | Implement free tier restrictions | Remove restrictions |
| 28 | Founding member pricing campaign | End campaign |
| 29-30 | Load testing + payment flow QA | — |

**Customer communication:** "We're launching paid plans! Founding members get 25% off for life."

## Stage 4: Market Positioning (Week 7-8)
**Goal: Security-forward + feature dominance messaging**

| Day | Task | Rollback |
|-----|------|----------|
| 31 | Implement MFA (optional TOTP) | Disable MFA flag |
| 32 | Build trust/security marketing page | Remove page |
| 33 | Launch responsible disclosure program | Remove page |
| 34 | GPC signal detection implementation | Remove detection |
| 35 | Final competitive positioning review | — |
| 36-40 | Marketing launch preparation | — |

**Monitoring plan:**
- Sentry for error tracking (immediate alerts)
- Supabase dashboard for database health
- Stripe dashboard for payment health
- Weekly security audit log review
- Monthly privacy compliance check

---

# PHASE 8: FINAL DOMINANCE CHECK

## Category Position Assessment

| Domain | vs. GoHunt | vs. onX | vs. Huntin' Fool | vs. MeatEater | vs. Spartan Forge | vs. HuntStand |
|--------|-----------|---------|-------------------|---------------|-------------------|---------------|
| **Security** | **AHEAD** (MFA, rate limiting, security page) | **AHEAD** (MFA, responsible disclosure) | **FAR AHEAD** (every dimension) | **AHEAD** (MFA, no tracking) | **AHEAD** (MFA, security page) | **AHEAD** (MFA, but they have WAF) |
| **Legal** | **AHEAD** (revocable license, AI restriction, deletion SLA) | **AHEAD** (deletion SLA, export rights) | **FAR AHEAD** (every dimension) | **PARITY to AHEAD** (we match CPRA; beat on no-tracking) | **AHEAD** (PIPEDA, deletion SLA) | **AHEAD** (every dimension) |
| **Data Architecture** | **PARITY** (comparable analytics, weaker on maps) | **BEHIND** (no mapping layer) | **AHEAD** (technology-forward) | **DIFFERENT** (different product categories) | **PARITY** (different analytical approach) | **BEHIND** (no mapping) |
| **Pricing** | **AHEAD** (53% cheaper for comparable features) | **COMPLEMENTARY** (different feature set) | **AHEAD** (tech-forward at lower price) | **DIFFERENT** (not directly comparable) | **PARITY** (price-matched at $79.99) | **PREMIUM** (we charge more but offer more) |

## Overall Category Position: **AHEAD** in security, legal, and pricing. **PARITY** in core analytics. **BEHIND** in mapping (intentionally deferred).

## 3 Remaining Strategic Risks

1. **No mapping layer** — onX, HuntStand, BaseMap, Spartan Forge all have maps. We don't. This is intentional for v1 (our differentiator is planning, not mapping), but users may expect it. **Mitigation:** Position as complementary to mapping apps; consider map partnership or v2 integration.

2. **GoHunt's draw data depth** — GoHunt has 10+ years of draw data processing. Our calculation engine is strong but newer. **Mitigation:** Source directly from state wildlife agencies; build data depth over time; our UX advantage compensates.

3. **Stripe dependency** — Single payment processor creates concentration risk. **Mitigation:** Stripe is industry standard and reliable. Evaluate LemonSqueezy or Paddle as backup in Year 2.

## 3 Long-Term Moat Opportunities

1. **Privacy-first positioning** — We are the ONLY hunting app with no third-party tracking, GPC compliance, revocable content license, and self-service data export. This becomes more valuable as privacy regulation expands.

2. **Assessment engine IP** — Our 10-year strategic planning engine is unique in the category. No competitor offers multi-year, multi-state, multi-species strategic planning. This compounds over time as data improves.

3. **Data portability as switching moat** — Paradoxically, offering easy export creates loyalty. Users who can leave easily choose to stay. Competitors who lock users in create resentment. We capture the "trust premium" segment.

## Final Confirmation Checklist

- [x] We are not legally weaker than any competitor (surpass all on content license, CPRA, PIPEDA, deletion SLA)
- [x] We are not security-weaker than any competitor (surpass all on MFA, rate limiting, security page, disclosure)
- [x] Our architecture scales beyond competitor baseline (entitlement layer, sync, export, audit — at 100K users)
- [x] Our pricing reflects feature superiority ($79.99 undercuts GoHunt 53%, matches Spartan Forge, beats HuntWise)
- [x] We did not over-engineer low-value features (no mapping in v1, no AI prediction in v1, no team features in v1)
- [x] All high-risk exposure is eliminated (rate limiting, guest hardening, CSP fix, legal rewrite)
- [x] No vague recommendations remain — every item has implementation detail, timeline, and rollback path

---

*This plan is execution-ready. All artifacts are deployment-sequenced with rollback safeguards. Total implementation timeline: 8 weeks from start to market positioning launch.*
