import { loginAction } from "@/app/actions/auth";

export const metadata = { title: "Login | AGRIC DSS" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; return_to?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, return_to: returnTo } = await searchParams;
  return (
    <main className="login-page">
      <div className="container login-box">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <section className="card p-4">
              <h1 className="text-center">🌿 Login</h1>
              <p className="text-center text-muted">Access your Agricultural Market System</p>
              {error && <div className="alert alert-danger" role="alert">{error === "invalid_role" ? "This account does not have a supported role." : error === "rate_limited" ? "Too many login attempts. Wait 15 minutes before trying again." : "Email or password is incorrect."}</div>}
              <form action={loginAction}>
                {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
                <label className="visually-hidden" htmlFor="email">Email Address</label>
                <input id="email" type="email" name="email" className="form-control mb-3" placeholder="Email Address" autoComplete="email" required />
                <label className="visually-hidden" htmlFor="password">Password</label>
                <input id="password" type="password" name="password" className="form-control mb-3" placeholder="Password" autoComplete="current-password" required />
                <button type="submit" className="btn btn-custom w-100">Login</button>
              </form>
              <hr />
              <p className="text-center mb-0">Don&apos;t have an account? <a href="/register">Register here</a></p>
            </section>
          </div>
        </div>
      </div>
      <footer className="footer"><small>© {new Date().getFullYear()} Agricultural Market &amp; Decision Support System</small></footer>
    </main>
  );
}
