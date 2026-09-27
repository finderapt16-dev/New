import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Agreement to these terms",
    paragraphs: [
      "These Terms of Service (also referred to as our \"Terms of Use\") are a binding agreement between you and AptFindr covering your use of the AptFindr website, application, and related services, including any tenant, landlord, and administrative features. By creating an account, browsing listings, publishing a listing, or otherwise using AptFindr, you agree to these terms and to our Privacy Policy.",
      "If you do not agree with any part of these terms, please do not use AptFindr. Where a feature requires a separate acknowledgment (for example, the landlord verification policy shown at sign-up), that acknowledgment is part of your agreement with us.",
    ],
  },
  {
    title: "2. Eligibility and accounts",
    paragraphs: [
      "AptFindr is intended for users who can lawfully enter into these terms under applicable law, and it is focused on apartment rentals in La Paz, Iloilo City, Philippines. You must provide accurate registration information, keep your password confidential, and promptly update any account information that becomes outdated.",
      "Accounts are personal and role-based: tenant, landlord, or administrator. You are responsible for all activity that occurs under your account, whether or not you authorized it. If you suspect unauthorized access, contact us through the Support feature immediately.",
    ],
  },
  {
    title: "3. Tenant use of the platform",
    paragraphs: [
      "Tenants may search and browse apartment listings, view room details and photos, save favorites, submit ratings and reviews, and report problems with listings or conduct. Ratings and reports must reflect your genuine experience, and you must not submit false, misleading, harassing, or retaliatory content.",
      "AptFindr helps you discover and compare rentals. Any lease, reservation, deposit, or payment arrangement is made directly between you and the landlord or property owner. Read the listing carefully and inspect the property before committing.",
    ],
  },
  {
    title: "4. Landlord listings and verification",
    paragraphs: [
      "Landlords may create and manage apartment listings, rooms, photos, amenities, utilities, availability, and pricing information. You are solely responsible for the accuracy, completeness, and legality of everything you publish, including compliance with local rental, zoning, tax, and safety requirements in Iloilo City and the Philippines.",
      "Before listings become publicly available, landlord accounts must pass verification. You agree to provide truthful business and identity information, such as your Business Permit Number and requested verification documents, and to keep them current. We may suspend, unpublish, or remove listings and reject or revoke verification where information is inaccurate, expired, or inconsistent.",
      "Do not publish listings you have no right to offer, duplicate or fake listings, prices or availability you do not intend to honor, or photos that misrepresent the property. Contact details and payment instructions placed in listings must comply with platform rules and applicable law.",
    ],
  },
  {
    title: "5. Acceptable use and prohibited conduct",
    paragraphs: [
      "You agree not to misuse AptFindr. Prohibited conduct includes: violating applicable law; infringing anyone's rights; uploading unlawful, harmful, threatening, discriminatory, obscene, or private information about others; scraping or harvesting data at scale; attempting to access accounts, data, or systems you are not authorized to use; interfering with or overloading the service; and creating multiple accounts to evade restrictions or abuse features.",
      "You also agree not to misuse moderation features: reports, appeals, ratings, and support requests must be submitted in good faith. Knowingly false reports or appeals may result in content removal and account restrictions.",
    ],
  },
  {
    title: "6. Content, moderation, reports, and appeals",
    paragraphs: [
      "You keep ownership of the content you submit, such as listing text and photos, and you grant AptFindr a non-exclusive license to host, store, display, reproduce, and distribute that content as needed to operate and promote the service, including showing listings to other users.",
      "You represent that you have all rights needed for the content you submit, including rights to any photos, and that your content does not infringe third-party rights. We may review, refuse, edit, unpublish, or remove content that violates these terms or platform rules, and we may take action against accounts involved.",
      "Where a listing, report decision, or account action affects you, you may use the in-app report and appeal features to ask for review. Appeals are reviewed by our administrative team, and decisions will be communicated through the platform.",
    ],
  },
  {
    title: "7. Sign-in options and third-party services",
    paragraphs: [
      "You may sign in with an email and password or, where offered, with Continue with Google. When you use Google sign-in, Google's own terms and privacy policy govern your relationship with Google, and you can disconnect the option from your account settings at any time.",
      "AptFindr relies on third-party services, including Supabase for authentication, database, and storage, Vercel for hosting, and OpenStreetMap contributors for maps and geocoding. These services have their own terms, and availability of AptFindr may depend on them.",
    ],
  },
  {
    title: "8. Intellectual property",
    paragraphs: [
      "The AptFindr name, logo, interface, and underlying software and design are owned by AptFindr or its licensors and are protected by applicable intellectual property laws. Except for the limited license to use the service as provided, no rights are granted to you in the platform itself. You may not copy, modify, redistribute, or create derivative works of the platform without written permission.",
    ],
  },
  {
    title: "9. Payments, fees, and rentals",
    paragraphs: [
      "AptFindr currently provides listing and discovery tools and does not process rent payments, deposits, or reservations between tenants and landlords. Any money exchanged for a rental is handled outside AptFindr, at your own risk, and is governed by the agreement between you and the other party. If we introduce paid features in the future, the pricing and billing terms for those features will be presented before you are charged.",
    ],
  },
  {
    title: "10. Disclaimers and limitation of liability",
    paragraphs: [
      "AptFindr is provided on an \"as is\" and \"as available\" basis. Listings and user-generated content are provided by users; we do not guarantee their accuracy, quality, legality, or safety, and verification of a landlord or listing is not an endorsement or warranty. We do not act as a landlord, broker, or agent in any rental transaction.",
      "To the maximum extent permitted by law, AptFindr is not liable for indirect, incidental, special, consequential, or punitive damages, or for losses arising from your dealings with other users, your reliance on listings, or interruptions of the service. Nothing in these terms limits liability that cannot be limited under applicable law.",
    ],
  },
  {
    title: "11. Suspension and termination",
    paragraphs: [
      "You may stop using AptFindr and request account deletion at any time through the Support feature, subject to retention described in our Privacy Policy. We may suspend or terminate accounts, remove content, or restrict features where required by law or where we reasonably believe these terms or platform rules have been violated, including repeated or serious misuse.",
      "Where appropriate we will give notice and an opportunity to appeal through the in-app features, except where notice would compromise security, investigations, or legal obligations.",
    ],
  },
  {
    title: "12. Changes to these terms",
    paragraphs: [
      "We may update these Terms of Service as features and legal requirements evolve. The current version will always be posted on this page with an updated date. For material changes affecting existing accounts, we will provide reasonable notice through the platform or by email where practicable. Continued use of AptFindr after changes take effect means you accept the updated terms.",
    ],
  },
  {
    title: "13. Governing law and contact",
    paragraphs: [
      "These terms are governed by the laws of the Republic of the Philippines, without regard to conflict-of-law rules, and disputes arising from AptFindr will be subject to the jurisdiction of the competent courts of the Philippines, to the extent permitted by law.",
      "Questions, notices, and requests regarding these terms can be sent through the Support feature inside AptFindr. Our Privacy Policy explains how we handle the information you send us.",
    ],
  },
];

