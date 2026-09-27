import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Information we collect",
    paragraphs: [
      "Depending on how you use AptFindr, we may process account details such as your name, email address, phone number, address, account role, and profile information. If you sign in with Google, Google provides the account information permitted by the sign-in flow, such as your name, email address, and profile image.",
      "AptFindr also processes information you submit or create on the platform. This may include apartment listings and their addresses or map locations, room and property details, photos, favorites, ratings, reports, appeals, support requests, notifications, and saved drafts.",
      "Landlords may provide contact and business details and property-verification information. Where you upload identity, permit, or other verification documents, those documents may contain sensitive personal information. Submit only documents requested for verification and do not upload unrelated sensitive information.",
      "Some basic technical and activity information may be processed to operate, secure, and troubleshoot the service. The exact information can depend on your device, browser, and use of AptFindr.",
    ],
  },
  {
    title: "2. How we use information",
    paragraphs: [
      "We use information to create and manage accounts; authenticate users; provide tenant, landlord, and administrative features; publish and manage property listings; support verification and moderation; process favorites, ratings, reports, appeals, and support requests; send account, security, and service messages; and maintain, protect, and improve AptFindr.",
      "We may also use information to investigate suspected fraud, misuse, or violations of our Terms of Use and to meet applicable legal obligations.",
    ],
  },
  {
    title: "3. Listings and information visible to others",
    paragraphs: [
      "Information you submit for a public apartment listing, including listing details, location, and images, may be visible to other AptFindr users or the public. Profile or landlord information may also be shown where needed for the platform's features. Do not include personal details in a listing or image unless you intend them to be shared.",
      "Private account details, reports, support requests, and verification documents are intended for the relevant account holder and authorized AptFindr personnel. Access is subject to our technical controls and applicable law.",
    ],
  },
  {
    title: "4. Google sign-in and service providers",
    paragraphs: [
      "If you choose Continue with Google, Google authenticates you and shares the basic profile information authorized in the sign-in flow. AptFindr does not receive your Google password. Google handles its own processing under Google's privacy terms.",
      "AptFindr uses Supabase for authentication, database, and file-storage services, and Vercel to host the web application. These providers process information as needed to provide their services to AptFindr. Information may be stored or processed in locations determined by those providers and their service configuration.",
    ],
  },
  {
    title: "5. Retention and security",
    paragraphs: [
      "We keep information for as long as reasonably needed to provide AptFindr, administer accounts and listings, resolve disputes, enforce platform rules, maintain security, and meet legal obligations. Retention periods may differ by data type. When information is no longer needed, we take reasonable steps to delete it or otherwise handle it appropriately, subject to legal and operational requirements.",
      "We use access controls and other reasonable safeguards intended to protect information. No online service or storage method can be guaranteed completely secure.",
    ],
  },
  {
    title: "6. Your choices and requests",
    paragraphs: [
      "You can review or update certain profile information through AptFindr's account features. You may also submit a request to access, correct, or delete personal information, or raise a privacy concern, through AptFindr's Support feature. We may need to verify your identity before acting on a request. Some information may need to be retained where required by law or for legitimate security, dispute-resolution, or service purposes.",
      "You can choose email/password sign-up instead of Google sign-in, or choose Google sign-in instead of email/password, where those options are available. Account and security emails necessary to operate your account may still be sent.",
    ],
  },
  {
    title: "7. Children's privacy",
    paragraphs: [
      "AptFindr is not intended for children who are not legally able to use the service under applicable law. If you believe a child has provided personal information to AptFindr, please contact us through the Support feature so we can review the request.",
    ],
  },
  {
    title: "8. Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy as AptFindr's features or practices change. We will post the current version on this page and update the date below. Please review it periodically.",
    ],
  },
];

export function PrivacyPolicy() {
  return (
    <main style={styles.page}>
      <article style={styles.article}>
        <Link to="/" style={styles.backLink}>← Back to AptFindr</Link>
        <p style={styles.eyebrow}>APTFINDR</p>
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.updated}>Last updated: September 27, 2026</p>
        <p style={styles.intro}>
          This Privacy Policy explains how AptFindr handles information when you use our apartment-finding and property-listing platform. By using AptFindr, you acknowledge this notice. Where consent is legally required, we will ask for it separately.
        </p>
        {sections.map((section) => (
          <section key={section.title} style={styles.section}>
            <h2 style={styles.heading}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} style={styles.paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <p style={styles.footer}>
          For privacy requests or questions, use the Support feature in AptFindr. This policy should be reviewed and kept consistent with AptFindr's actual data practices.
        </p>
        <Link to="/" style={styles.backLink}>Return to AptFindr</Link>
      </article>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#172033", padding: "48px 20px" },
  article: { boxSizing: "border-box", maxWidth: 850, margin: "0 auto", padding: "clamp(24px, 5vw, 56px)", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, boxShadow: "0 12px 40px rgba(15, 23, 42, .06)", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", lineHeight: 1.7 },
  backLink: { color: "#2563eb", fontWeight: 600, textDecoration: "none" },
  eyebrow: { margin: "34px 0 4px", color: "#64748b", fontSize: 12, fontWeight: 700, letterSpacing: ".14em" },
  title: { margin: "0 0 4px", fontSize: "clamp(34px, 6vw, 48px)", lineHeight: 1.15, letterSpacing: "-.04em" },
  updated: { margin: "8px 0 24px", color: "#64748b", fontSize: 14 },
  intro: { margin: "0 0 32px", padding: 20, background: "#f1f5f9", borderRadius: 12, color: "#334155" },
  section: { margin: "28px 0" },
  heading: { margin: "0 0 10px", fontSize: 20, lineHeight: 1.35 },
  paragraph: { margin: "0 0 12px", color: "#475569", fontSize: 15 },
  footer: { margin: "36px 0 22px", paddingTop: 20, borderTop: "1px solid #e2e8f0", color: "#475569", fontSize: 14 },
};
