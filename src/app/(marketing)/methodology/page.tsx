import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Methodology | Odyssey Outdoors",
  description:
    "How Odyssey scores states, models costs, and projects timelines — fully transparent.",
};

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Our Methodology
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            How Odyssey builds your strategy &mdash; transparent scoring, honest
            assumptions, and real data.
          </p>
        </div>
      </div>

      <div className="prose-custom space-y-8">
        {/* 1 — State Scoring */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            1. State Scoring (10-Factor Model)
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Every state in your strategy is scored on a 100-point scale across
            ten weighted factors. Higher scores mean a stronger fit for your
            specific profile.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Elevation Compatibility (15 pts)</strong> &mdash; matches
                your physical comfort to state terrain
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Budget Fit (15 pts)</strong> &mdash; how well state costs
                fit your point-year budget
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Point System Match (15 pts)</strong> &mdash; alignment
                between draw system and your goals
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Hunt Frequency Fit (10 pts)</strong> &mdash; how well the
                state supports your desired frequency
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Travel &amp; Location (10 pts)</strong> &mdash; proximity
                and accessibility from your home
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Hunt Style Match (10 pts)</strong> &mdash; terrain and
                access compatibility with your hunt style
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Terrain &amp; Factors (10 pts)</strong> &mdash; preferred
                terrain, pressure, public land match
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Existing Investment (10 pts)</strong> &mdash; rewards
                continuing in states where you have points
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Species Availability (5 pts)</strong> &mdash; how many of
                your target species are available
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Dream Hunt Fit (5 pts)</strong> &mdash; alignment with
                your bucket list description
              </span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Weights are fixed and not user-adjustable in the plan builder. The
            Opportunity Finder provides adjustable weight sliders for its
            separate 4-factor scoring.
          </p>
        </section>

        {/* 2 — Cost Modeling */}
        <section>
          <h2 className="text-lg font-semibold mb-3">2. Cost Modeling</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Costs are built bottom-up: qualifying license + application fee +
                point fee per species.
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
                Tag costs are estimates from published nonresident tag prices
                (hardcoded lookup).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                10-year projections use constant 2026 dollars &mdash; no
                inflation is applied.
              </span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Expect 2&ndash;5% annual increases on state fees. We display this
            disclaimer but do not compound it into projections.
          </p>
        </section>

        {/* 3 — Draw Timeline Projections */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            3. Draw Timeline Projections
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Point accumulation assumes +1 point per year. We model a point creep
            rate (the speed at which the minimum points to draw increases) that
            varies by unit demand:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Trophy units (rating 8+):</strong> +0.7 pts/year
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Mid-tier units (rating 6&ndash;7):</strong> +0.4
                pts/year
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>General units (rating 4&ndash;5):</strong> +0.2 pts/year
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Low-demand units (rating &lt;4):</strong> +0.05 pts/year
              </span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Creep rates are estimates, not derived from historical draw data.
            Projections are deterministic point-vs-creep calculations. They are
            not probabilistic and should be treated as estimates, not guarantees.
          </p>
        </section>

        {/* 4 — Draw Systems Modeled */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            4. Draw Systems Modeled
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We model seven draw systems used across the 11 states in the
            platform:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Preference (CO)</strong> &mdash; tags go to the highest
                point holders first.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Hybrid (WY, OR)</strong> &mdash; a portion of tags go to
                top point holders; the remainder are drawn randomly with bonus
                weighting.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Bonus (AZ)</strong> &mdash; random draw where each
                accumulated point adds one entry.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Bonus Squared (NV)</strong> &mdash; random draw where
                your entries equal your points squared, heavily rewarding
                patience.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Dual (MT, UT)</strong> &mdash; two separate pools, one
                preference-based and one random, applied within a single draw
                cycle.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Random (ID, NM)</strong> &mdash; purely random draw with
                no accumulated preference.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Preference NR (KS)</strong> &mdash; preference draw
                restricted to nonresident applicants.
              </span>
            </li>
          </ul>
        </section>

        {/* 5 — Data Sources */}
        <section>
          <h2 className="text-lg font-semibold mb-3">5. Data Sources</h2>
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
                Data is manually verified and updated for each application
                season.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                State data shows &ldquo;Last Verified&rdquo; dates &mdash; check
                the DataSource badges throughout the app.
              </span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            If you find an error, email us at{" "}
            <a
              href="mailto:support@odysseyoutdoors.com"
              className="text-primary hover:underline"
            >
              support@odysseyoutdoors.com
            </a>
            . One wrong fee is a big deal to us.
          </p>
        </section>

        {/* 6 — What We Don't Model */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            6. What We Don&apos;t Model
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Transparency means being honest about what our engine leaves out:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>No inflation compounding on fee projections.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                No failed-draw refund modeling (some states refund application
                fees on unsuccessful draws).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                No historical draw odds &mdash; point creep is estimated, not
                computed from applicant data.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>No tax considerations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                No gear, food, or lodging costs beyond tag + travel estimates.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                Strategy comparison variants (Aggressive / Conservative) are
                derived via multipliers, not re-scored through the engine.
              </span>
            </li>
          </ul>
        </section>

        {/* 7 — Determinism */}
        <section>
          <h2 className="text-lg font-semibold mb-3">7. Determinism</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Same inputs always produce the same outputs. There is no randomness
            in our engine. Your strategy is reproducible.
          </p>
        </section>

        {/* 8 — Rollback Protocol */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            8. Rollback Protocol
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            If we discover a data or model error after release, we follow a
            defined rollback protocol:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Freeze</strong> &mdash; the current model version is
                locked and no further changes are applied.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Revert</strong> &mdash; the engine is rolled back to the
                last verified-stable data snapshot.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Notify</strong> &mdash; affected users are informed of
                the issue and the corrective action taken.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                <strong>Publish</strong> &mdash; an incident explanation is
                posted to the Changelog with root-cause analysis.
              </span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Rollback triggers include: &gt;3 confirmed financial mismatches in
            48 hours, &gt;5 deadline error reports, unexplained projection
            drift, or any high-priority allocator complaint.
          </p>
        </section>

        {/* 9 — Stability Lock */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            9. Stability Lock (First 30 Days)
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            For the first 30 days after any major model update, we enforce a
            stability lock:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>No scoring weight changes.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>No inflation baseline adjustments.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>No silent ranking logic tweaks.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>Only verified data corrections are permitted.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <span>
                All changes are documented publicly in the{" "}
                <a
                  href="/changelog"
                  className="text-primary hover:underline"
                >
                  Changelog
                </a>
                .
              </span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Allocator trust depends on projection stability. Your strategy
            should not change unless the underlying data changes.
          </p>
        </section>
      </div>
    </div>
  );
}
