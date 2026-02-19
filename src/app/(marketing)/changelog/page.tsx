import type { Metadata } from "next";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog | Odyssey Outdoors",
  description:
    "Every model update, data change, and engine improvement — documented before release.",
};

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Changelog
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every model update, data correction, and engine change &mdash;
            documented publicly.
          </p>
        </div>
      </div>

      <div className="prose-custom space-y-8">
        {/* v2026.1 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            v2026.1 &mdash; January 2026{" "}
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-2">
              Current
            </span>
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added draw confidence bands (optimistic / expected /
                pessimistic) to state portfolio
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added inflation toggle (3.5% annual compounding) on 10-year cost
                projection
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added draw outcome workflow (drew / didn&apos;t draw) on
                milestones
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Added PTO budget validation warning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Improved strategy variant derivation (per-state cost scaling
                replaces flat multipliers)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Added CSV and JSON export to plan export</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Published /methodology transparency page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Published /data-integrity page</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added <code className="text-xs">sourceUrl</code> and{" "}
                <code className="text-xs">dataVersion</code> to all state
                records
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added deadline urgency warnings (14-day, 7-day, 3-day tiers)
              </span>
            </li>
          </ul>
        </section>

        {/* v2025.2 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            v2025.2 &mdash; November 2025
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Expanded to 11 states (added Kansas)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added <code className="text-xs">lastScrapedAt</code> timestamps
                to all state data
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added DataSourceBadge with real verification dates
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Added premium budget tier ($5,000+ point-year budget)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Raised slider caps to $10,000 (points) and $30,000 (hunts)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Added resident fee schedules for all states</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Added resident point costs per species</span>
            </li>
          </ul>
        </section>

        {/* v2025.1 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            v2025.1 &mdash; September 2025
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Initial release of 10-factor state scoring engine (100-point
                scale)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                10 western states: CO, WY, MT, NV, AZ, UT, NM, OR, ID, AK
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Full 10-year roadmap generation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Bottom-up cost modeling with itemized fee schedules
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Point creep projections with tiered creep rates
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Travel logistics and flight routing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Season calendar with tier recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Milestone tracking with cost itemization</span>
            </li>
          </ul>
        </section>

        {/* Footer note */}
        <section className="border-t border-border pt-6 mt-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            All model changes are logged here before release. During the first
            30 days after a major update, only data corrections are applied
            &mdash; no weighting or ranking logic changes. See our Stability
            Lock policy on the{" "}
            <a
              href="/methodology"
              className="text-primary hover:underline"
            >
              Methodology page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
