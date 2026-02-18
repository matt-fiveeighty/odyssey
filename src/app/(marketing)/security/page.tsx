import type { Metadata } from "next";
import { ShieldCheck, Lock, Eye, Trash2, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Security | Odyssey Outdoors",
  description:
    "How Odyssey Outdoors protects your data. Encryption, privacy, and responsible disclosure.",
};

export default function SecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Security at Odyssey Outdoors
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your hunting data, secured.
          </p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Encryption */}
        <section className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Encryption</h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>All data encrypted at rest (AES-256 via Supabase/AWS RDS)</li>
              <li>All data encrypted in transit (TLS 1.3)</li>
              <li>HSTS enforced with preload</li>
              <li>Row-level security on all database tables</li>
            </ul>
          </div>
        </section>

        {/* Authentication */}
        <section className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Authentication</h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>Optional two-factor authentication (TOTP)</li>
              <li>Strong password requirements (8+ characters with complexity)</li>
              <li>Rate limiting on all authentication endpoints</li>
              <li>Bot protection via Cloudflare Turnstile</li>
              <li>Secure, signed guest session tokens</li>
            </ul>
          </div>
        </section>

        {/* Privacy */}
        <section className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Privacy</h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>No third-party tracking (no Google Analytics, no Facebook Pixel)</li>
              <li>No targeted advertising</li>
              <li>Global Privacy Control (GPC) signals honored</li>
              <li>Do Not Track (DNT) signals honored</li>
              <li>CPRA and PIPEDA compliant</li>
            </ul>
          </div>
        </section>

        {/* Data control */}
        <section className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Your Data, Your Control</h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>Self-service data export (JSON format)</li>
              <li>Self-service account deletion</li>
              <li>30-day data deletion guarantee</li>
              <li>Revocable content license (your data is yours)</li>
              <li>No AI training on your personal data without opt-in consent</li>
            </ul>
          </div>
        </section>

        {/* Responsible Disclosure */}
        <section className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Reporting Vulnerabilities
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              If you discover a security vulnerability, please report it
              responsibly:
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                Email:{" "}
                <a
                  href="mailto:security@odysseyoutdoors.com"
                  className="text-primary hover:underline"
                >
                  security@odysseyoutdoors.com
                </a>
              </li>
              <li>Acknowledgment within 48 hours</li>
              <li>Critical issues resolved within 7 days</li>
              <li>High-severity issues resolved within 30 days</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              We appreciate security researchers who help keep our users safe.
              Please do not access or modify other users&apos; data during
              testing.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
