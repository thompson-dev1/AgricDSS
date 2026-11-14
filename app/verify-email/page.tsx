import { redirect } from "next/navigation";
import { resendVerificationAction, verifyEmailAction } from "@/app/actions/auth";
import { getPendingEmailById } from "@/app/lib/data/users";

export const metadata = { title: "Verify Email | AGRIC DSS" };

type VerifyPageProps = { searchParams: Promise<{ id?: string; error?: string; resent?: string }> };

const verificationErrors: Record<string, string> = {
  invalid_code: "That code is not correct. Check the email and try again.",
  expired: "The code has expired. Request a new code below.",
  email_failed: "We could not send a new code. Please try again.",
  rate_limited: "Too many attempts. Wait before trying again.",
};

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  const { id, error, resent } = await searchParams;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId < 1) redirect("/register");

  const email = await getPendingEmailById(userId);
  if (!email) redirect("/login");

  return (
    <main className="registration-page">
      <section className="verify-card">
        <div className="verify-icon"><i className="fas fa-envelope-open-text" aria-hidden="true" /></div>
        <h1>Verify your email</h1>
        <p>Enter the 6-digit code we sent to <strong>{maskEmail(email)}</strong>.</p>
        <p className="verify-expiry">The code expires in 10 minutes.</p>
        {resent && <div className="alert-msg success" role="status">A new verification code has been sent.</div>}
        {error && <div className="alert-msg error" role="alert">{verificationErrors[error] || "We could not verify that code."}</div>}
        <form action={verifyEmailAction}>
          <input type="hidden" name="user_id" value={userId} />
          <label className="visually-hidden" htmlFor="verification-code">Verification code</label>
          <input id="verification-code" name="code" className="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} pattern="[0-9]{6}" required />
          <button className="btn-register" type="submit">Verify Email</button>
        </form>
        <form action={resendVerificationAction} className="resend-form">
          <input type="hidden" name="user_id" value={userId} />
          <button type="submit" className="resend-button">Resend Code</button>
        </form>
      </section>
    </main>
  );
}
