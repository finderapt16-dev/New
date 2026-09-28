import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./termsPrivacyDialog.css";

const TENANT_TERMS = [
  {
    title: "1. Platform Usage",
    body: "AptFindr is a localized Progressive Web Application designed to help users search for apartments and boarding houses in La Paz, Iloilo City.",
  },
  {
    title: "2. User Accounts",
    body: "Users must provide accurate, complete, and up-to-date information when creating and maintaining their accounts. You are responsible for keeping your account credentials secure.",
  },
  {
    title: "3. Listing Information",
    body: "AptFindr provides apartment information submitted by landlords and reviewed through the platform's verification process. Users should review listing details carefully before making rental decisions.",
  },
  {
    title: "4. Acceptable Conduct",
    body: "You agree to use AptFindr responsibly, treat other users with respect, and communicate professionally with landlords.",
  },
  {
    title: "5. Prohibited Conduct",
    body: "You must not create fake accounts, provide false information, harass other users, engage in fraudulent activities, or misuse the platform. Violations may result in account suspension.",
  },
];

const TENANT_PRIVACY = [
  {
    title: "1. Information We Collect",
    body: "AptFindr may collect personal information such as your name, mobile number, email address, username, and other profile information for account registration and platform use.",
  },
  {
    title: "2. How We Use Information",
    body: "Your information is used to operate AptFindr, manage accounts, provide apartment search and communication features, ensure platform security, and improve our services.",
  },
  {
    title: "3. Information Visibility",
    body: "Certain information, such as your display name and profile, may be visible to landlords when you inquire about a property, in order to facilitate safe and legitimate communication.",
  },
  {
    title: "4. Data Storage and Security",
    body: "AptFindr uses secure database and authentication technologies, such as Supabase, to protect your personal information against unauthorized access, alteration, or loss.",
  },
  {
    title: "5. Data Sharing",
    body: "AptFindr does not sell your personal information. Your information may be processed by authorized service providers (e.g., Supabase) to operate the platform or as required by applicable law.",
  },
];

const LANDLORD_TERMS = [
  {
    title: "1. Platform Usage",
    body: "AptFindr is a localized web app for tenants to search for and list apartments or boarding houses in La Paz, Iloilo City.",
  },
  {
    title: "2. Account Information",
    body: "Users must provide accurate, complete, and up-to-date information when creating and maintaining their accounts. Landlords are responsible for ensuring that property and business information submitted for verification is accurate.",
  },
  {
    title: "3. Property Listings",
    body: "Landlords must provide accurate information regarding property location, rental prices, room availability, amenities, utilities, house rules, and other listing details.",
  },
  {
    title: "4. Verification",
    body: "Landlord accounts and property listings may be subject to administrative verification before being published on AptFindr. Providing false or misleading information may result in account suspension or removal of listings.",
  },
  {
    title: "5. Responsibilities",
    body: "Landlords are responsible for maintaining accurate listing information, responding to tenant inquiries professionally, and complying with applicable rental laws and regulations.",
  },
];

const LANDLORD_PRIVACY = [
  {
    title: "1. Information We Collect",
    body: "AptFindr may collect personal information such as your name, mobile number, username, recovery email, business name, property information, and verification documents when necessary for account registration, verification, and listing management.",
  },
  {
    title: "2. How Information Is Used",
    body: "Your information is used exclusively to operate AptFindr, manage accounts and property listings, perform verification, facilitate safe communication between users, process reports and appeals, and maintain platform security.",
  },
  {
    title: "3. Data Security",
    body: "We use secure database systems, such as Supabase, to protect your personal information against unauthorized access, alteration, or loss.",
  },
  {
    title: "4. Data Sharing",
    body: "AptFindr does not sell your personal information. We may share information only when necessary to operate the platform, comply with applicable legal requirements, protect users, or provide services through authorized third-party service providers (e.g., Supabase).",
  },
];

function getContent(role, type) {
  const isLandlord = role === "landlord";
  if (type === "terms") return isLandlord ? LANDLORD_TERMS : TENANT_TERMS;
  return isLandlord ? LANDLORD_PRIVACY : TENANT_PRIVACY;
}

export function TermsPrivacyDialog({ open, onOpenChange, role = "tenant", type = "terms" }) {
  const content = getContent(role, type);
  const title = type === "terms" ? "Terms of Service" : "Privacy Policy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="terms-privacy-dialog-content">
        <DialogTitle className="terms-privacy-dialog-title">{title}</DialogTitle>
        <DialogDescription className="terms-privacy-dialog-desc">
          {role === "landlord" ? `Landlord ${title}` : `Tenant ${title}`} for AptFindr account registration.
        </DialogDescription>

        <div className="terms-privacy-dialog-body">
          <div className="terms-privacy-dialog-card">
            {content.map((section) => (
              <div key={section.title} className="terms-privacy-section">
                <h4 className="terms-privacy-section-title">{section.title}</h4>
                <p className="terms-privacy-section-body">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
