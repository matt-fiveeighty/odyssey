import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Integrity | Odyssey Outdoors",
  description:
    "How Odyssey verifies, versions, and monitors state data — every fee, deadline, and draw system.",
};

export default function DataIntegrityPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Data Integrity
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            How we verify, version, and monitor every data point in your
            strategy.
          </p>
        </div>
      </div>

      <div className="prose-custom space-y-8">
        {/* 1 — Authoritative Data Registry */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            1. Authoritative Data Registry
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                All fee data, deadlines, and draw systems are sourced from
                official state Fish &amp; Game agency websites.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Every state entry carries a <code>sourceUrl</code> linking to
                the authoritative agency page.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Data snapshots are versioned (e.g. &ldquo;2026.1&rdquo;) for
                traceability.
              </span>
            </li>
          </ul>
        </section>

        {/* 2 — Verification Cadence */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            2. Verification Cadence
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                State data is manually verified against official sources before
                each application season.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Every state shows a &ldquo;Last Verified&rdquo; timestamp in the
                app.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Stale data (beyond the application season TTL) is flagged
                automatically.
              </span>
            </li>
          </ul>
        </section>

        {/* 3 — Fee Reconciliation */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            3. Fee Reconciliation
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Fees are itemized line-by-line: qualifying license, application
                fee, point fee, and tag cost.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Resident vs. nonresident fees are resolved by your home state.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                All fee line items support <code>sourceUrl</code> and{" "}
                <code>lastVerified</code> fields for individual audit.
              </span>
            </li>
          </ul>
        </section>

        {/* 4 — Deadline Integrity */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            4. Deadline Integrity
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                All application deadlines include IANA timezone designators (e.g.{" "}
                <code>America/Denver</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Deadline warnings surface 14 days before close with
                urgency-tiered badges.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Draw result dates are tracked per species per state.
              </span>
            </li>
          </ul>
        </section>

        {/* 5 — What We Monitor */}
        <section>
          <h2 className="text-lg font-semibold mb-3">5. What We Monitor</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Data version drift (comparing current vs. ingested snapshot).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Fee discrepancy reports from user feedback.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Deadline accuracy complaints.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Strategy recompute stability.</span>
            </li>
          </ul>
        </section>

        {/* 6 — How to Report an Error */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            6. How to Report an Error
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                If you find incorrect data, email{" "}
                <a
                  href="mailto:support@odysseyoutdoors.com"
                  className="text-primary hover:underline"
                >
                  support@odysseyoutdoors.com
                </a>
                .
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                One wrong fee is a big deal to us &mdash; we treat every report
                as a priority incident.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Corrections are published with a version bump and changelog
                entry.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
