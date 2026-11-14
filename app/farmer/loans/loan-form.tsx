"use client";

import { useState } from "react";
import { applyForLoanAction } from "@/app/actions/loans";

const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);
export function LoanForm({ rate }: { rate: number }) {
  const [amount, setAmount] = useState(""); const [term, setTerm] = useState(""); const [purpose, setPurpose] = useState("");
  const principal = Number(amount) || 0; const months = Number(term) || 0; const interest = principal * rate / 100 * months;
  return <form action={applyForLoanAction} className="loan-form">
    <label>Requested Amount (GHS)<input type="number" name="amount" min="100" max="100000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
    <label>Desired Repayment Duration<select name="repayment_term" value={term} onChange={(event) => setTerm(event.target.value)} required><option value="">Select duration…</option><option value="1">1 Month</option><option value="3">3 Months</option><option value="6">6 Months</option><option value="12">12 Months (1 Year)</option><option value="24">24 Months (2 Years)</option></select></label>
    <label>Ghana Card Number<input type="text" name="ghana_card_number" placeholder="GHA-XXXXXXXXX-X" maxLength={30} required /></label>
    <label>Upload Ghana Card Picture<input type="file" name="ghana_card_image" accept="image/jpeg,image/png" required /></label>
    <label>Primary Purpose<select name="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} required><option value="">Select purpose…</option><option>Buy Seeds</option><option>Fertilizers & Chemicals</option><option>Farm Equipment</option><option>Land Preparation</option><option>Livestock Farming</option><option value="Other">Other…</option></select></label>
    {purpose === "Other" && <label>Specify purpose<input name="custom_purpose" maxLength={120} required /></label>}
    {principal > 0 && months > 0 && <div className="loan-calculation"><div><span>Principal Amount</span><strong>{money(principal)}</strong></div><div><span>Interest ({rate}% monthly)</span><strong>{money(interest)}</strong></div><hr /><div><b>Total Repayment</b><strong>{money(principal + interest)}</strong></div></div>}
    <label className="loan-terms"><input type="checkbox" name="agree" value="yes" required /> I accept the calculated total repayment amount and platform terms.</label>
    <button type="submit" className="loan-submit"><i className="fas fa-check-circle" aria-hidden="true" /> Confirm & Send Request</button>
  </form>;
}
