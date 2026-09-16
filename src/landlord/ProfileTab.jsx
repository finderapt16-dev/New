import "./ProfileTab.css";
import { Button } from "@/components/ui/button";
import { SettingsField as Field, SettingsSectionTitle as SectionTitle, SettingsInput, SettingsTextarea } from "@/landlord/SettingsFormFields";
import { Camera, RotateCcw } from "lucide-react";
export const ProfileTab = ({ profile, isUploadingProfilePhoto, profilePhotoInputRef, handleRemoveProfilePhoto, handleProfilePhoto, updateProfile, setProfile, savedProfile, handleUpdateProfile, isUpdatingProfile, }) => (<div className="profile-tab-grid">
    <div className="profile-tab-card">
      <div className="profile-tab-row">
        {profile.avatar ? <img src={profile.avatar} alt={`${profile.firstName || "Landlord"} profile`} className="profile-tab-image"/> : (profile.firstName[0] || "L").toUpperCase()}
      </div>
      <div className="profile-tab-panel">
        <p className="profile-tab-text">{`${profile.firstName} ${profile.lastName}`.trim() || "Not provided"}</p>
        <p className="profile-tab-text-2">{profile.email || "Email not provided"}</p>
        <div className="profile-tab-row-2">
          <button type="button" disabled={isUploadingProfilePhoto} onClick={() => profilePhotoInputRef.current?.click()} className="profile-tab-button"><Camera className="profile-tab-camera-icon"/>{isUploadingProfilePhoto ? "Uploading..." : "Upload Photo"}</button>
          <button type="button" disabled={!profile.avatar || isUploadingProfilePhoto} onClick={() => void handleRemoveProfilePhoto()} className="profile-tab-remove-photo">Remove Photo</button>
          <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="profile-tab-input" onChange={(event) => void handleProfilePhoto(event.target.files?.[0])}/>
        </div>
      </div>
    </div>

    <div className="profile-tab-card-2">
      <SectionTitle icon="👤" title="Personal Information" subtitle="Your public-facing landlord profile"/>
      <div className="profile-tab-grid-2">
        <Field label="First Name">
          <SettingsInput value={profile.firstName} onChange={(e) => updateProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name"/>
        </Field>
        <Field label="Last Name">
          <SettingsInput value={profile.lastName} onChange={(e) => updateProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name"/>
        </Field>
      </div>
      <Field label="Email Address" hint="Used for account login and notifications">
        <SettingsInput type="email" value={profile.email} onChange={(e) => updateProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com"/>
      </Field>
      <Field label="Mobile Number" hint="Visible to tenants if enabled in Business settings">
        <SettingsInput type="tel" value={profile.mobile} onChange={(e) => updateProfile(p => ({ ...p, mobile: e.target.value }))} placeholder="09XXXXXXXXX"/>
      </Field>
      <Field label="Bio / About You" hint="Shown on your landlord profile page (max 300 characters)">
        <SettingsTextarea rows={3} value={profile.bio} onChange={(e) => updateProfile(p => ({ ...p, bio: e.target.value.slice(0, 300) }))} placeholder="Tell tenants about yourself…"/>
        <p className="profile-tab-300">{profile.bio.length}/300</p>
      </Field>
    </div>

    <div className="profile-tab-content">
      <Button variant="outline" onClick={() => setProfile(savedProfile)} className="profile-tab-reset-changes"><RotateCcw className="profile-tab-rotate-ccw-icon"/>Reset Changes</Button>
      <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="profile-tab-button-2">{isUpdatingProfile ? "Saving..." : "Save Changes"}</Button>
    </div>
  </div>);
