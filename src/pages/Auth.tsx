import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { NodeMarkTile } from "@/components/NodeLogo";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, MousePointer2, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

const PANEL_POINTS = [
  { initial: "M", color: "#22d3ee", cls: "left-[18%] top-[24%]" },
  { initial: "S", color: "#fbbf24", cls: "right-[16%] top-[38%]" },
  { initial: "A", color: "#34d399", cls: "left-[26%] bottom-[22%]" },
];

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Legal consent gate: both email and guest sign-in are blocked until the
  // user explicitly agrees to the Terms and Privacy Policy.
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const ensureDisplayName = useMutation(api.profile.ensureDisplayName);

  const requireConsent = () => {
    if (agreed) return true;
    setConsentError(true);
    return false;
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireConsent()) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);

      // First sign-up: derive a friendly display name from the email
      // ("full.bear67@…" → "Full Bear"). No-op if already named or guest.
      try {
        await ensureDisplayName({});
      } catch (nameError) {
        console.error("Display name bootstrap failed:", nameError);
      }

      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    if (!requireConsent()) return;
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Canvas backdrop with drifting collaborator cursors */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px]"
      />
      {PANEL_POINTS.map((p) => (
        <motion.div
          key={p.initial}
          aria-hidden
          className={`pointer-events-none absolute hidden md:block ${p.cls}`}
          animate={{ x: [0, 26, -18, 0], y: [0, -20, 14, 0] }}
          transition={{ repeat: Infinity, duration: 13, ease: "easeInOut" }}
        >
          <MousePointer2 className="size-4" style={{ fill: p.color, color: p.color }} />
          <span
            className="ml-3 -mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-black"
            style={{ background: p.color }}
          >
            {p.initial}
          </span>
        </motion.div>
      ))}

      {/* Brand */}
      <button
        className="relative z-10 mx-auto mt-10 flex items-center gap-2.5"
        onClick={() => navigate("/")}
      >
        <NodeMarkTile className="size-9 rounded-[9px]" />
        <span className="text-base font-bold uppercase tracking-[0.22em]">Node</span>
      </button>

      {/* Auth Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-14">
        {step === "signIn" ? (
          <div className="w-full max-w-sm rounded-xl border border-border bg-[#141419] shadow-2xl shadow-black/60">
            <div className="px-6 pb-6 pt-7 text-center">
              <h1 className="text-lg font-semibold text-white">
                Design together, live
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your email to log in or sign up
              </p>
            </div>
            <form onSubmit={handleEmailSubmit}>
              <div className="px-6">
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="h-11 border-border bg-[#1c1c22] pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-violet-500/50"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="size-11 shrink-0 bg-violet-500 text-white hover:bg-violet-400"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

                {/* Legal consent gate */}
                <label
                  className={cn(
                    "mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                    consentError && !agreed
                      ? "border-red-500/60 bg-red-500/5"
                      : "border-border hover:border-white/25",
                  )}
                >
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => {
                      setAgreed(v === true);
                      if (v === true) setConsentError(false);
                    }}
                    className="mt-0.5 border-white/25 data-[state=checked]:border-violet-500 data-[state=checked]:bg-violet-500"
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      target="_blank"
                      className="font-medium text-violet-400 underline hover:text-violet-300"
                    >
                      Terms &amp; Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      target="_blank"
                      className="font-medium text-violet-400 underline hover:text-violet-300"
                    >
                      Privacy Policy
                    </Link>
                    . You must agree before you can continue.
                  </span>
                </label>
                {consentError && !agreed && (
                  <p className="mt-2 text-xs text-red-400">
                    Please agree to the Terms and Privacy Policy to continue.
                  </p>
                )}

                <div className="mt-5">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#141419] px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full border-white/15 bg-transparent text-foreground hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleGuestLogin}
                    disabled={isLoading || !agreed}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Continue as Guest
                  </Button>
                </div>
              </div>
            </form>
            <div className="mt-6 rounded-b-xl border-t border-border bg-[#101014] px-6 py-3.5 text-center text-xs text-muted-foreground">
              Secured by{" "}
              <a
                href="https://freebuff.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-foreground/80"
              >
                freebuff.com
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-xl border border-border bg-[#141419] shadow-2xl shadow-black/60">
            <div className="px-6 pb-2 pt-7 text-center">
              <h1 className="text-lg font-semibold text-white">Check your email</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                We've sent a code to{" "}
                <span className="font-medium text-foreground">{step.email}</span>
              </p>
            </div>
            <form onSubmit={handleOtpSubmit}>
              <div className="px-6 pb-6 pt-4">
                <input type="hidden" name="email" value={step.email} />
                <input type="hidden" name="code" value={otp} />

                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                        const form = (e.target as HTMLElement).closest("form");
                        if (form) {
                          form.requestSubmit();
                        }
                      }
                    }}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p className="mt-3 text-center text-sm text-red-400">{error}</p>
                )}
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Didn't receive a code?{" "}
                  <button
                    type="button"
                    className="font-medium text-violet-400 hover:text-violet-300"
                    onClick={() => setStep("signIn")}
                  >
                    Try again
                  </button>
                </p>

                <Button
                  type="submit"
                  className="mt-5 w-full bg-violet-500 text-white hover:bg-violet-400"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("signIn")}
                  disabled={isLoading}
                  className="mt-2 w-full text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  Use different email
                </Button>
              </div>
            </form>
            <div className="rounded-b-xl border-t border-border bg-[#101014] px-6 py-3.5 text-center text-xs text-muted-foreground">
              Secured by{" "}
              <a
                href="https://freebuff.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-foreground/80"
              >
                freebuff.com
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
