# Competitive Intelligence Report: Hunt Planner D2C Platform
## Legal & Policy | Security Posture | Data Architecture | Pricing & Fair Market Value

**Date:** February 18, 2026
**Scope:** D2C hunting platform operating in North America (U.S. + Canada)
**Classification:** Policy intelligence analysis — not legal advice

---

# PART 1: COMPETITIVE LEGAL & DATA POLICY INTELLIGENCE

---

## 1. Executive Risk Summary

### Top 5 Legal Risks

1. **Universal anti-scraping/anti-competitive-use clauses** — Every competitor explicitly prohibits scraping, automated data extraction, and use of their service to build competing products. Any direct data ingestion from competitor platforms carries high enforcement risk.

2. **Broad perpetual user content licenses** — GoHunt, onX, MeatEater, and Spartan Forge all claim irrevocable, perpetual, worldwide licenses to user-generated content. If users upload content they originally created on a competitor, the competitor may claim co-ownership or license rights to that data.

3. **Aggregated/derived data ambiguity** — Most competitors retain explicit rights over aggregated, anonymized, or derived data. Replicating competitor-specific derived insights (draw odds calculations, heat maps, predictive models) without independent data sourcing creates IP exposure.

4. **Weak Canadian compliance across the industry** — Only onX and MeatEater have meaningful PIPEDA language. Operating in Canada with stronger compliance is both an opportunity and a baseline requirement; importing data from competitors with weak Canadian compliance creates regulatory risk.

5. **Location data sensitivity** — All competitors collect precise GPS data. Building comparable features means handling the most sensitive personal data category under CPRA and PIPEDA, with heightened consent, retention, and deletion obligations.

### Top 5 Strategic Opportunities

1. **Superior privacy compliance as trust differentiator** — Most competitors have immature CPRA posture and no Canadian compliance. Building best-in-class privacy from day one creates marketing leverage.

2. **Data portability gap** — No competitor offers robust, self-service data export. Building easy GPX/KML/CSV export makes our platform the "open" choice and encourages user migration.

3. **User-authorized import is the safest path** — Terms generally restrict the *platform* from scraping but do not (and likely cannot) prevent *users* from exporting their own data and uploading it elsewhere.

4. **Public government datasets are free to use** — Competitors all build on public BLM, USFS, state wildlife agency data. These datasets are public domain and can be independently sourced.

5. **First-mover on GPC/DNT compliance** — MeatEater is the only competitor recognizing Global Privacy Control. Being the first hunting app to fully honor GPC signals is a differentiator.

### Most Restrictive Competitor: **onX Hunt**
Broadest competitive use prohibition, explicit "substantially similar features" language, strongest map data IP claims.

### Most Permissive Competitor: **Huntin' Fool**
Least sophisticated legal framework, no CPRA deletion process, minimal restriction specificity — but also least technology-forward.

---

## 2. Competitor-by-Competitor Briefs

---

### 2A. GoHunt

**Sources:**
- Terms of Service: https://www.gohunt.com/terms (Updated Nov 7, 2022)
- Privacy Policy: https://www.gohunt.com/privacy

**(a) Data Collection Summary**

| Category | Collected | Notes |
|----------|-----------|-------|
| Identity (name, email, address, phone) | Yes | Account registration |
| Payment (credit/debit card, billing) | Yes | Via Stripe, Shopify |
| GPS/Location | Yes | GPS signals with timestamps |
| Device IDs (MAC, IMEI) | Yes | Automatic collection |
| Behavioral (clickstream, movement patterns) | Yes | Cross-application tracking |
| UGC (maps, trails, hunt reports) | Yes | Broad license granted |
| Contacts | Not stated | — |
| Derived/Predictive | Not stated | Draw odds likely derived |

**Purpose:** Service delivery, personalization, targeted advertising, analytics, community features, security.

**Retention:** "As long as we reasonably need it." Archived data may persist in backups.

**Deletion:** Email privacy@gohunt.com with 3 pieces of identifying info. No stated timeline.

**Export:** CCPA data portability request available in "readily usable" format.

**(b) Third-Party Sharing**

- **Named vendors:** Google Analytics, Facebook Pixel, Kiss Metrics, Mixpanel, Adobe, Zendesk, Shopify, Stripe, Mailchimp
- **Marketing partners/sponsors:** Shared for direct marketing with "security and confidentiality obligations"
- **Affiliates:** Parent companies and subsidiaries
- **Sale claim:** "GOHUNT does not sell your personal information"
- **DNT:** Does not honor Do Not Track signals
- **Canadian:** No PIPEDA-specific language. No cross-border transfer provisions beyond general U.S. hosting disclosure.

**(c) Integration Constraints**

| Restriction | Classification | Key Language |
|-------------|---------------|--------------|
| Scraping/crawling | **Explicitly Prohibited** | Forbids "scraping, data mining, harvesting, screen scraping, data aggregating, and indexing" |
| Automated access | **Explicitly Prohibited** | No "robot, spider, scraper or other automated means" |
| Competitive use | **Explicitly Prohibited** | Cannot "offer to third parties a service of your own that uses the Service" |
| Reverse engineering | **Explicitly Prohibited** | Cannot "reverse-engineer, reverse-compile or decompile, disassemble" |
| Account sharing | **Explicitly Prohibited** | No sharing of account or identifiers with third parties |
| User export/import | **Ambiguous** | CCPA portability exists but no explicit re-use prohibition for the user |

**(d) IP + Derived Data**

- **User content:** Users grant "irrevocable, worldwide, perpetual, non-exclusive, royalty-free, unrestricted, and unlimited right" to use commercially
- **Platform license:** Extremely broad — perpetual, irrevocable, sublicensable, commercial use
- **Derived data:** Not explicitly addressed but platform retains all IP not expressly granted to users
- **Proprietary claims:** Draw odds research, Filtering 2.0 data, INSIDER content all treated as proprietary

**(e) Risk Rating: HIGH**

1. Broadest user content license in the competitive set
2. Explicit competitive use prohibition with civil/criminal enforcement threat
3. Aggressive marketing data sharing with named ad networks

**(f) What This Means for Our Roadmap**

- Do NOT scrape GoHunt data or replicate their proprietary draw odds methodology
- User-imported data (if user manually exports their GoHunt hunt reports) is lower risk, but GoHunt's perpetual license means they retain rights to that content too
- Build independent draw odds calculations from state wildlife agency source data
- Their weak privacy posture (no DNT, aggressive ad tracking) is a differentiation opportunity

---

### 2B. onX Hunt

**Sources:**
- Terms of Use: https://www.onxmaps.com/terms-of-use (Updated Aug 4, 2023; Reviewed Oct 4, 2024)
- Privacy Policy: https://www.onxmaps.com/privacy-policy

**(a) Data Collection Summary**

| Category | Collected | Notes |
|----------|-----------|-------|
| Identity | Yes | Account registration |
| Payment | Yes | Transaction processing |
| GPS/Location | Yes | Real-time, foreground AND background |
| Device IDs | Yes | IP, OS, mobile identifiers, push tokens |
| Behavioral | Yes | Pages, searches, purchase history, interactions |
| UGC (waypoints, tracks, photos, markups) | Yes | User retains ownership but grants broad license |
| Contacts | Not stated | — |
| Derived/Predictive | Not stated | Aggregated use noted |

**Retention:** "As long as reasonably necessary." May anonymize for aggregate use.

**Deletion:** Via support@onxmaps.com. No specific timeline. CCPA verification required.

**Export:** Right to transfer mentioned for jurisdictions with data privacy laws. No technical mechanism detailed.

**(b) Third-Party Sharing**

- **Named vendors:** Google Analytics, Amplitude, advertising networks
- **Sale claim:** "We do not sell your Personal Information"
- **Ad networks:** Members of NAI and DAA; opt-out provided
- **Canadian:** Appointed privacy officer for PIPEDA compliance. Commits to fair information principles.
- **Cross-border:** U.S.-hosted, user consents to transfer. Service "not intended for EEA or other international residents."

**(c) Integration Constraints**

| Restriction | Classification | Key Language |
|-------------|---------------|--------------|
| Scraping/crawling | **Explicitly Prohibited** | Cannot "use spiders, crawlers, robots, scrapers, automated tools" |
| Competitive use | **Explicitly Prohibited** | Cannot access "for the purpose of developing, marketing, selling or distributing any product or service that competes with or includes features substantially similar to the Service" |
| Reverse engineering | **Explicitly Prohibited** | Cannot "reverse engineer, disassemble, decompile or translate" |
| Map data reuse | **Explicitly Prohibited** | Data cannot be "resold, leased, licensed, assigned, redistributed or otherwise transferred" |
| Account sharing | **Explicitly Prohibited** | "You may not share your account or password with anyone" |
| Derivative works | **Explicitly Prohibited** | Cannot "use, reproduce, modify, adapt, create derivative works" |
| User export/import | **Ambiguous** | Waypoints exportable but shared content "may remain visible even after deletion" |

**(d) IP + Derived Data**

- **User content:** Users retain ownership but grant "perpetual, irrevocable, worldwide, royalty-free" license
- **Map data:** All rights retained by onX — map data, widgets, property boundaries, all software
- **Land ownership data:** Provided "for informational purposes only," not legal surveys — but IP is claimed
- **Derived data:** May anonymize data for aggregate use. No explicit user right to aggregated insights.

**(e) Risk Rating: HIGH**

1. **Most restrictive competitive use clause** — "substantially similar features" language is uniquely aggressive
2. Map data IP claims extend to property boundaries, which are sourced from county assessors (public data overlaid with proprietary formatting)
3. Perpetual irrevocable content license plus strong enforcement posture

**(f) What This Means for Our Roadmap**