export function TermsOfService() {
  return (
    <main style={styles.page}>
      <article style={styles.article}>
        <Link to="/" style={styles.backLink}>← Back to AptFindr</Link>
        <p style={styles.eyebrow}>APTFINDR</p>
        <h1 style={styles.title}>Terms of Service</h1>
        <p style={styles.updated}>Last updated: September 27, 2026</p>
        <p style={styles.intro}>
          These Terms of Service (our &quot;Terms of Use&quot;) explain the rules for using AptFindr, our apartment-finding and property-listing platform for La Paz, Iloilo City. They apply together with our{" "}
          <Link to="/privacy-policy" style={styles.inlineLink}>Privacy Policy</Link>. By using AptFindr or creating an account, you agree to these terms.
        </p>
        {sections.map((section) => (
          <section key={section.title} style={styles.section}>
            <h2 style={styles.heading}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} style={styles.paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <p style={styles.footer}>
          These terms describe the platform&apos;s current tenant, landlord, and admin workflows and should be reviewed and kept consistent with AptFindr&apos;s actual practices. For questions about these terms, use the Support feature in AptFindr.
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
  inlineLink: { color: "#2563eb", fontWeight: 600, textDecoration: "none" },
  section: { margin: "28px 0" },
  heading: { margin: "0 0 10px", fontSize: 20, lineHeight: 1.35 },
  paragraph: { margin: "0 0 12px", color: "#475569", fontSize: 15 },
  footer: { margin: "36px 0 22px", paddingTop: 20, borderTop: "1px solid #e2e8f0", color: "#475569", fontSize: 14 },
};
