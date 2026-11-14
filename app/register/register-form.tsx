"use client";

import { useState } from "react";
import { registerAction } from "@/app/actions/auth";

export function RegisterForm() {
  const [role, setRole] = useState("");

  return (
    <form action={registerAction}>
      <div className="mb-3">
        <label className="form-label" htmlFor="name">Full Name</label>
        <input id="name" type="text" name="name" className="form-control" placeholder="Enter your full name" autoComplete="name" required />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="register-email">Email Address</label>
        <input id="register-email" type="email" name="email" className="form-control" placeholder="Enter your email" autoComplete="email" required />
        <small className="registration-hint"><i className="fas fa-shield-alt" aria-hidden="true" /> A verification code will be sent to this email</small>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="phone">Phone Number</label>
        <input id="phone" type="tel" name="phone" className="form-control" placeholder="Enter your phone number" autoComplete="tel" required />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="location">Location</label>
        <input id="location" type="text" name="location" className="form-control" placeholder="Enter your location" autoComplete="address-level2" required />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="role">Role</label>
        <select id="role" name="role" className="form-control" value={role} onChange={(event) => setRole(event.target.value)} required>
          <option value="">Select your role</option>
          <option value="farmer">Farmer</option>
          <option value="buyer">Buyer</option>
        </select>
      </div>
      {role !== "buyer" && <div className="mb-3" id="farmField">
        <label className="form-label" htmlFor="farm-size">Farm Size</label>
        <input id="farm-size" type="text" name="farm_size" className="form-control" placeholder="e.g. 5 acres" />
      </div>}
      <div className="mb-3">
        <label className="form-label" htmlFor="register-password">Password</label>
        <input id="register-password" type="password" name="password" className="form-control" placeholder="Create a password (12+ characters)" autoComplete="new-password" minLength={12} required />
      </div>
      <button className="btn-register" type="submit"><i className="fas fa-envelope" aria-hidden="true" /> Register &amp; Verify Email</button>
    </form>
  );
}
