import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { GpcBanner } from "@/components/shared/GpcBanner";

export const metadata: Metadata = {
  title: "Privacy Policy | Odyssey Outdoors",
  description: "Privacy policy for Odyssey Outdoors hunt planning platform.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last updated: February 2026
          </p>
        </div>
      </div>

      <GpcBanner />

      <div className="prose-custom space-y-8">
        {/* 1 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            When you create an account or use Odyssey Outdoors, we collect
            information you provide directly:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Account data:</strong> name, email address
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Hunting preferences:</strong> target species, states,
              budget, experience level, hunt style
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Assessment data:</strong> wizard inputs and generated
              roadmaps
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Usage data:</strong> pages visited, features used, and
              device type (collected automatically)
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            We do not collect precise GPS/location data, payment card numbers
            (handled by Stripe), or contact lists.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Generate personalized hunt strategies, state rankings, and
              roadmaps
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Provide unit recommendations and cost projections
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Send application deadline reminders and draw result notifications
              (if opted in)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Improve Platform features and fix bugs
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Communicate product updates and respond to support requests
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            We do not sell your personal information. We do not share your
            personal information for cross-context behavioral advertising.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">3. Data Storage &amp; Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is encrypted at rest (AES-256 via Supabase/AWS RDS) and
            in transit (TLS 1.3). We use Supabase for authentication and
            database services with row-level security policies. We do not store
            passwords directly &mdash; authentication is handled through
            industry-standard hashing. Payment processing is handled entirely by
            Stripe; we never see or store your card number.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">4. Information Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We do not sell, rent, or trade your personal information. We share
            data only with:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Supabase:</strong> database hosting and authentication
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Stripe:</strong> payment processing (paid plan users only)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Sentry:</strong> error tracking (anonymized)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Vercel:</strong> hosting infrastructure
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            We may disclose information if required by law or to protect our
            rights, safety, or property.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">5. Cookies &amp; Tracking</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We use strictly necessary cookies for authentication and session
            management:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Authentication session cookie (Supabase)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Guest session token (if using guest mode)
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            We do not use Google Analytics, Facebook Pixel, or any third-party
            tracking services. We do not serve targeted advertisements. We honor
            Do Not Track (DNT) and Global Privacy Control (GPC) signals.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">6. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You have the right to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Access, update, or correct your personal information
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Export your data in machine-readable JSON format
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Request deletion of your account and associated data (processed
              within 30 days)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Opt out of marketing communications at any time
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            To exercise your rights, use the self-service tools in your account
            settings or email{" "}
            <a
              href="mailto:privacy@odysseyoutdoors.com"
              className="text-primary hover:underline"
            >
              privacy@odysseyoutdoors.com
            </a>
            .
          </p>
        </section>

        {/* 7 — CPRA */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            7. California Privacy Rights (CPRA)
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            If you are a California resident, you have the following rights
            under the California Privacy Rights Act:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Right to Know:</strong> You may request the categories of
              personal information we collect, the purposes of collection, and
              the categories of third parties with whom we share your
              information.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Right to Delete:</strong> You may request deletion of your
              personal information. We will process deletion requests within 30
              days.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Right to Correct:</strong> You may request correction of
              inaccurate personal information through your account settings or
              by contacting us.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Right to Opt-Out:</strong> We do not sell your personal
              information. We do not share your personal information for
              cross-context behavioral advertising.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Right to Limit:</strong> You may limit the use and
              disclosure of sensitive personal information.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Non-Discrimination:</strong> We will not deny you
              services, charge different prices, or provide different quality
              based on your exercise of privacy rights.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            We honor Global Privacy Control (GPC) signals. If your browser sends
            a GPC signal, we will treat it as a valid opt-out request.
          </p>
        </section>

        {/* 8 — PIPEDA */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            8. Canadian Privacy Rights (PIPEDA)
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            If you are a Canadian resident, we comply with the Personal
            Information Protection and Electronic Documents Act (PIPEDA):
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Accountability:</strong> Our privacy officer oversees
              compliance. Contact:{" "}
              <a
                href="mailto:privacy@odysseyoutdoors.com"
                className="text-primary hover:underline"
              >
                privacy@odysseyoutdoors.com
              </a>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Consent:</strong> We collect personal information only
              with your knowledge and consent, provided by creating an account
              and using the Platform.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Purpose Limitation:</strong> We collect information only
              for the purposes described in this policy.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Access:</strong> You may request access to your personal
              information at any time through your account settings or by
              contacting our privacy officer.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Safeguards:</strong> We protect your personal information
              with encryption at rest and in transit, access controls, and
              regular security assessments.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Cross-Border Transfer:</strong> Your data is stored and
              processed in the United States. By using the Platform, you consent
              to the transfer of your data to the United States.
            </li>
          </ul>
        </section>

        {/* 9 — Data retention */}
        <section>
          <h2 className="text-lg font-semibold mb-3">9. Data Retention Schedule</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Account data</strong> (profile, email): Retained while
              account is active. Deleted within 30 days of confirmed account
              deletion.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Assessment data:</strong> Retained while account is
              active. Deleted within 30 days of confirmed account deletion.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Goals and points data:</strong> Retained while account is
              active. Deleted within 30 days of confirmed account deletion.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Audit logs:</strong> Retained for 2 years for security and
              compliance purposes. Anonymized after account deletion.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Payment data:</strong> Managed by Stripe. We do not store
              credit card numbers. Stripe retains transaction records per their
              retention policy.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              <strong>Backup copies:</strong> Database backups may contain
              deleted data for up to 90 days. Backups are encrypted and
              automatically rotated.
            </li>
          </ul>
        </section>

        {/* 10 — Breach */}
        <section>
          <h2 className="text-lg font-semibold mb-3">10. Breach Notification</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In the event of a data breach affecting your personal information,
            we will notify affected users within 72 hours of confirmation. We
            will provide details of the breach, data affected, and remediation
            steps. We will report to applicable regulators as required by law,
            including the Privacy Commissioner of Canada for Canadian users as
            required by PIPEDA.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">11. Third-Party Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Odyssey Outdoors may contain links to external state fish and game
            agency websites. We are not responsible for the privacy practices of
            these third-party sites. We encourage you to review their privacy
            policies independently.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">12. Children&apos;s Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Odyssey Outdoors is not directed at individuals under the age of 13.
            We do not knowingly collect personal information from children. If
            we become aware that we have collected data from a child under 13,
            we will take steps to delete it promptly.
          </p>
        </section>

        {/* 13 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">13. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify
            registered users of material changes via email and by posting the
            updated policy with a revised date. Your continued use of the
            Platform constitutes acceptance of any changes.
          </p>
        </section>

        {/* 14 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">14. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy or your data,
            contact our privacy officer at{" "}
            <a
              href="mailto:privacy@odysseyoutdoors.com"
              className="text-primary hover:underline"
            >
              privacy@odysseyoutdoors.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
