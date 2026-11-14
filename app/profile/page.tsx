import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/actions/profile";
import { changePasswordAction } from "@/app/actions/security";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
import "./profile.css";

export const metadata = { title: "My Profile | AGRIC DSS" };
type PageProps = { searchParams: Promise<{ error?: string; updated?: string; password_changed?: string }> };

export default async function ProfilePage({ searchParams }: PageProps) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Fprofile");
  const user = await getUserById(session.userId);
  if (!user) redirect("/login");
  const profile = await (db.prepare("SELECT phone, location, profile_picture FROM users WHERE id = ? LIMIT 1")
    .get(user.id)) as { phone: string | null; location: string | null; profile_picture: string | null } | undefined;
  const { error, updated, password_changed: passwordChanged } = await searchParams;
  const imageSrc = profile?.profile_picture
    ? `/uploads/profiles/${encodeURIComponent(profile.profile_picture)}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=a5d6a7&color=1b5e20`;
  const errorText: Record<string, string> = {
    invalid_details: "Check your name, phone number, and location, then try again.",
    invalid_image: "Use a JPG, PNG, or GIF image.", image_too_large: "Choose an image smaller than 2 MB.",
    current_password: "Your current password is incorrect.", password_short: "Use at least 12 characters for your new password.",
    password_mismatch: "The new passwords do not match.", password_same: "Choose a password different from your current one.",
    rate_limited: "Too many attempts. Wait before trying again.",
  };

  return <main className="profile-page">
    <header className="profile-page-header"><h1><i className="fas fa-user-edit" aria-hidden="true" /> Edit Profile</h1><p>Update your personal details and profile picture</p></header>
    <section className="profile-card">
      {updated && <p className="profile-alert success" role="status">Profile updated successfully.</p>}
      {error && <p className="profile-alert error" role="alert">{errorText[error] || "Something went wrong. Please try again."}</p>}
      <form action={updateProfileAction} encType="multipart/form-data">
        <div className="profile-picture-control"><img src={imageSrc} alt={`${user.name}'s profile`} /><label htmlFor="profile-picture"><i className="fas fa-camera" aria-hidden="true" /><span className="sr-only">Choose profile picture</span></label><input id="profile-picture" type="file" name="profile_picture" accept="image/jpeg,image/png,image/gif" /></div>
        <label>Full Name<input type="text" name="name" defaultValue={user.name} maxLength={120} required /></label>
        <label>Email Address <small>Email cannot be changed.</small><input type="email" value={user.email} readOnly /></label>
        <label>Phone Number<input type="tel" name="phone" defaultValue={profile?.phone || ""} maxLength={40} /></label>
        <label>Location<input type="text" name="location" defaultValue={profile?.location || ""} maxLength={160} /></label>
        <button className="profile-save" type="submit"><i className="fas fa-save" aria-hidden="true" /> Save Changes</button>
      </form>
      <hr />
      {passwordChanged && <p className="profile-alert success" role="status">Password changed. Other active sessions have been signed out.</p>}
      <section className="password-section"><h2>Change Password</h2><p>Use at least 12 characters. This signs out your other sessions.</p>
        <form action={changePasswordAction}>
          <label>Current Password<input type="password" name="current_password" autoComplete="current-password" required /></label>
          <label>New Password<input type="password" name="new_password" minLength={12} autoComplete="new-password" required /></label>
          <label>Confirm New Password<input type="password" name="confirm_password" minLength={12} autoComplete="new-password" required /></label>
          <button className="profile-save" type="submit">Update Password</button>
        </form>
      </section>
      <hr />
      <form action={logoutAction}><button className="profile-logout" type="submit"><i className="fas fa-sign-out-alt" aria-hidden="true" /> Log Out Securely</button></form>
    </section>
  </main>;
}
