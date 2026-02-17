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
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using Odyssey Outdoors (&ldquo;the Platform&rdquo;), you
            agree to be bound by these Terms of Service. If you do not agree to
            these terms, you may not use the Platform. We reserve the right to
            update these terms at any time, and your continued use constitutes
            acceptance of any modifications.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Odyssey Outdoors is a strategic planning tool for western big game
            hunters. The Platform provides state scoring, personalized roadmaps,
            unit recommendations, cost projections, and investment calculators to
            help hunters plan multi-year application strategies across western
            states.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. User Accounts</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may use the Platform as a guest or create an account. When
            creating an account, you agree to provide accurate information and
            maintain the security of your credentials. You are responsible for
            all activity that occurs under your account. Notify us immediately if
            you suspect unauthorized access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Acceptable Use</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You agree not to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Use the Platform for any unlawful purpose or in violation of hunting regulations
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Attempt to reverse-engineer, scrape, or copy the scoring algorithms or data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Interfere with or disrupt the Platform or its servers
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Create multiple accounts to circumvent limitations or abuse features
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Redistribute, resell, or publicly share generated roadmaps for commercial purposes
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Disclaimer of Guarantees</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Odyssey Outdoors provides strategic recommendations based on publicly
            available data, historical draw statistics, and user-provided inputs.
            We do not guarantee that you will draw a tag, receive a specific
            hunt, or achieve any particular outcome. Draw systems are controlled
            entirely by state fish and game agencies, and results are subject to
            factors outside our control. All recommendations are informational
            and should not be considered professional hunting advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Data Accuracy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            While we strive to maintain accurate and up-to-date information
            regarding point costs, application deadlines, draw odds, and unit
            statistics, we cannot guarantee the accuracy of all data at all
            times. State regulations change frequently. Always verify critical
            information (deadlines, fees, regulations) directly with the
            relevant state fish and game agency before applying.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Intellectual Property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All content, features, and functionality of the Platform &mdash;
            including design, code, scoring algorithms, and branding &mdash; are
            the property of Odyssey Outdoors and are protected by copyright and
            trademark laws. Your personalized roadmaps and strategy outputs are
            generated for your personal use and may not be commercially
            redistributed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Paid Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Certain features may require a paid subscription. Pricing, features,
            and billing terms will be clearly presented before purchase.
            Subscriptions may be canceled at any time. Refund policies will be
            outlined at the time paid plans become available.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, Odyssey Outdoors and its
            operators shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the
            Platform, including but not limited to lost tags, missed deadlines,
            incorrect fee calculations, or unsuccessful applications.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Termination</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate your account at our
            discretion if you violate these terms. You may delete your account at
            any time. Upon termination, your right to use the Platform ceases
            immediately, and we may delete your data in accordance with our
            Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Governing Law</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the
            laws of the United States. Any disputes arising from these terms or
            your use of the Platform shall be resolved through binding
            arbitration or in the courts of competent jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">12. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions about these Terms of Service, contact us at{" "}
            <a
              href="mailto:support@odysseyoutdoors.com"
              className="text-primary hover:underline"
            >
              support@odysseyoutdoors.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
