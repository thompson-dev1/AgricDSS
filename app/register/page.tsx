import { RegisterForm } from "./register-form";

export const metadata = { title: "Registration | AGRIC DSS" };

type RegisterPageProps = { searchParams: Promise<{ error?: string }> };

const errorMessages: Record<string, string> = {
  invalid_details: "Check your details and use a password with at least 12 characters.",
  rate_limited: "Too many registration attempts. Wait an hour before trying again.",
  email_exists: "An account with that email already exists.",
  email_not_configured: "Email verification is not configured on this server yet.",
  email_failed: "We could not send the verification email. Please try again.",
  registration_failed: "We could not save your account. Please try again.",
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;
  return (
    <main className="registration-page">
      <section className="reg-card">
        <header className="reg-header">
          <div className="icon"><i className="fas fa-user-plus" aria-hidden="true" /></div>
          <h1>Create Account</h1>
          <p>Join the Agricultural Market System</p>
        </header>
        {error && <div className="alert-msg error" role="alert">{errorMessages[error] || "We could not complete registration."}</div>}
        <RegisterForm />
        <div className="login-link">Already have an account? <a href="/login">Sign In</a></div>
      </section>
    </main>
  );
}
