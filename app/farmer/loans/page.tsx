import { redirect } from "next/navigation";
import { withdrawLoanAction } from "@/app/actions/loans";
import { LoanForm } from "./loan-form";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import { db } from "@/app/lib/db";
import "./loans.css";

export const metadata = { title: "Request Platform Funds | AGRIC DSS" };
type Props = { searchParams: Promise<{ error?: string; success?: string; withdrawn?: string }> };
type Loan = { id: number; amount: number; purpose: string; repayment_term: string | null; status: string; interest_rate: number | null; created_at: string | null };
export default async function FarmerLoansPage({ searchParams }: Props) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Floans");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const [{ error, success, withdrawn }, trust, loans] = await Promise.all([
    searchParams,
    Promise.resolve(await (db.prepare("SELECT score FROM buyer_reputation WHERE buyer_id=? ORDER BY id DESC LIMIT 1").get(user.id)) as { score: number } | undefined),
    Promise.resolve(await (db.prepare("SELECT id,amount,purpose,repayment_term,status,interest_rate,created_at FROM loans WHERE user_id=? ORDER BY created_at DESC,id DESC").all(user.id)) as Loan[]),
  ]);
  const score = trust?.score ?? null; const rate = score === null || score < 40 ? 5 : score < 80 ? 3.5 : 2;
  return <main className="loans-page"><div className="loans-wrap"><h1><i className="fas fa-hand-holding-usd" aria-hidden="true" /> Request Platform Funds</h1>
    {error && <p className="loan-message error" role="alert">{error === "invalid_image" ? "Upload a JPG or PNG image smaller than 2 MB." : "Check the application details and accept the terms."}</p>}{success && <p className="loan-message success" role="status">Loan application submitted. The admin will review your request.</p>}{withdrawn && <p className="loan-message success" role="status">Pending loan request withdrawn.</p>}
    <div className="loans-columns"><section className="loan-card"><h2><i className="fas fa-paper-plane" aria-hidden="true" /> Submit Loan Request</h2><div className="loan-trust"><strong>Your Platform Trust Score: {score === null ? "N/A" : `${Math.round(score)}%`}</strong><span>Platform interest rate: {rate}% monthly</span></div><div className="loan-terms-box"><b>How it works</b><ol><li>Choose the amount and repayment duration.</li><li>Your monthly interest rate is set from the platform trust score.</li><li>Review the calculated total repayment.</li><li>The admin reviews the application before dispatch.</li></ol></div><LoanForm rate={rate} /></section>
      <section className="loan-card loan-history"><h2><i className="fas fa-folder-open" aria-hidden="true" /> Your Loan Requests</h2>{loans.length ? loans.map((loan) => <article className="loan-item" key={loan.id}><div><small>#LN-{String(loan.id).padStart(4,"0")}</small><strong>{new Intl.NumberFormat("en-GH",{style:"currency",currency:"GHS"}).format(loan.amount)}</strong><p>{loan.purpose}</p><span>{loan.status === "Approved" ? `Rate ${loan.interest_rate ?? "TBD"}% · ${loan.repayment_term || "Duration unavailable"}` : loan.status === "Pending" ? "Awaiting admin review" : loan.repayment_term || ""}</span></div><div className="loan-item-side"><b className={`loan-status ${loan.status.toLowerCase()}`}>{loan.status}</b>{loan.status.toLowerCase() === "pending" && <form action={withdrawLoanAction}><input type="hidden" name="loan_id" value={loan.id} /><button type="submit">Withdraw request</button></form>}</div></article>) : <div className="loan-empty"><i className="fas fa-box-open" aria-hidden="true" /><p>You have no active loan requests.</p></div>}</section></div>
  </div></main>;
}
