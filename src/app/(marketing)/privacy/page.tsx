import type { Metadata } from "next";
import { Shield } from "lucide-react";

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

      <div className="prose-custom space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you create an account or use Odyssey Outdoors, we may collect
            information you provide directly, including your name, email address,
            and hunting preferences (species, states, budget, experience level).
            We also collect usage data such as pages visited, features used, and
            device information to improve the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We use your information to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Generate personalized hunt strategies, state rankings, and roadmaps
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Provide unit recommendations and cost projections
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Send application deadline reminders and draw result notifications (if opted in)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Improve platform features, fix bugs, and analyze usage patterns
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Communicate product updates and respond to support requests
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Data Storage & Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is stored securely using industry-standard encryption in
            transit and at rest. We use Supabase for authentication and database
            services. We do not store passwords directly &mdash; authentication
            is handled through secure third-party providers. We retain your data
            for as long as your account is active or as needed to provide services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Information Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell, rent, or trade your personal information. We may
            share anonymized, aggregated data for analytics purposes. We may
            disclose information if required by law or to protect our rights,
            safety, or property.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Cookies & Tracking</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use essential cookies to maintain your session and preferences.
            We may use analytics tools to understand how the platform is used.
            You can disable cookies through your browser settings, though some
            features may not function properly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You have the right to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Access, update, or delete your personal information
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Export your data in a portable format
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Opt out of marketing communications at any time
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1 shrink-0">&bull;</span>
              Request deletion of your account and associated data
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Third-Party Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Odyssey Outdoors may contain links to external state fish and game
            agency websites. We are not responsible for the privacy practices of
            these third-party sites. We encourage you to review their privacy
            policies independently.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Children&apos;s Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Odyssey Outdoors is not directed at individuals under the age of 13.
            We do not knowingly collect personal information from children. If we
            become aware that we have collected data from a child under 13, we
            will take steps to delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by posting the updated policy on this page
            with a revised &ldquo;Last updated&rdquo; date. Your continued use of the
            platform constitutes acceptance of any changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy or your data, contact
            us at{" "}
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
