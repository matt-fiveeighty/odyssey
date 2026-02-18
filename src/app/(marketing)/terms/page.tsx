import type { Metadata } from "next";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Odyssey Outdoors",
  description: "Terms of service for Odyssey Outdoors hunt planning platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last updated: February 2026
          </p>
        </div>
      </div>

      <div className="prose-custom space-y-8">
        {/* 1 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using Odyssey Outdoors (&ldquo;the Platform&rdquo;),
            you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;).
            If you do not agree, you may not use the Platform. We reserve the
            right to update these Terms at any time. We will notify registered
            users of material changes via email. Your continued use after
            changes are posted constitutes acceptance.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Odyssey Outdoors is a strategic planning tool for western big game
            hunters. The Platform provides state scoring, personalized roadmaps,
            draw odds analysis, unit recommendations, cost projections, and
            investment calculators to help hunters plan multi-year application
            strategies across western states.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">3. User Accounts</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may use the Platform as a guest or create an account. When
            creating an account, you agree to provide accurate information and
            maintain the security of your credentials. You are responsible for
            all activity under your account. Notify us immediately if you
            suspect unauthorized access. Guest sessions are temporary (24 hours)
            and do not persist data across sessions.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">4. Acceptable Use</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You agree not to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Use the Platform for any unlawful purpose or in violation of
              hunting regulations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Use any robot, spider, scraper, crawler, data mining tool, or
              other automated means to access, collect, copy, or index any part
              of the Platform, including draw odds data, state information, unit
              profiles, or assessment outputs
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Scrape, harvest, or aggregate data from the Platform for any
              purpose without our express prior written consent
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Access or use the Platform for the purpose of building, training,
              improving, or operating any product or service that competes with
              the Platform
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Resell, redistribute, or sublicense access to the Platform or any
              data, content, or outputs derived from the Platform to any third
              party
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Attempt to reverse-engineer, decompile, or disassemble the
              scoring algorithms, recommendation engines, or any Platform
              software
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Interfere with or disrupt the Platform or its servers
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Create multiple accounts to circumvent limitations or abuse
              features
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Redistribute, resell, or publicly share generated roadmaps for
              commercial purposes
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">5. User Content</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You retain all ownership rights to content you create using the
            Platform, including goals, assessment inputs, and notes (&ldquo;User
            Content&rdquo;). By submitting User Content, you grant us a
            non-exclusive, royalty-free license to use, store, and process your
            User Content solely for the purpose of providing and improving the
            Platform.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            This license terminates when you delete your account, except for
            aggregated, anonymized data that cannot be re-identified.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We will not use your User Content to train machine learning models,
            sell to third parties, or share with advertisers without your
            explicit opt-in consent.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">6. Aggregated Data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may create aggregated, anonymized datasets derived from user
            activity that cannot reasonably be used to identify any individual
            user. We retain ownership of these aggregated datasets and may use
            them for research, product improvement, and statistical reporting.
            These datasets will never include personally identifiable
            information.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">7. Data Export Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have the right to export your User Content at any time through
            the self-service export tool in your account settings. Exported data
            will be provided in machine-readable JSON format. We will process
            export requests within 48 hours.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">8. AI Training Restriction</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not use your personal data, User Content, or assessment
            outputs to train artificial intelligence or machine learning models
            without your explicit opt-in consent. Aggregated, anonymized
            statistical data may be used to improve our recommendation
            algorithms.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">9. Intellectual Property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All draw odds calculations, scoring algorithms, state assessments,
            roadmap outputs, and recommendation engines are proprietary to
            Odyssey Outdoors. You may not reverse engineer, reproduce, or create
            derivative works from our analytical methodologies or outputs. The
            Platform and all associated intellectual property are owned by
            Odyssey Outdoors, LLC. Your personalized outputs are generated for
            your personal use and may not be commercially redistributed.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">10. Disclaimer of Guarantees</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Platform provides informational tools for hunting planning
            purposes only. We do not guarantee any specific draw outcome, tag
            allocation, or hunting success. Draw results are determined solely
            by state wildlife agencies. You are responsible for verifying all
            deadlines, fees, regulations, and application requirements directly
            with the relevant state fish and game department. Our calculations
            are estimates based on publicly available data and may not reflect
            current-year changes.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">11. Data Accuracy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            While we strive to maintain accurate and up-to-date information
            regarding point costs, application deadlines, draw odds, and unit
            statistics, we cannot guarantee the accuracy of all data at all
            times. State regulations change frequently. Always verify critical
            information directly with the relevant state fish and game agency.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">12. Paid Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Certain features require a paid subscription. Pricing, features, and
            billing terms are clearly presented before purchase. Subscriptions
            auto-renew annually unless canceled before the renewal date. We will
            send a reminder email 7 days before renewal. You may cancel at any
            time through your account settings. Refunds are not provided for
            partial subscription periods.
          </p>
        </section>

        {/* 13 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">13. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, Odyssey Outdoors and its
            operators shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the
            Platform, including but not limited to lost tags, missed deadlines,
            incorrect fee calculations, or unsuccessful applications. Our total
            liability shall not exceed the amount you paid for the Platform in
            the 12 months preceding the claim.
          </p>
        </section>

        {/* 14 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">14. Termination</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate your account at our
            discretion if you violate these Terms. You may delete your account
            at any time through your account settings. Upon account deletion, we
            will remove your personal data within 30 days in accordance with our
            Privacy Policy. Upon termination, your right to use the Platform
            ceases immediately.
          </p>
        </section>

        {/* 15 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">15. Governing Law</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with
            the laws of the United States. Any disputes arising from these Terms
            or your use of the Platform shall be resolved through binding
            arbitration or in the courts of competent jurisdiction.
          </p>
        </section>

        {/* 16 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">16. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions about these Terms of Service, contact us at{" "}
            <a
              href="mailto:legal@odysseyoutdoors.com"
              className="text-primary hover:underline"
            >
              legal@odysseyoutdoors.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