- **Critical:** Do NOT replicate onX's layer naming, structure, or visual presentation of parcel data
- Source land ownership data independently from county assessors and state GIS portals
- The "substantially similar features" clause is aggressive but likely unenforceable for standard mapping features — however, it signals litigation willingness
- Their PIPEDA compliance is actually decent — match or exceed it
- User waypoint import (GPX from user's own export) is likely safe, but avoid any automated import flow that connects to onX APIs

---

### 2C. Huntin' Fool

**Sources:**
- Terms of Service: https://www.huntinfool.com/terms
- Privacy Policy: https://www.huntinfool.com/privacy-policy

**(a) Data Collection Summary**

| Category | Collected | Notes |
|----------|-----------|-------|
| Identity (name, address, email, phone) | Yes | Account + membership |
| Payment | Yes | Credit card for transactions |
| **SSN, driver's license, hunter safety number** | **Yes** | For hunting license application service |
| GPS/Location | Not stated | Not a mapping app |
| Device IDs (IP, browser) | Yes | Automatic collection |
| Behavioral (browsing, search queries) | Yes | — |
| UGC (posted content) | Yes | Broad rights claimed |
| Contacts | Not stated | — |

**Purpose:** Membership processing, hunting license application submission, targeted advertising, research, legal compliance.

**Retention:** No explicit retention periods. No deletion process described.

**Deletion:** Not addressed. Only "review and change" via account settings mentioned.

**Export:** Not addressed.

**(b) Third-Party Sharing**

- **Named vendors:** Google Analytics (G-84G3TWWXXB), Facebook Pixel (ID: 205955978687444)
- **Government agencies:** For hunting permit applications (unique to this competitor)
- **Service providers:** Database management, payment processing, fraud detection, web analytics
- **Advertisers:** Aggregated data shared
- **Canadian:** No PIPEDA language
- **CCPA:** Only references California Civil Code § 1798.83 (disclosure request). No deletion, access, or opt-out rights detailed.

**(c) Integration Constraints**

| Restriction | Classification | Key Language |
|-------------|---------------|--------------|
| Scraping/crawling | **Explicitly Prohibited** | "prohibited from using the site...to spider, crawl, or scrape" |
| Competitive use | **Implicitly Prohibited** | Cannot "reproduce, duplicate, copy, sell, resell or exploit any portion of the Service" |
| Reverse engineering | **Not Addressed** | — |
| Content redistribution | **Explicitly Prohibited** | Cannot reproduce, copy, sell, or exploit content |
| Account sharing | **Implicitly Prohibited** | Cannot impersonate others; non-transferable codes |
| User export/import | **Not Addressed** | No export mechanism exists |

**(d) IP + Derived Data**

- **User content:** "we may, at any time, without restriction, edit, copy, publish, distribute, translate and otherwise use" any user submissions
- **Trademarks:** "Unauthorized use of the Trademarks in any manner is strictly prohibited"
- **Derived data:** Not explicitly addressed. Hunt research and recommendations treated as proprietary content.

**(e) Risk Rating: MEDIUM**

1. Least sophisticated legal framework — enforcement capacity likely lower
2. SSN/DL collection for license applications is a unique data sensitivity
3. Weak CCPA compliance creates regulatory risk for them, not us

**(f) What This Means for Our Roadmap**

- Their hunt research content is proprietary — do not replicate or reference
- Their license application service (SSN handling) is a high-liability feature we should approach carefully if we build something similar
- Weak compliance posture means users may prefer a more transparent platform
- No export mechanism = no easy import path. Users would need to manually recreate data.

---

### 2D. MeatEater

**Sources:**
- Terms of Use: https://www.themeateater.com/about-us/terms-of-use
- Privacy Policy: https://www.themeateater.com/about-us/privacy-policy
- Store Privacy: https://store.themeateater.com/pages/privacy-policy
- MeatEater TV Terms: https://episodes.themeateater.com/tos

**(a) Data Collection Summary**

| Category | Collected | Notes |
|----------|-----------|-------|
| Identity | Yes | Name, address, email, phone |
| Payment | Yes | Via Shopify; MeatEater disclaims responsibility |
| Demographics | Yes | Age, gender, DOB, income, education |
| GPS/Location | Yes | Inferred from IP |
| Device IDs | Yes | IP, cookie IDs, MAC addresses |
| Behavioral | Yes | Browsing, page interactions, email opens |
| UGC (comments, photos, reviews) | Yes | Broad license granted |
| Commercial info | Yes | Purchase history across platforms |

**Retention:** "As long as is necessary...to meet the business purpose." Legal holds may extend.

**Deletion:** Email cs@themeateater.com with "Delete Account" subject, or mail to Hailey, ID.

**Export:** CCPA portability in "portable format" for eligible residents.

**(b) Third-Party Sharing**

- **Named vendors:** Google Analytics, Microsoft Clarity, Facebook, Instagram, Google Ad Manager
- **E-commerce:** Amazon, eBay, Shopify (MeatEater disclaims control over third-party retailer data collection)
- **Sale definition:** Acknowledges cookie use "constitutes a sale of personal data to third-party advertisers" — most honest disclosure in the set
- **Categories sold/shared:** Identifiers, commercial information, internet activity data
- **GPC:** Recognizes Global Privacy Control signal (unique in this competitive set)
- **Canadian:** PIPEDA-compliant rights section. Access, correction, erasure, portability, right to object.
- **Multi-state:** Addresses Colorado, Connecticut, California explicitly

**(c) Integration Constraints**

| Restriction | Classification | Key Language |
|-------------|---------------|--------------|
| Scraping/automated access | **Explicitly Prohibited** | Cannot "use any 'deep-link', 'page-scrape', 'robot', 'spider' or other automatic device" |
| Reverse engineering | **Explicitly Prohibited** | Cannot "modify, reverse engineer, decompile, disassemble, reduce" source code |
| Competitive intelligence | **Explicitly Prohibited** | Cannot "trace or seek to trace any information on any other user" |
| System interference | **Explicitly Prohibited** | No flooding, spamming, mail bombing |
| User export/import | **Not Addressed** | Content is primarily editorial, not user location data |

**(d) IP + Derived Data**

- **User content:** Users grant "non-exclusive, irrevocable, unrestricted, perpetual, transferable, worldwide and royalty-free" rights
- **Feedback:** Becomes MeatEater's proprietary information with all "rights, title and interest"
- **Editorial content:** Articles, videos, graphics all owned by MeatEater — cannot reproduce without permission
- **E-commerce:** Third-party payment responsibility is disclaimed

**(e) Risk Rating: MEDIUM**

1. Most mature privacy compliance in the set (GPC, multi-state, PIPEDA)
2. E-commerce data sharing creates broader exposure surface
3. Content license is transferable — unusual and expansive

**(f) What This Means for Our Roadmap**

- MeatEater is primarily a content/commerce platform, not a mapping/planning tool — less direct feature competition
- Their mature privacy posture sets the compliance bar we should meet
- Do not scrape their editorial content (articles, videos, recipes)
- Their GPC compliance is worth emulating
- Transferable content license means they could license user content to third parties — unusual risk if users cross-post

---

### 2E. Spartan Forge

**Sources:**
- Terms of Service: https://spartanforge.ai/pages/terms-of-service
- Privacy Policy: https://spartanforge.ai/pages/privacy-policy

**(a) Data Collection Summary**

| Category | Collected | Notes |
|----------|-----------|-------|
| Identity | Yes | Registration |
| Payment | Yes | Billing/credit card |
| GPS/Location | Yes | Precise: city, county, state, zip, lat/long |
| Device IDs | Yes | IP, browser, domain, access times |
| Behavioral | Yes | Website/page tracking within platform |
| UGC (tracks, routes, scouting data) | Yes | Associated with account |
| Predictive/Derived | Yes | Deer movement forecasts, weather integration |

**Retention:** Not defined.

**Deletion:** CCPA deletion rights noted with standard exceptions.

**Export:** Not addressed.

**(b) Third-Party Sharing**

- **Sale claim:** "Does not sell, rent or lease its customer lists"
- **Trusted partners:** Statistical analysis, email, customer support, deliveries
- **Mandatory disclosure:** Law enforcement when required
- **Canadian:** No PIPEDA provisions

**(c) Integration Constraints**

| Restriction | Classification | Key Language |
|-------------|---------------|--------------|
| Scraping/automated access | **Explicitly Prohibited** | No "robot, spider, scraper or other automated means" without "express prior written permission" |
| Competitive use | **Explicitly Prohibited** | Cannot offer service to third parties or "integrate it into competing offerings" |
| Reverse engineering | **Explicitly Prohibited** | Software "may not be translated, reverse-engineered, reverse-compiled or decompiled" |
| Account sharing | **Implicitly Prohibited** | Standard terms |
| User export/import | **Not Addressed** | — |

**(d) IP + Derived Data**

- **User content:** "irrevocable right to use and distribute that content, your name, likeness, and biographical information for any purpose, without payment"
- **AI/Predictive models:** Proprietary. Deer movement forecasting and predictive insights are core IP.
- **Location data:** Route history and scouting data retained as platform data.

**(e) Risk Rating: MEDIUM-HIGH**

1. AI/predictive model is their core differentiator — replicating methodology is high risk
2. Broad user content license including name and likeness
3. Location data retention with no stated limits

**(f) What This Means for Our Roadmap**

- Do NOT replicate their AI deer movement prediction methodology
- Build independent predictive models from public wildlife data, weather APIs, and first-party user data
- Their weak privacy posture (no retention limits, no Canadian compliance) is a differentiator for us
- Location data handling needs careful consent architecture

---

### 2F. HuntStand (Partial — WAF blocked direct access)

**Sources:**
- Terms of Use: https://www.huntstand.com/terms-of-use/ (WAF blocked; info from search results)
- Privacy Policy: https://www.huntstand.com/privacy/ (WAF blocked; info from search results)
- App Terms: https://app.huntstand.com/terms-and-conditions
- Developer: GSM Outdoors, LLC / TerraStride Inc.

**(a) Data Collection Summary**

| Category | Collected | Notes |
|----------|-----------|-------|
| Identity | Yes | Registration details |
| Payment | Yes | Subscription processing |
| GPS/Location | Yes | Background collection even when app not open (Trace feature) |
| Device IDs | Yes | Standard automatic collection |
| Behavioral | Yes | App usage patterns |
| UGC (hunt areas, traces, paths, markers) | Yes | Land management features |

**Retention:** Not clearly stated from available information.

**Deletion:** Not clearly stated from available information.

**(b) Third-Party Sharing**

- **TerraStride:** Users consent to allow TerraStride to "share or sell specific types of non-personal information"
- **Non-personal data sale:** Explicitly acknowledged — unique in competitive set
- **Named vendors:** Not visible from available search data

**(c) Integration Constraints**

| Restriction | Classification | Key Language |
|-------------|---------------|--------------|
| Scraping | **Likely Prohibited** | Standard prohibited uses clause (full text not accessible) |
| IP infringement | **Explicitly Prohibited** | Cannot infringe intellectual property rights |
| Personal data collection | **Explicitly Prohibited** | Cannot collect or track personal information of others |

**(d) Risk Rating: MEDIUM** (Lower confidence due to WAF-blocked access)

1. Background GPS collection is most aggressive in the set
2. Non-personal data sale acknowledgment is unusual transparency
3. Full restriction set not fully verifiable

---

## 3. Comparative Legal Matrix

| Dimension | GoHunt | onX Hunt | Huntin' Fool | MeatEater | Spartan Forge | HuntStand |
|-----------|--------|----------|--------------|-----------|---------------|-----------|
| **Scraping prohibited** | Yes — explicit | Yes — explicit | Yes — explicit | Yes — explicit | Yes — explicit | Likely yes |
| **Competitive use restricted** | Yes — explicit | Yes — strongest ("substantially similar") | Implicit only | Implicit (user tracing) | Yes — explicit | Unclear |
| **User content license breadth** | Perpetual, irrevocable, unlimited | Perpetual, irrevocable, royalty-free | Unrestricted edit/copy/publish | Perpetual, irrevocable, transferable | Irrevocable, includes likeness | Not verified |
| **Location/GPS collection** | Yes + timestamps | Yes — foreground + background | Not applicable | IP-inferred only | Precise lat/long | Background even when closed |
| **Third-party ads/analytics** | Google, Facebook, Mixpanel, Adobe, KissMetrics | Google Analytics, Amplitude, ad networks | Google Analytics, Facebook Pixel | Google Analytics, Clarity, Facebook, Instagram, Google Ad Manager | Cookies, trusted partners | TerraStride partners |
| **Data export offered** | CCPA portability only | Mentioned but no mechanism | No | CCPA portability | No | Not verified |
| **Deletion process clarity** | Email + 3 ID pieces | Email support@ | None described | Email + mail option | CCPA rights | Not verified |
| **"Sale/share" language** | "Does not sell" | "Does not sell" | Not addressed | Acknowledges cookie tracking = sale | "Does not sell, rent or lease" | Sells non-personal data |
| **CPRA disclosure maturity** | Basic (categories, sources, purposes) | Basic | Minimal (§1798.83 only) | **Advanced** (multi-state, GPC) | Basic | Not verified |
| **Canadian compliance** | None | **PIPEDA officer appointed** | None | **PIPEDA rights section** | None | Not verified |
| **Notable unusual clause** | Civil/criminal enforcement threat | "Substantially similar features" prohibition | SSN/DL collection for license apps | Transferable content license; GPC recognition | AI prediction = core IP; likeness rights | Background GPS even when app closed; non-personal data sale |

---

## 4. Scenario Analysis

### Scenario 1: User uploads exported waypoints/notes from competitor into our app

**Risk Level: LOW-MEDIUM**

- **Legal risk drivers:** Competitor ToS bind the *user*, not us. Users exporting their own data may technically violate competitor terms, but enforcement against individual users is extremely rare. Our platform is not party to their agreement.
- **Enforcement likelihood:** Very low. No hunting app has publicly enforced against users for re-uploading their own waypoint data.
- **Safer alternative:** Build a manual import tool (GPX/KML upload) that accepts standard formats. Do NOT build automated connectors that authenticate to competitor APIs. Include a disclaimer that users are responsible for compliance with their other service agreements.

### Scenario 2: We scrape publicly accessible competitor web content

**Risk Level: HIGH**

- **Legal risk drivers:** Every competitor explicitly prohibits scraping. CFAA (Computer Fraud and Abuse Act) exposure. ToS violations create breach of contract claims. *hiQ v. LinkedIn* provides some protection for truly public data, but competitor content pages (articles, draw data, hunt research) are behind semi-public access.
- **Enforcement likelihood:** Medium-High. onX and GoHunt have litigation-ready language.
- **Safer alternative:** Source all data independently from government agencies, licensed datasets, and first-party research. Never scrape competitor websites.

### Scenario 3: We use third-party land ownership datasets similar to competitors

**Risk Level: LOW**

- **Legal risk drivers:** County assessor data, BLM boundaries, USFS boundaries, state GIS portals are public records. Competitors cannot own public data even if they display it.
- **Enforcement likelihood:** Low. The data itself is public domain. However, the *presentation, formatting, and layer structure* may be protectable trade dress.
- **Safer alternative:** Source directly from county assessors, state GIS offices, and federal data portals. Build our own layer presentation, naming conventions, and visual design. Do NOT copy onX's color schemes, layer names, or UI patterns for displaying parcel data.

### Scenario 4: We build a feature that replicates competitor's proprietary layer naming/structure

**Risk Level: MEDIUM-HIGH**

- **Legal risk drivers:** onX's "substantially similar features" clause, while likely overbroad, signals litigation willingness. Trade dress claims on distinctive mapping presentations. Structural replication of proprietary categorization systems may constitute derivative works.
- **Enforcement likelihood:** Medium. Only actionable if our implementation is demonstrably copied rather than independently developed.
- **Safer alternative:** Design our own information architecture from first principles. Use different layer naming, color coding, iconography, and organizational hierarchy. Document independent design decisions.

### Scenario 5: We ingest user-generated content originally created on competitor platforms

**Risk Level: MEDIUM**

- **Legal risk drivers:** Competitors hold perpetual, irrevocable licenses to UGC. The user still owns the content and can share it, but the competitor retains parallel rights. If user uploads scouting notes originally written on GoHunt, GoHunt retains license to those notes — but that doesn't prevent the user from also sharing them with us.
- **Enforcement likelihood:** Low for individual uploads. Higher if we build automated bulk import tools.
- **Safer alternative:** Accept user-initiated manual uploads only. Do NOT build "import from GoHunt" branded features. Store imported data as user-owned first-party data in our system with clear provenance logging.

### Scenario 6: We allow users to link competitor accounts via credentials

**Risk Level: HIGH**

- **Legal risk drivers:** Every competitor prohibits account sharing and credential sharing. Storing or using competitor credentials creates CFAA exposure. OAuth is not offered by any competitor.
- **Enforcement likelihood:** High. This is the most clearly actionable violation.
- **Safer alternative:** Never accept, store, or use competitor credentials. Use file-based import (GPX/KML upload) or manual data entry.

### Scenario 7: We analyze aggregated behavioral patterns that resemble competitor features

**Risk Level: LOW-MEDIUM**

- **Legal risk drivers:** If built from our own first-party data, this is standard product development. Risk only arises if the methodology is demonstrably copied from competitor implementations or if we use competitor data as a training source.
- **Enforcement likelihood:** Low if independently developed. Higher if we can't prove independent development.
- **Safer alternative:** Build analytics from first-party data only. Document methodology development independently. Use public wildlife agency data, weather data, and user-contributed data for all predictive features.

---

## 5. Cross-Competitor Patterns

### 5 Shared Patterns

1. **Universal anti-scraping** — Every competitor prohibits automated data extraction
2. **Perpetual irrevocable UGC licenses** — Industry standard; all claim broad rights to user content
3. **"We do not sell" language** — Almost universal (except HuntStand on non-personal data), despite active ad-tech sharing
4. **Minimal data export** — No competitor offers easy self-service data export beyond CCPA portability
5. **U.S.-centric compliance** — Canadian compliance is afterthought for most; international users acknowledged but not well-served

### 5 Meaningful Differences

1. **onX's "substantially similar features" clause** — Uniquely aggressive competitive restriction
2. **MeatEater's GPC recognition** — Only competitor honoring Global Privacy Control
3. **Huntin' Fool's SSN/DL collection** — Unique sensitive data handling for license application service
4. **HuntStand's background GPS collection** — Most aggressive location tracking posture
5. **MeatEater's honest "sale" acknowledgment** — Only competitor admitting cookie tracking = data sale under state law

---

## 6. Recommendations for Legal + Product Teams

### A. Legal Architecture Recommendations

**Clauses to include in our Terms:**
- Standard anti-scraping clause (industry norm)
- Clear user content license — but consider making it *revocable upon account deletion* as a differentiator
- Explicit data portability commitment beyond CCPA minimum
- "No competitive use" clause for automated access but NOT for general feature parity (avoid onX's overreach)

**Clauses to avoid:**
- Do NOT claim perpetual irrevocable rights to user location data
- Do NOT disclaim responsibility for payment processor security (MeatEater's approach is anti-user)
- Avoid "civil/criminal proceedings" threat language (GoHunt — unnecessarily aggressive)

**Privacy policy recommendations:**
- Honor GPC from day one
- Include PIPEDA section with named privacy officer
- Address CPRA, Colorado, Connecticut, Virginia, and Texas explicitly
- Provide clear deletion timeline (e.g., 30 days)
- Offer self-service data export in GPX, KML, CSV, and JSON

### B. Product Design Recommendations to Reduce Risk

1. **File-based import only** — Accept GPX, KML, CSV uploads. Never API-connect to competitors.
2. **Original data architecture** — Design layer names, color schemes, and UX patterns independently. Document design decisions.
3. **Provenance logging** — Tag all data with source (first-party, user-imported, government dataset, licensed third-party).
4. **Government data pipeline** — Build direct integrations with BLM, USFS, state wildlife agencies, county assessors.
5. **Consent architecture** — Granular opt-in for location tracking, analytics, and any data sharing.

### C. Checklist for Counsel Review

- [ ] Review and finalize Terms of Service with anti-scraping and competitive use clauses
- [ ] Review Privacy Policy for CPRA, multi-state, and PIPEDA compliance
- [ ] Evaluate whether to offer revocable (vs. irrevocable) user content license
- [ ] Assess CFAA implications of any competitor data ingestion features
- [ ] Review GPX/KML import feature for IP and contract tortious interference risk
- [ ] Evaluate trade dress risk for mapping layer presentation
- [ ] Review subscription auto-renew compliance for all 50 states + Canadian provinces
- [ ] Assess need for SSN/sensitive data handling if license application feature is built
- [ ] Review cross-border data transfer mechanisms for Canadian users
- [ ] Evaluate cookie consent banner requirements for California, Colorado, Connecticut

### D. Unknowns to Clarify with Counsel

1. Does *hiQ v. LinkedIn* protect ingestion of truly public competitor content (e.g., public forum posts)?
2. Can a competitor's "substantially similar features" clause survive antitrust scrutiny?
3. If a user exports GPX from onX and uploads to us, are we exposed to tortious interference claims?
4. What constitutes protectable trade dress in hunting map layer presentation?
5. Does PIPEDA require explicit opt-in consent for location tracking in Canadian users?

---

### E. 5 Safer Amalgamation Strategies

1. **User-authorized manual import** — Users export their own data from competitors in standard formats (GPX/KML/CSV) and upload to our platform. We store as first-party user data with provenance tags. Risk: LOW.

2. **Independent government data sourcing** — Build direct data pipelines to BLM, USFS, state wildlife agencies, county GIS offices. Same underlying public data as competitors, independently sourced and independently presented. Risk: LOW.

3. **Licensed third-party datasets** — Purchase land ownership data from commercial providers (CoreLogic, Regrid, etc.) under commercial license rather than deriving from competitor presentations. Risk: LOW.

4. **Transformative schema mapping** — If accepting imported data, normalize into our own schema that is structurally distinct from competitor data models. Different field names, different hierarchies, different metadata structures. Risk: LOW-MEDIUM.

5. **First-party data enrichment** — Build value from our own users' contributed data (with consent). Aggregate anonymized hunt reports, harvest data, and scouting insights to create proprietary datasets that don't depend on competitor data at all. Risk: LOWEST.

---

# PART 2: COMPETITIVE SECURITY POSTURE INTELLIGENCE

---

## 1. Executive Security Summary

### Strongest Security Posture (Public Signals): **onX Hunt**
Montana-based, significant engineering team, Amplitude/Google Analytics suggest mature analytics infrastructure. PIPEDA officer appointed. Map tile infrastructure requires significant backend security. Binding arbitration with AAA suggests legal maturity.

### Weakest Transparency Posture: **Huntin' Fool**
No encryption disclosures. No security page. No breach notification language. Minimal compliance infrastructure. Hosted on Shopify (e-commerce) with basic web presence.

### 5 Common Industry Security Patterns

1. **HTTPS enforced** across all competitors (baseline expectation)
2. **Third-party payment processing** — All use Stripe, Shopify, or similar PCI-compliant processors rather than handling cards directly
3. **No public bug bounty programs** — Zero competitors offer responsible disclosure programs
4. **No public security pages** — No competitor has a dedicated security information page
5. **Cookie-based session management** — Universal reliance on session/persistent cookies

### 5 Security Gaps/Inconsistencies

1. **No competitor offers MFA** — None publicly document multi-factor authentication availability
2. **No SOC 2 or ISO references** — Zero competitors reference security certifications
3. **Background GPS with no stated security** — HuntStand and onX collect background location data without disclosing encryption or access controls
4. **SSN handling without stated protections** — Huntin' Fool collects SSNs without describing encryption, tokenization, or access controls
5. **No breach notification commitments** — Only MeatEater approaches breach language; most have no commitment

---

## 2. Competitor Security Briefs

### GoHunt — Security Posture

**Infrastructure Signals (Medium Confidence):**
- Cloud-hosted (likely AWS based on service architecture patterns)
- CDN likely in use (modern SPA with fast global load times)
- TLS/HTTPS enforced
- Stripe for payment processing (PCI scope minimized)
- Shopify integration for merchandise

**Application-Level Controls:**
- Email/password authentication (no MFA documented)
- One account per person enforced
- Standard session cookies
- CAPTCHA: Not publicly documented

**Encryption & Compliance:**
- PCI: Handled by Stripe (not in-scope themselves)
- SOC 2: Not referenced
- Encryption at rest: Not disclosed
- Encryption in transit: HTTPS enforced

**Trust & Disclosure:**
- No security page
- No bug bounty
- No breach notification commitment
- No security.txt

**Maturity Assessment: Low-Moderate** | **Confidence: Medium**

### onX Hunt — Security Posture

**Infrastructure Signals (Medium-High Confidence):**
- Significant engineering team (100+ employees)
- Missoula, MT headquarters with dedicated tech infrastructure
- Mobile apps on iOS and Android suggest native development pipeline
- Offline map functionality requires sophisticated tile serving and caching
- TLS/HTTPS enforced
- Likely CDN for map tile delivery (Mapbox, or proprietary)

**Application-Level Controls:**
- Email/password authentication
- Mobile app PIN/biometric: Likely available (standard for mapping apps)
- Account lockout: Not documented
- API authentication: Not publicly documented

**Encryption & Compliance:**
- PCI: Third-party processor
- SOC 2: Not referenced
- PIPEDA compliance officer appointed (positive signal)
- Binding arbitration clause suggests legal counsel engagement

**Trust & Disclosure:**
- No public security page
- No bug bounty
- No breach notification commitment
- EEA notice suggests awareness of international security obligations

**Maturity Assessment: Moderate** | **Confidence: Medium-High**

### Huntin' Fool — Security Posture

**Infrastructure Signals (Low-Medium Confidence):**
- Shopify-hosted e-commerce
- Likely shared hosting for main site
- Minimal custom technology infrastructure
- TLS/HTTPS enforced (Shopify default)

**Application-Level Controls:**
- Basic email/password authentication
- No documented MFA
- No documented CAPTCHA
- Handles SSN/DL with no stated security controls — **major red flag**

**Encryption & Compliance:**
- Policy explicitly states: cannot guarantee security of transmitted information
- PCI: Shopify handles payment (good)
- SSN handling: No stated encryption, tokenization, or access controls
- SOC 2: Not referenced

**Trust & Disclosure:**
- No security page
- No bug bounty
- No breach notification language
- Explicit security disclaimer

**Maturity Assessment: Low** | **Confidence: Medium**

### MeatEater — Security Posture

**Infrastructure Signals (Medium Confidence):**
- Multi-property web infrastructure (themeateater.com, store.themeateater.com, episodes.themeateater.com, help.themeateater.com)
- Shopify for e-commerce
- Likely CDN for video/content delivery
- Microsoft Clarity integration suggests data-driven approach

**Application-Level Controls:**
- Email/password authentication
- No documented MFA
- Separate authentication across properties (main site, store, TV)

**Encryption & Compliance:**
- PCI: Shopify handles payment
- SOC 2: Not referenced
- GPC recognition demonstrates privacy engineering maturity
- Multi-state privacy compliance suggests dedicated legal/compliance team
- PIPEDA section suggests international compliance awareness

**Trust & Disclosure:**
- No security page
- No bug bounty
- Data subject request form available
- Help center with policy articles

**Maturity Assessment: Moderate** | **Confidence: Medium**

### Spartan Forge — Security Posture

**Infrastructure Signals (Low-Medium Confidence):**
- Shopify-powered site (spartanforge.ai on Shopify)
- AI/ML workloads likely cloud-hosted (AWS SageMaker or similar)
- TLS/HTTPS enforced
- SSL encryption mentioned for credit card transmission

**Application-Level Controls:**
- Basic authentication
- No documented MFA
- Mobile app with location services

**Encryption & Compliance:**
- SSL for credit card transmission explicitly mentioned
- No SOC 2 or ISO references
- AI model security not discussed

**Trust & Disclosure:**
- No security page
- No bug bounty
- No breach notification language

**Maturity Assessment: Low** | **Confidence: Low-Medium**

### HuntStand — Security Posture

**Infrastructure Signals (Medium Confidence):**
- WAF in use (Incapsula/Imperva) — strongest observable perimeter security
- TerraStride/GSM Outdoors corporate backing
- Mobile-first architecture (iOS + Android)
- Background GPS tracking requires robust mobile security

**Application-Level Controls:**
- Account-based authentication
- Background location access requires OS-level permissions
- Trace feature suggests sophisticated mobile data pipeline

**Encryption & Compliance:**
- WAF (Imperva) suggests infrastructure security investment
- Physical, technical, and procedural measures mentioned
- Database access restricted to employees who need it
- PCI: Third-party processor likely

**Trust & Disclosure:**
- No public security page
- No bug bounty
- Imperva WAF is a positive infrastructure signal

**Maturity Assessment: Low-Moderate** | **Confidence: Medium**

---

## 3. Comparative Security Matrix

| Dimension | GoHunt | onX Hunt | Huntin' Fool | MeatEater | Spartan Forge | HuntStand |
|-----------|--------|----------|--------------|-----------|---------------|-----------|
| **HTTPS enforced** | Yes | Yes | Yes | Yes | Yes | Yes |
| **HSTS present** | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown |
| **CDN/WAF in use** | Likely CDN | Likely CDN | Shopify CDN | Shopify CDN | Shopify CDN | **Imperva WAF** |
| **MFA available** | No evidence | No evidence | No evidence | No evidence | No evidence | No evidence |
| **Password complexity stated** | No | No | No | No | No | No |
| **CAPTCHA/bot mitigation** | No evidence | No evidence | No evidence | No evidence | No evidence | Imperva |
| **SOC 2 referenced** | No | No | No | No | No | No |
| **PCI compliance** | Via Stripe | Via processor | Via Shopify | Via Shopify | Via Shopify | Via processor |
| **Encryption at rest disclosed** | No | No | No | No | No | No |
| **Bug bounty program** | No | No | No | No | No | No |
| **Security page present** | No | No | No | No | No | No |
| **Breach response transparency** | None | None | None | Partial (DSR form) | None | None |

---

## 4. Recommended Security Architecture for Our D2C Platform

### A. Infrastructure Layer

- **Hosting:** AWS or GCP with VPC isolation. Multi-AZ deployment for availability.
- **CDN/WAF:** Cloudflare or AWS CloudFront + WAF. Rate limiting on all API endpoints.
- **DDoS:** Cloud provider native protection + CDN-layer mitigation.
- **TLS:** TLS 1.3 minimum. HSTS with preload. Certificate transparency monitoring.
- **Secrets:** AWS Secrets Manager or HashiCorp Vault. No secrets in code or environment variables.
- **Monitoring:** CloudWatch/Datadog + Sentry for error tracking. SIEM for security events.

### B. Application Layer

- **Authentication:** Email/password with bcrypt + optional MFA (TOTP) from day one. This alone exceeds every competitor.
- **Session handling:** HttpOnly, Secure, SameSite cookies. Short-lived JWTs with refresh token rotation.
- **API authentication:** API keys with rate limiting for any external APIs. OAuth 2.0 for partner integrations.
- **Bot mitigation:** reCAPTCHA v3 or Turnstile on registration and login.
- **Rate limiting:** Per-endpoint rate limits. Graduated throttling for repeated failures.

### C. Data Layer

- **Encryption at rest:** AES-256 for all stored data. AWS KMS or equivalent for key management.
- **Encryption in transit:** TLS 1.3 for all connections including internal services.
- **Location data:** Encrypt at field level in addition to disk-level encryption. Separate encryption key scope for location data.
- **Payment:** Stripe or similar PCI Level 1 processor. Never store card data.
- **Media storage:** S3 with server-side encryption. Signed URLs for access.
- **Backups:** Encrypted backups with separate key. Cross-region replication.

### D. Compliance & Trust

- **SOC 2 roadmap:** Plan for Type I in year 1, Type II in year 2. This would be unique in the hunting app space.
- **Responsible disclosure page:** Publish security.txt and a vulnerability reporting process. First in the industry.
- **Breach response:** Define response plan, notification timelines (72 hours for PIPEDA, per-state for U.S.), and communication templates.
- **Privacy by design:** Data minimization, purpose limitation, and retention limits built into the schema.
- **Security marketing:** "Your data is encrypted, exportable, and deletable" messaging. Trust page on website.

### E. Competitive Differentiation Strategy

**3 areas where competitors are weak/silent:**
1. **MFA** — No competitor offers it. Even optional MFA is a differentiator.
2. **Security transparency** — No competitor has a security page, bug bounty, or security.txt. Publishing these creates trust.
3. **Encryption disclosures** — No competitor discloses encryption at rest. Being specific about AES-256, KMS, etc. signals maturity.

**3 areas where exceeding baseline creates trust leverage:**
1. **SOC 2 certification** — First hunting app with SOC 2 is a powerful B2B and enterprise sales signal.
2. **Data export** — Easy self-service export in multiple formats signals confidence and user respect.
3. **Breach response commitment** — Published SLA for breach notification exceeds every competitor.

**"Security-forward" positioning viability:** YES. The hunting industry has no security leaders. Being first creates category ownership with minimal additional engineering cost.

### Scenario Cost Analysis

| Scenario | Competitive Parity | Trust Marketing | Cost/Complexity | Strategic Value |
|----------|-------------------|-----------------|-----------------|-----------------|
| Mandatory MFA | Exceeds all | High | Low | High |
| Optional MFA (default off) | Exceeds all | Medium | Low | Medium |
| Device binding | Exceeds all | Low | Medium | Low |
| Zero-trust internal | Exceeds all | Low | High | Low (overkill for D2C) |
| E2E encryption of location notes | Exceeds all | High | Medium | High |
| Per-user encryption keys | Exceeds all | High | High | Medium |
| Public bug bounty | Exceeds all | High | Low | High |
| SOC 2 Type II | Exceeds all | Very High | High ($$) | Very High |

---

# PART 3: COMPETITIVE DATA ARCHITECTURE INTELLIGENCE

---

## 1. Executive Architecture Summary

### 5 Dominant Industry Architecture Patterns

1. **Mobile-first with web companion** — All mapping competitors (onX, HuntStand, BaseMap, Spartan Forge) are mobile-primary with web dashboards. GoHunt and MeatEater are web-primary.
2. **Offline-capable map caching** — Required feature for backcountry use. Local tile storage with background sync.
3. **Subscription-gated regional content** — State-by-state or region-based entitlement (onX state layers, GoHunt state data).
4. **Third-party payment delegation** — Universal use of Stripe/Shopify rather than in-house payment processing.
5. **Public data overlay model** — Competitors layer proprietary UX over public government datasets (BLM, county assessor, wildlife agency data).

### 5 Meaningful Structural Differences

1. **onX's offline tile architecture** — Most sophisticated spatial data system. Downloadable state packages for offline use.
2. **Spartan Forge's AI pipeline** — Unique ML workload for deer movement prediction. Likely requires cloud compute (not edge).
3. **GoHunt's draw data engine** — Statistical analysis of state draw data. Likely precomputed and cached by state/species/unit.
4. **MeatEater's multi-property architecture** — Separate domains for editorial, e-commerce, and streaming. Likely separate databases or at minimum separate schemas.
5. **Huntin' Fool's license application integration** — Direct integration with state wildlife agencies for permit applications. Requires secure PII handling pipeline (SSN).

### Most Scalable Architecture (Inferred): **onX Hunt**
Tile-serving architecture with offline support scales well. Engineering team size (100+) suggests mature DevOps. Multi-platform (iOS, Android, web) with sync.

### Most Brittle Architecture Risk (Inferred): **Huntin' Fool**
Shopify-dependent, SSN handling without stated security architecture, minimal technology team, no apparent sync or offline capability.

### Immediate Architecture Priorities for Our Build
1. Offline-capable mobile architecture with conflict-free sync
2. Subscription entitlement layer that supports state-based + feature-based gating
3. Geospatial tile pipeline from public data sources
4. Standardized GPX/KML import pipeline with provenance tagging
5. Privacy-by-design data model with field-level encryption for sensitive data

---

## 2. Competitor Data Architecture Briefs

### GoHunt — Inferred Data Architecture

**Observed Product Features:**
- Draw odds calculator with historical data
- Filtering system for hunt units by species, weapon, difficulty
- INSIDER research articles and unit profiles
- Mobile app + web platform
- Points tracking across states

**Inferred Data Model (Medium Confidence):**

```
Users:
  - user_id (UUID)
  - email, name, profile
  - subscription_tier (free, insider)
  - subscription_state (active, expired, trial)

Subscriptions:
  - stripe_customer_id
  - plan_id, renewal_date
  - payment_method (via Stripe)

DrawData (precomputed):
  - state, species, unit, weapon_type
  - year, applicants, tags_available
  - calculated_odds, point_threshold
  - Historical arrays by year

UnitProfiles:
  - state, unit_id
  - species_available[]
  - access_info, terrain_data
  - editorial_content (INSIDER-gated)

UserPoints:
  - user_id, state
  - species, current_points
  - application_history[]

Content:
  - article_id, title, body, media
  - access_level (free, insider)
  - tags, categories
```

**Geospatial Strategy:** Lightweight — GoHunt is not primarily a mapping app. Hunt unit boundaries likely served as GeoJSON overlays on a third-party base map (Google Maps or Mapbox).

**UGC Model:** Limited. Users don't create waypoints or tracks. UGC is primarily hunt reports, forum posts, and application data.

**Derived Data:** Draw odds are their core derived dataset. Likely precomputed batch jobs from state wildlife agency draw result data. Updated annually per state draw cycle.

**Subscription Entitlement:** Likely feature-flag based. INSIDER tier gates access to unit profiles, filtering tools, and research content.

**Confidence: Medium**

---

### onX Hunt — Inferred Data Architecture

**Observed Product Features:**
- Offline downloadable maps by state
- Property boundary/ownership overlays
- Public land boundaries (BLM, USFS, state)
- Waypoints, tracks, markers, photos
- Shared waypoint folders
- Hunt unit boundaries with harvest data
- Wind/weather overlays
- Satellite and topo base maps

**Inferred Data Model (Medium-High Confidence):**

```
Users:
  - user_id (UUID)
  - auth (email/password, likely OAuth optional)
  - subscription_tier (free, premium, elite)
  - entitled_states[]

Subscriptions:
  - tier, entitled_states[]
  - payment_method, renewal_date
  - add_ons (chip layers, etc.)

MapTiles:
  - Likely vector tiles (MVT format)
  - State-packaged for offline download
  - Multiple layers: topo, satellite, hybrid
  - Versioned (update cadence)

ParcelData:
  - state, county, parcel_id
  - owner_name, owner_type (public/private)
  - geometry (polygon)
  - Source: county assessor data (licensed or public)

PublicLand:
  - agency (BLM, USFS, NPS, State)
  - geometry (polygon)
  - access_level, designation
  - Source: federal/state GIS data

Waypoints:
  - waypoint_id, user_id
  - lat, lng, elevation
  - name, description, icon
  - photos[] (S3 references)
  - folder_id (for organization)
  - shared_with[] (user_ids or link access)
  - created_at, updated_at
  - sync_version (for conflict resolution)

Tracks:
  - track_id, user_id
  - points[] (lat/lng/elevation/timestamp array)
  - distance, duration, metadata
  - sync_version

HuntUnits:
  - state, unit_id, species
  - geometry (polygon)
  - harvest_stats, regulations
  - season_dates
```

**Geospatial Strategy (High Confidence):**
- Vector tiles served from proprietary tile server (likely Mapbox GL compatible)
- State-packaged offline downloads suggest pre-rendered tile packages
- PostGIS or equivalent spatial database for server-side operations
- Multiple base layers (topo, satellite, hybrid) suggest relationship with satellite imagery provider
- Parcel data likely licensed from commercial provider (Regrid, CoreLogic) and overlaid

**UGC Model (Medium Confidence):**
- Server-synced with offline capability (hybrid)
- Local SQLite on mobile for offline storage
- Background sync when connectivity available
- Photo storage in object storage (S3) with CDN delivery
- Sharing model: private default, shared by folder or individual waypoint link

**Derived Data:**
- Harvest statistics per unit (from state wildlife agency data)
- Wind overlays (from weather API)
- Property boundaries as derived from county assessor data

**Confidence: Medium-High**

---

### Huntin' Fool — Inferred Data Architecture

**Observed Product Features:**
- Membership-gated hunt research and recommendations
- Hunt application service (submits permits on behalf of users)
- Magazine (physical + digital)
- Draw odds and unit information
- Member forums

**Inferred Data Model (Medium Confidence):**

```
Members:
  - member_id
  - name, email, address, phone
  - ssn_encrypted, dl_encrypted, hunter_safety_num
  - membership_tier, renewal_date
  - Shopify customer_id

Applications:
  - member_id, state
  - species, unit, weapon
  - application_year
  - ssn (for state submission)
  - status (pending, submitted, drawn, unsuccessful)

HuntResearch:
  - state, unit_id, species
  - editorial_content (proprietary)
  - difficulty_rating, access_rating
  - recommended_outfitters

DrawData:
  - state, species, unit
  - historical_odds
  - point_requirements

Forum:
  - thread_id, user_id
  - title, body, replies[]
```

**Geospatial Strategy:** Minimal. Huntin' Fool is not a mapping app. Any maps are likely embedded Google Maps or static images.

**UGC Model:** Primarily forum posts and application data. Limited media storage.

**Derived Data:** Hunt recommendations and difficulty ratings — core proprietary value. Likely editorial (human-created), not algorithmically derived.

**Confidence: Medium**

---

### MeatEater — Inferred Data Architecture

**Observed Product Features:**
- Editorial content (articles, videos, podcasts)
- E-commerce (gear, clothing, food)
- Streaming TV (episodes.themeateater.com)
- Community features (comments, Back 40)
- Newsletter/email marketing
- Multiple properties (store, episodes, help)

**Inferred Data Model (Medium Confidence):**

```
Users:
  - user_id (likely Shopify customer + separate editorial account)
  - email, name, demographics
  - purchase_history
  - subscription_tier (if applicable)

Products: (Shopify)
  - product_id, sku
  - price, inventory
  - categories, tags

Content: (CMS — likely headless)
  - article_id, type (article, video, podcast, recipe)
  - title, body, media
  - author, published_date
  - tags, categories

Episodes: (separate platform)
  - episode_id, season
  - video_url, metadata
  - subscription_required?

Comments:
  - comment_id, user_id, content_id
  - body, created_at
  - moderation_status
```

**Geospatial Strategy:** Not applicable. MeatEater is content/commerce, not mapping.

**UGC Model:** Comments, reviews, and community posts. Standard CMS pattern.

**Derived Data:** Likely product recommendations based on purchase history. Email segmentation based on engagement.

**Confidence: Medium**

---

### Spartan Forge — Inferred Data Architecture

**Observed Product Features:**
- AI-powered deer movement prediction
- Weather forecasting integration
- Trail/route tracking
- Scouting log with photos
- Map layers with terrain data
- Wind/pressure visualizations

**Inferred Data Model (Medium Confidence):**

```
Users:
  - user_id
  - auth credentials
  - subscription_tier
  - location_preferences (state, region)

Tracks:
  - track_id, user_id
  - points[] (lat/lng/elevation/timestamp)
  - activity_type (scout, hunt)

ScoutingLogs:
  - log_id, user_id
  - location (lat/lng)
  - notes, photos[]
  - date, conditions

Predictions (AI-derived):
  - region, date, time_window
  - species (whitetail primary)
  - movement_probability
  - confidence_score
  - input_features (weather, pressure, moon, wind)

Weather:
  - location, timestamp
  - temperature, pressure, wind, humidity
  - forecast_hours[]
```

**Geospatial Strategy (Medium Confidence):**
- Base map likely Mapbox or similar
- Prediction overlay as GeoJSON or raster heat map
- Offline capability likely limited compared to onX
- Weather data from commercial API (OpenWeatherMap, Tomorrow.io)

**UGC Model:** Track recording and scouting logs. Local-first with cloud sync. Photo storage in S3 or equivalent.

**AI/ML Pipeline (Low-Medium Confidence):**
- Likely cloud-based ML model (AWS SageMaker, GCP Vertex)
- Training data: historical weather, deer observation data, harvest records
- Inference: batch-precomputed predictions by region/date
- Model updates: likely seasonal or annual retraining

**Confidence: Medium**

---

## 3. Comparative Architecture Matrix

| Dimension | GoHunt | onX Hunt | Huntin' Fool | MeatEater | Spartan Forge | HuntStand |
|-----------|--------|----------|--------------|-----------|---------------|-----------|
| **Subscription tier complexity** | 2 tiers (Free, Insider) | 3+ tiers (Free, Premium, Elite) + state add-ons | Membership durations (1yr, 2yr, 3yr) | E-commerce + possible streaming sub | 2-3 tiers | 2 tiers (Free, Pro) |
| **Offline map support** | No (web-primary) | **Yes — state packages** | No | No | Limited | **Yes** |
| **Vector vs raster (likely)** | N/A | **Vector tiles** | N/A | N/A | Raster overlays | Vector likely |
| **UGC sync model** | Server-only | **Hybrid (local + cloud sync)** | Server-only | Server-only | Hybrid likely | Hybrid likely |
| **Export capability** | CCPA only | Mentioned, no mechanism | None | CCPA only | None | Not verified |
| **Derived analytics** | **Draw odds (core)** | Harvest stats, weather | Hunt recommendations (editorial) | Product recs | **AI deer movement (core)** | Land management tools |
| **Regional data segmentation** | By state/species/unit | **By state (offline packages)** | By state | By content category | By region/county | By state |
| **Folder/shared access** | No | **Yes — shared folders** | Forum threads | Comments | Basic sharing | Hunt areas |
| **Add-on monetization** | No | **State layers, chip packs** | No | E-commerce items | No | Pro features |

---

## 4. Recommended Data Architecture for Our D2C Platform

### A. Identity & Entitlements

```
Recommended Schema:

users:
  id: UUID (primary)
  email: string (unique, indexed)
  password_hash: bcrypt
  mfa_secret: encrypted (nullable)
  created_at, updated_at: timestamp

profiles:
  user_id: FK -> users
  display_name, avatar_url
  home_state, preferred_species[]

subscriptions:
  id: UUID
  user_id: FK -> users
  plan_id: FK -> plans
  status: enum (active, trial, past_due, canceled, expired)
  stripe_subscription_id: string
  current_period_start, current_period_end: timestamp
  entitled_states: string[] (for state-gated content)

plans:
  id: UUID
  name: string (free, pro, elite)
  features: jsonb (feature flag map)
  price_monthly, price_annual: decimal
```

**Entitlement abstraction layer:** Use a feature flag system (LaunchDarkly or custom) where subscription tier resolves to a set of feature flags. This allows:
- Easy A/B testing of feature gating
- State-based entitlements as flags
- Clean upgrade/downgrade without schema changes

### B. Geospatial Layer

**Tile architecture:**
- Vector tiles (MVT/Protobuf) for interactive map layers
- Tileserver-gl or Martin for serving
- PMTiles for offline storage on mobile
- Source tiles from public data, render with Mapbox GL JS / MapLibre

**Spatial database:**
- PostgreSQL + PostGIS for all spatial queries
- Separate schemas for: public_land, parcels, hunt_units, user_waypoints
- Indexed with GIST for spatial queries

**Offline strategy:**
- Pre-packaged state tile bundles (PMTiles format)
- Downloadable from CDN
- Versioned with checksum for incremental updates
- SQLite on mobile for local waypoint/track storage

**Dataset versioning:**
- Version tracking per data source (BLM last updated, county assessor refresh date)
- ETL pipeline that ingests updates, reprocesses tiles, publishes new versions
- Users get update notifications for downloaded offline packages

### C. UGC Layer

```
waypoints:
  id: UUID
  user_id: FK -> users
  lat: decimal(10,7)
  lng: decimal(10,7)
  elevation: decimal (nullable)
  name: string
  description: text (nullable)
  icon: string
  color: string
  folder_id: FK -> folders (nullable)
  source: enum (manual, imported_gpx, imported_kml)
  source_metadata: jsonb (provenance info)
  created_at, updated_at: timestamp
  sync_version: bigint (monotonic counter)
  deleted_at: timestamp (soft delete)

tracks:
  id: UUID
  user_id: FK -> users
  name: string
  points: jsonb (array of {lat, lng, elevation, timestamp})
  distance_meters: decimal
  duration_seconds: integer
  source: enum (recorded, imported)
  sync_version: bigint

photos:
  id: UUID
  waypoint_id: FK -> waypoints (nullable)
  track_id: FK -> tracks (nullable)
  user_id: FK -> users
  s3_key: string
  thumbnail_key: string
  lat, lng: decimal (nullable)
  taken_at: timestamp

folders:
  id: UUID
  user_id: FK -> users
  name: string
  sharing: enum (private, link, specific_users)
  shared_with: UUID[] (user_ids)
```

**Sync model:** Local-first with CRDT-like conflict resolution:
- Each mutation increments sync_version
- Mobile SQLite stores local copy
- Background sync pushes changes on connectivity
- Server resolves conflicts by last-write-wins on sync_version
- Soft deletes propagate across devices

**Media storage:**
- S3 with CloudFront CDN
- Thumbnails generated on upload (Lambda/Cloud Function)
- Signed URLs for access (no public bucket)
- Separate bucket for user media vs system assets

### D. Derived Data Layer

```
draw_odds:
  state, species, unit, weapon_type: composite key
  year: integer
  applicants, tags_available: integer
  calculated_odds: decimal
  point_threshold: integer
  trend: enum (improving, stable, declining)
  computed_at: timestamp

unit_profiles:
  state, unit_id: composite key
  species_available: string[]
  access_rating, difficulty_rating: decimal
  harvest_stats: jsonb
  season_dates: jsonb
  last_updated: timestamp

aggregated_insights:
  region, species: composite key
  metric_type: string
  value: jsonb
  sample_size: integer
  computed_at: timestamp
```

**Strategy:**
- **Precompute and cache** draw odds, unit profiles, and aggregate statistics
- Run batch jobs on state draw data release schedule (annual per state)
- Cache in PostgreSQL + Redis for fast access
- Segment by state for efficient queries
- No real-time computation needed for statistical data

### E. Data Governance

**Separation of data types:**
- `source` field on all UGC distinguishes: manual entry, imported (GPX/KML), and first-party recorded
- Imported data tagged with `source_metadata` (original format, import date, any provenance info)
- Government data tagged with source agency, retrieval date, and license terms
- Licensed data in separate schema with access audit logging

**Logging:**
- All data mutations logged with user_id, timestamp, action, old/new values
- Location data access logged separately (audit trail)
- Retention: logs retained for compliance period (consult counsel), then archived

**Migration planning:**
- Schema migrations versioned with tool like Prisma or Drizzle
- All migrations reversible
- Data backfills logged as system-initiated mutations
- Zero-downtime migration strategy for geospatial data updates

---

## 5. Strategic Architecture Positioning

### 3 Architecture Choices That Create Real Differentiation

1. **Self-service data export (GPX/KML/CSV/JSON)** — No competitor does this well. Being the "open" platform where your data is always yours creates powerful trust marketing and reduces switching cost perception.

2. **Local-first mobile with seamless sync** — Users in backcountry need offline reliability. Building a true local-first architecture (not just cached content) with CRDT-style sync makes the app feel native and reliable.

3. **Field-level encryption for location data** — Encrypting sensitive location data (waypoints, tracks) with user-scoped keys means even a database breach doesn't expose users' secret hunting spots. Powerful trust differentiator with minimal performance cost.

### 3 Areas Where Parity Is Sufficient

1. **Base map rendering** — Use Mapbox GL or MapLibre with standard tile sources. Don't try to out-map onX on day one. Parity is fine.

2. **Payment processing** — Stripe handles this. Don't innovate here. Standard subscription billing with Stripe is table stakes.

3. **Content delivery** — Standard CDN (CloudFront, Cloudflare) for static assets, images, and tile serving. No need to build proprietary CDN infrastructure.

### 3 Areas Where Simplicity Beats Feature Replication

1. **Subscription tiers** — Start with 2 tiers (free + pro) rather than replicating onX's complex state-by-state add-on model. Simpler to build, simpler to market, simpler to support.

2. **Social features** — Don't build a social network. Simple folder sharing and link-based sharing covers 90% of use cases without the moderation, feed, and notification complexity.

3. **AI predictions** — Don't try to replicate Spartan Forge's deer movement AI on day one. Start with simpler derived data (draw odds from public data, weather overlay) and add ML features when you have sufficient first-party data to train on.

---

# APPENDIX

## A. Discovered Competitors

| Competitor | Category | URL | Relevance | Market Position |
|------------|----------|-----|-----------|-----------------|
| **HuntStand** | Mapping + Land Mgmt | huntstand.com | Direct competitor — mapping, GPS, land management | Major player |
| **BaseMap** | Mapping + GPS | basemap.com | Direct competitor — land ownership maps, GPS | Mid-tier |
| **Spartan Forge** | AI Hunt Prediction | spartanforge.ai | Unique AI angle — deer movement prediction | Niche (growing) |
| **HuntWise** | Mapping + Weather | huntwise.com | Hunting maps, weather-based prediction, social | Mid-tier |
| **Gaia GPS** | General Outdoor GPS | gaiagps.com | Not hunting-specific but widely used by hunters | Major (adjacent) |
| **CalTopo** | Mapping/Planning | caltopo.com | Used by hunters for custom map layers, route planning | Niche |
| **iSportsman** | Access/Permit | isportsman.net | Military base and managed land access/permits | Niche |

## B. Ambiguous Clauses — Interpretive Risk

| Competitor | Clause | Interpretation | Confidence |
|------------|--------|---------------|------------|
| onX | "Substantially similar features" prohibition | Likely overbroad and difficult to enforce for standard mapping features. However, signals litigation willingness. | Medium |
| GoHunt | "Unlimited right" to user content | Scope of "unlimited" is ambiguous — does it include sublicensing to AI training companies? | Low |
| Huntin' Fool | SSN collection without stated security | No stated encryption or tokenization for SSN. Major compliance risk for them. | High (that it's a risk for them) |
| MeatEater | "Transferable" content license | Unusual — means MeatEater could license user-submitted content to third parties. | Medium |
| HuntStand | "Share or sell non-personal information" | Definition of "non-personal" is key — aggregated location patterns may be de-identifiable but still sensitive. | Medium |
| Spartan Forge | AI model trained on user location data | No disclosure of whether user scouting data feeds back into prediction models. | Low (unclear from available docs) |

---

---

# PART 4: COMPETITIVE PRICING & FAIR MARKET VALUE INTELLIGENCE

---

## 1. Executive Pricing Summary

### Current Market Annual Pricing Range
- **Low end:** $29.99/year (BaseMap standard; HuntStand Pro promo at $17.99 first year)
- **Median:** $79.99–$99.99/year (Spartan Forge, onX Elite, BaseMap Pro Ultimate)
- **High end:** $499.99/year (GoHunt Insider+)
- **Outlier high:** $150/year (Huntin' Fool membership — research/advisory, not mapping)

### Clear Pricing Leader: **onX Hunt**
Best-known brand with most logical tier structure. $34.99 single-state to $99.99 all-states creates clean upgrade path. Dominates mindshare.

### Most Overpriced (Value-Adjusted): **GoHunt Insider+ ($499.99/yr)**
Application service and e-scouting consultations justify premium, but 5x the next-highest mapping competitor is a steep barrier. Value depends heavily on whether user draws tags through the service.

### Most Underpriced: **BaseMap ($29.99–$39.99/yr for all 50 states)**
All-state access with offline maps and parcel data at a fraction of onX's price. Aggressive value play.

### Recommended Pricing Band for Us: **$49.99–$119.99/year**

---

## 2. Competitor Pricing Briefs

### GoHunt

**Tier Structure:**
| Tier | Annual Price | Monthly Equiv. | Key Features |
|------|-------------|----------------|--------------|
| Free | $0 | $0 | Basic draw odds, limited filtering |
| Insider | $169.99/yr | ~$14/mo | 3D maps, full draw odds, Filtering 2.0, offline maps, unit profiles |
| Insider+ | $499.99/yr | ~$42/mo | All Insider + application service + 1-on-1 e-scouting |

**Value Density Assessment:** High value in Insider tier for serious western hunters (draw odds + research + maps). Insider+ is high-touch consulting model. Price ceiling is aggressive.

**Positioning:** Premium data-driven + high-ticket advisory service.

**Confidence: High**

### onX Hunt

**Tier Structure:**
| Tier | Annual Price | Monthly Option | Key Features |
|------|-------------|----------------|--------------|
| Free | $0 | $0 | Basic maps, limited functionality |
| Premium (1 state) | $34.99/yr | — | Basemaps, property lines, landowner info, GPS tools, wind/weather, offline maps, map layers |
| Premium (2 states) | $49.99/yr | — | Same as Premium, 2 states |
| Elite | $99.99/yr | $14.99/mo | All 50 states + elite map tools + pro deals + application research |

**Free trial:** 7 days

**Value Density Assessment:** Highest value density in Elite tier — $99.99 for all 50 states with premium tools. State-based pricing creates natural upsell from $34.99 to $99.99.

**Positioning:** Hybrid utility (mapping) + data-driven. State-gating creates expansion revenue.

**Confidence: High**

### Huntin' Fool

**Tier Structure:**
| Tier | Annual Price | Key Features |
|------|-------------|--------------|
| Membership | $150/yr | Unlimited 1-on-1 draw consultations, draw odds tools, harvest stats, previous tag holder database, monthly magazine, exclusive content |
| Multi-year | Various (1yr, 2yr, 3yr) | Same features, volume discount |

**Value Density Assessment:** High-touch human advisory model. $150 for unlimited consultations is strong value for dedicated western big game hunters. Not a technology product — more like a research membership.

**Positioning:** High-ticket insider access / community-driven.

**Confidence: Medium-High**

### MeatEater

**Tier Structure:**
| Tier | Annual Price | Key Features |
|------|-------------|--------------|
| Free content | $0 | Articles, podcasts, some video |
| MeatEater TV | Unknown (streaming sub) | Full episode library |
| E-commerce | Varies | Gear, clothing, food products |

**Value Density Assessment:** MeatEater monetizes through content + commerce rather than pure SaaS subscriptions. Revenue is merchandise-driven with content as customer acquisition.

**Positioning:** Community/content-driven + e-commerce hybrid.

**Confidence: Medium**

### Spartan Forge

**Tier Structure:**
| Tier | Annual Price | Monthly | Key Features |
|------|-------------|---------|--------------|
| Free | $0 | $0 | Default maps, weather, basic property, pin management |
| Pro | $79.99/yr | $12.99/mo | All states, private/public land, AI deer prediction, CyberScout AI, satellite imagery, Blue Force Tracker, offline maps |

**Annual discount:** 51% savings vs monthly

**Value Density Assessment:** Strong value at $79.99 for AI-powered features + full mapping. All-states-included simplifies decision.

**Positioning:** Premium data-driven (AI differentiated).

**Confidence: High**

### HuntStand

**Tier Structure:**
| Tier | Annual Price | Key Features |
|------|-------------|--------------|
| Free | $0 | Basic mapping, weather, limited tools |
| Pro | $29.99/yr (promo: $17.99 first year) | All states, offline maps, property boundaries, Pro Whitetail features, land management tools |

**Value Density Assessment:** Aggressive pricing — cheapest all-states mapping option at regular price. First-year promo undercuts even BaseMap.

**Positioning:** Volume-based (low price, broad user base). Owned by GSM Outdoors (gear company) — app likely drives gear sales.

**Confidence: Medium-High**

### BaseMap

**Tier Structure:**
| Tier | Annual Price | Key Features |
|------|-------------|--------------|
| Standard | $29.99/yr | All 50 states, mapping, offline maps, property boundaries |
| Pro | $39.99/yr | Standard + enhanced features |
| Pro Advantage | $69.99/yr | Pro + Global Rescue subscription |
| Pro Ultimate | $99.99/yr | Pro + Hunt Planner tools (unit filtering, draw odds, harvest data, season dates) |

**Value Density Assessment:** Most granular tier structure in the mapping space. Pro Ultimate at $99.99 bundles mapping + research tools (competing directly with GoHunt + onX combined).

**Positioning:** Volume-based with premium upsell path.

**Confidence: Medium-High**

### HuntWise

**Tier Structure:**
| Tier | Annual Price | Key Features |
|------|-------------|--------------|
| Free trial | $0 | Trial period |
| Pro | $59.99/yr | Maps, weather, community features |
| Elite | $119.99/yr | Pro + advanced mapping, analytics, premium features |

**Value Density Assessment:** Mid-market pricing. Elite tier competes with onX Elite but at 20% premium.

**Positioning:** Hybrid utility + community.

**Confidence: Medium**

---

## 3. Comparative Pricing Matrix

| Dimension | GoHunt | onX Hunt | Huntin' Fool | Spartan Forge | HuntStand | BaseMap | HuntWise |
|-----------|--------|----------|--------------|---------------|-----------|---------|----------|
| **Lowest annual tier** | $169.99 | $34.99 | $150 | $79.99 | $29.99 ($17.99 promo) | $29.99 | $59.99 |
| **Highest annual tier** | $499.99 | $99.99 | $150 | $79.99 | $29.99 | $99.99 | $119.99 |
| **Offline maps included** | Yes (Insider) | Yes (all paid) | No | Yes (Pro) | Yes (Pro) | Yes (all paid) | Unknown |
| **Parcel ownership** | Limited | Yes (core feature) | No | Yes (Pro) | Yes (Pro) | Yes (all paid) | Yes |
| **Draw odds included** | Yes (core feature) | Yes (Elite) | Yes (core feature) | No | No | Yes (Pro Ultimate) | No |
| **Multi-state pricing** | All states included | State-based ($34.99/state, $99.99 all) | All states | All states | All states | All states | All states |
| **Add-ons available** | No | State layers, chip packs | No | No | No | Global Rescue bundle | No |
| **Free tier** | Yes (limited) | Yes (limited) | No | Yes (basic) | Yes (basic) | No clear free tier | Free trial |
| **Trial length** | None stated | 7 days | None | None stated | None stated | None stated | Free trial |
| **App store parity** | Likely | Likely | N/A | Likely | Likely | Likely | Likely |

---

## 4. Price Per Value Analysis

### Effective Annual Cost for "Full Access" (All Features, All States)

| Competitor | Full Access Price | Includes Mapping | Includes Draw Data | Includes AI/Prediction | Includes Advisory |
|------------|-------------------|------------------|--------------------|----------------------|-------------------|
| onX Elite | $99.99 | Yes (best in class) | Yes (basic) | No | No |
| BaseMap Pro Ultimate | $99.99 | Yes | Yes | No | No |
| Spartan Forge Pro | $79.99 | Yes | No | Yes (AI deer movement) | No |
| GoHunt Insider | $169.99 | Yes | Yes (best in class) | No | No |
| GoHunt Insider+ | $499.99 | Yes | Yes | No | Yes (1-on-1) |
| Huntin' Fool | $150.00 | No | Yes | No | Yes (unlimited) |
| HuntWise Elite | $119.99 | Yes | No | Weather-based | No |
| HuntStand Pro | $29.99 | Yes | No | No | No |

### Most Aggressive Value: **HuntStand Pro ($29.99/yr)**
All-state mapping with offline and property data. Loss leader pricing backed by GSM Outdoors gear sales.

### Most Defensible Premium: **GoHunt Insider ($169.99/yr)**
Draw odds data is genuinely proprietary and hard to replicate. Research depth justifies premium over pure mapping tools.

### Most Confusing Pricing: **BaseMap**
Four tiers with non-obvious differentiation between Pro, Pro Advantage, and Pro Ultimate. Global Rescue bundle is unusual.

---

## 5. Fair Market Value Recommendation

### Step 1: Competitive Price Range

| Metric | Value |
|--------|-------|
| Low-end annual | $29.99 (mapping only) |
| Median annual | $89.99 (full-feature mapping + some research) |
| High-end annual | $169.99 (mapping + deep research) |
| Outlier high | $499.99 (mapping + research + advisory) |

### Step 2: Feature Density Index

| Competitor | Mapping Depth | Data Sophistication | Analytics Tools | Offline Robustness | UGC Capability | Sub Flexibility | **Total /60** |
|------------|--------------|--------------------|-----------------|--------------------|----------------|-----------------|---------------|
| onX Hunt | 10 | 7 | 5 | 10 | 8 | 7 | **47** |
| GoHunt | 6 | 10 | 8 | 6 | 4 | 4 | **38** |
| BaseMap | 7 | 6 | 5 | 8 | 6 | 8 | **40** |
| Spartan Forge | 6 | 7 | 9 (AI) | 7 | 5 | 5 | **39** |
| HuntStand | 7 | 5 | 4 | 7 | 7 | 3 | **33** |
| HuntWise | 6 | 5 | 6 | 5 | 6 | 5 | **33** |
| Huntin' Fool | 1 | 8 | 6 | 1 | 2 | 4 | **22** |

**Our planned offering positioning:** Mapping + draw data + planning tools = estimated score of **42–45** at launch, competing in the onX/BaseMap/GoHunt tier.

### Step 3: Value Positioning Recommendation

**Recommended Tier Structure:**

| Tier | Name | Annual Price | Monthly Price | Core Features |
|------|------|-------------|---------------|---------------|
| Free | Explorer | $0 | $0 | Basic species info, limited state data, draw odds for 1 species, no maps |
| Tier 1 | **Pro** | $79.99/yr | $9.99/mo | All states, full draw odds, species data, planning wizard, basic maps, offline access |
| Tier 2 | **Elite** | $129.99/yr | $14.99/mo | All Pro + premium mapping layers, property boundaries, advanced analytics, export tools, priority support |

**Rationale:**
- **Free tier** converts browsers to registered users (email capture, usage data). Limited enough to drive upgrades but useful enough to demonstrate value.
- **Pro at $79.99** undercuts GoHunt Insider ($169.99) by 53% while delivering comparable draw data + superior UX. Matches Spartan Forge pricing. Positions us as the "smart value" option.
- **Elite at $129.99** competes with onX Elite ($99.99) at a 30% premium but bundles draw data that onX charges for separately. Positions as "one app replaces two subscriptions."
- **Monthly options** at $9.99/$14.99 capture commitment-averse users with ~33% premium over annual.

**Introductory pricing recommendation:**
- Launch: $59.99/yr Pro, $99.99/yr Elite (25% off for founding members)
- First-year discount creates switching incentive from competitors
- Lock founding member price for first renewal to reduce churn

**Multi-state pricing logic:** All states included at all paid tiers. Do NOT replicate onX's per-state model — it creates friction and the all-states approach is the industry trend (Spartan Forge, BaseMap, HuntStand all include all states).

**Add-on strategy (future):**
- Premium offline tile packs ($4.99/state/year) for high-resolution imagery
- Advanced analytics module ($29.99/yr add-on) for predictive features
- Application tracker ($19.99/yr add-on) for multi-state draw management

---

## 6. Pricing Scenario Modeling

### Scenario 1: Undercut market leader (onX) by 20%

| Metric | Assessment |
|--------|-----------|
| Our price | $79.99/yr (Elite equivalent) vs onX's $99.99 |
| Revenue potential | High volume if paired with comparable features |
| Perceived value | Risk of "cheap = inferior" perception in mapping |
| Brand positioning | Value challenger |
| Risk | **Medium** — must deliver comparable mapping quality or discount looks desperate |

### Scenario 2: Match leader but add superior UGC tools

| Metric | Assessment |
|--------|-----------|
| Our price | $99.99/yr matching onX Elite |
| Revenue potential | Moderate — same price means conversion depends on feature differentiation |
| Perceived value | Strong if UGC tools (export, sharing, import) are genuinely superior |
| Brand positioning | Feature-forward competitor |
| Risk | **Low-Medium** — proven price point with added value |

### Scenario 3: Aggressive first-year discount

| Metric | Assessment |
|--------|-----------|
| Our price | $49.99 first year, $99.99 renewal |
| Revenue potential | High acquisition, depends on Year 2 retention |
| Perceived value | "Try it cheap" psychology works well in SaaS |
| Brand positioning | Growth-mode startup |
| Risk | **Medium** — Year 2 price shock causes churn if not managed well. Lock first-year users into multi-year at discount. |

### Scenario 4: Lifetime access tier

| Metric | Assessment |
|--------|-----------|
| Our price | $399.99 lifetime |
| Revenue potential | Front-loaded cash but caps LTV |
| Perceived value | Very high — hunters value "pay once" for tools |
| Brand positioning | Confidence signal ("we'll be around") |
| Risk | **Medium-High** — attractive but limits recurring revenue. Consider as limited-time founding member offer only. |

### Scenario 5: State-based micro-subscriptions

| Metric | Assessment |
|--------|-----------|
| Our price | $9.99/state/year |
| Revenue potential | Lower ARPU unless users buy 3+ states |
| Perceived value | Mixed — onX proved the model but also proved users upgrade to all-states |
| Brand positioning | Flexible but complex |
| Risk | **Medium** — industry is trending AWAY from per-state. Go all-states. |

### Scenario 6: Bundle with gear discounts or partner perks

| Metric | Assessment |
|--------|-----------|
| Our price | $99.99/yr + gear partner discounts |
| Revenue potential | Moderate direct revenue + affiliate revenue |
| Perceived value | High — hunters love gear deals |
| Brand positioning | Community platform |
| Risk | **Low** — partner deals are low-cost value adds. onX Elite already does this with "Pro Deals." |

### Scenario 7: Premium analytics as separate add-on

| Metric | Assessment |
|--------|-----------|
| Our price | $79.99 base + $29.99 analytics add-on |
| Revenue potential | Good — captures value from power users without pricing out casual hunters |
| Perceived value | Moderate — some users resent paywalled analytics |
| Brand positioning | Modular / customizable |
| Risk | **Low-Medium** — works if base product is strong standalone. Avoids Spartan Forge's all-or-nothing model. |

---

## 7. Long-Term Pricing Scalability Plan

**Year 1 (Launch):** Two tiers + free. Focus on user acquisition with founding member pricing.

**Year 2:** Introduce add-ons (premium offline packs, application tracker). Begin testing annual price optimization.

**Year 3:** Evaluate adding advisory/concierge tier ($249–$399/yr) with human-assisted hunt planning. This addresses the GoHunt Insider+ / Huntin' Fool market without requiring it at launch.

**Year 4+:** Consider enterprise/guide pricing for outfitters and guide services. B2B revenue stream at $499–$999/yr per business account with multi-user features.

---

*This report was produced through analysis of publicly available legal documents, pricing pages, app store listings, and web-accessible information only. It constitutes policy intelligence analysis, not legal advice. All recommendations should be reviewed by qualified legal counsel and financial advisors before implementation.*
