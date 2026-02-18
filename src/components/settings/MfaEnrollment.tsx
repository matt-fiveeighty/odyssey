"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";

type MfaStep = "idle" | "enrolling" | "verifying" | "enrolled" | "unenrolling";

export function MfaEnrollment() {
  const [step, setStep] = useState<MfaStep>("idle");
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Check on mount whether MFA is already enrolled.
  // Using .then() to set state from the async result (the lint rule
  // disallows direct setState inside the synchronous effect body).
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }: { data: { totp?: Array<{ id: string; status: string }> } | null }) => {
        if (cancelled) return;
        const totp = data?.totp?.find((f) => f.status === "verified");
        if (totp) {
          setIsEnrolled(true);
          setFactorId(totp.id);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnroll() {
    setError(null);
    setLoading(true);
    setStep("enrolling");

    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Odyssey Outdoors",
    });

    if (error || !data) {
      setError(error?.message ?? "Could not start MFA enrollment.");
      setStep("idle");
      setLoading(false);
      return;
    }

    setQrUri(data.totp.uri);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep("verifying");
    setLoading(false);
  }

  async function handleVerify() {
    if (!factorId || !code) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setLoading(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });

    if (verify.error) {
      setError(verify.error.message);
      setLoading(false);
      return;
    }

    setStep("enrolled");
    setIsEnrolled(true);
    setLoading(false);
  }

  async function handleUnenroll() {
    if (!factorId) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setStep("idle");
    setIsEnrolled(false);
    setFactorId(null);
    setQrUri(null);
    setSecret(null);
    setCode("");
    setLoading(false);
  }

  // Already enrolled — show status + unenroll option
  if (isEnrolled && step !== "verifying") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">
            Two-factor authentication is enabled
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your account is protected with TOTP two-factor authentication.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnenroll}
          disabled={loading}
          className="text-destructive hover:text-destructive"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <XCircle className="w-4 h-4 mr-2" />
          )}
          Disable MFA
        </Button>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // Verifying — show QR + code input
  if (step === "verifying" && qrUri) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan this QR code with your authenticator app (Google Authenticator,
          Authy, 1Password, etc.)
        </p>

        <div className="flex justify-center">
          {/* Render QR using the otpauth URI via a data URL approach */}
          <div className="bg-white p-4 rounded-xl">
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
              alt="MFA QR Code"
              width={200}
              height={200}
              unoptimized
            />
          </div>
        </div>

        {secret && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <code className="text-xs text-muted-foreground flex-1 truncate">
              {secret}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(secret)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Copy secret"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="mfa-code">Verification Code</Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoComplete="one-time-code"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            Verify & Enable
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep("idle");
              setQrUri(null);
              setSecret(null);
              setCode("");
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Idle — show enable button
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add an extra layer of security to your account with a time-based
        one-time password (TOTP) from an authenticator app.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnroll}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <ShieldCheck className="w-4 h-4 mr-2" />
        )}
        Enable Two-Factor Auth
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
