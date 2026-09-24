import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, ChevronDown, Send } from "lucide-react";

const helpCategories = [
  ["Searching for Apartments", [["How do I search for an apartment?", "Use Apartments in the tenant navigation to browse available listings and rooms."], ["How do I use filters?", "Use the search and filter controls to narrow listings by your preferred criteria."], ["How do I search by location?", "Enter or select your preferred area when searching for apartments."]]],
  ["Apartment Listings", [["How do I view apartment details?", "Select an apartment or room to view its full details, amenities, and availability."], ["How do I check the monthly rent?", "Monthly rental prices are shown on listing cards and details pages."], ["How do I check available amenities?", "Open the listing details to see amenities provided by the landlord."]]],
  ["Favorites", [["How do I save an apartment?", "Tap the heart icon on an apartment card or listing details page."], ["Where can I find my saved apartments?", "Open My Favorites from the tenant navigation to see saved apartments."], ["How do I remove an apartment from favorites?", "Tap the heart icon again from the listing or remove it from My Favorites."]]],
  ["Account", [["How do I create an account?", "Create an AptFindr account from the sign-up page and complete the required details."], ["How do I edit my profile?", "Open Settings from the tenant navigation to update available profile options."], ["How do I change my password?", "Use the password or security options in Settings to update your password."]]],
  ["Safety & Reporting", [["How do I report a suspicious listing?", "Open the listing and use Report a Problem to report suspicious or inaccurate information."], ["How can I identify a possible rental scam?", "Be cautious of requests for payment before viewing or unusual communication requests."], ["What should I check before renting?", "Review listing details, availability, amenities, and landlord information first."]]],
  ["Location", [["Why can't I see the apartment location?", "Some location details may be limited by the landlord or shown only in listing details."], ["How accurate is the location?", "Location information is supplied with the listing and may be approximate."], ["How do I get directions to an apartment?", "Use the map or address information shown in listing location details."]]],
];

export const HelpSupport = ({ supportSubmitted, setSupportSubmitted, supportForm, setSupportForm, handleSupportSubmit, isSubmittingSupport }) => {
  const [openTopic, setOpenTopic] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  return <div className="tenant-help-page">
    <header className="tenant-help-header"><h1 className="tenant-help-title">Help</h1><p className="tenant-help-subtitle">Search our help topics or browse the categories below.</p></header>
    <div className="tenant-help-category-grid" aria-label="Help topics">
      {helpCategories.map(([title, items], categoryIndex) => <div className="tenant-help-category" key={title}>
        <h2 className="tenant-help-category-title">{title}</h2><div className="tenant-help-topic-list">
          {items.map(([question, answer], itemIndex) => { const id = `${categoryIndex}-${itemIndex}`; const isOpen = openTopic === id; return <div className={`tenant-help-topic-item ${isOpen ? "tenant-help-topic-item-open" : ""}`} key={question}>
            <button type="button" className="tenant-help-topic-question" onClick={() => setOpenTopic(current => current === id ? null : id)} aria-expanded={isOpen}><span>{question}</span><ChevronDown className={`tenant-help-topic-chevron ${isOpen ? "tenant-help-topic-chevron-open" : ""}`} /></button>
            {isOpen && <div className="tenant-help-topic-answer"><p>{answer}</p></div>}
          </div>; })}
        </div>
      </div>)}
    </div>
    <div className="tenant-help-contact-cta"><div><h2>Still need help?</h2><p>Send us your concern and we'll assist you as soon as possible.</p></div><Button type="button" onClick={() => setSupportOpen(true)} className="tenant-help-contact-button">Contact Support</Button></div>
    <Dialog open={supportOpen} onOpenChange={setSupportOpen}><DialogContent className="tenant-help-dialog"><DialogHeader><DialogTitle>Send a Message</DialogTitle><DialogDescription>Fill out the form below and our support team will get back to you.</DialogDescription></DialogHeader>
      {supportSubmitted ? <div className="tenant-help-success"><CheckCircle className="tenant-help-success-icon"/><p className="tenant-help-success-title">Support request received</p><p className="tenant-help-success-text">Our team will review your concern and contact you using the details provided.</p><Button type="button" onClick={() => setSupportSubmitted(false)}>Send Another Request</Button></div> :
        <div className="tenant-help-support-content"><div className="tenant-help-field"><Label htmlFor="support-topic">Topic</Label><select id="support-topic" value={supportForm.topic} onChange={event => setSupportForm(current => ({ ...current, topic: event.target.value }))} className="tenant-help-select"><option value="">Choose a topic...</option><option value="Account or login">Account or login</option><option value="Search and filters">Search and filters</option><option value="Favorites">Favorites</option><option value="Contacting landlord">Contacting landlord</option><option value="Other">Other</option></select></div>
          <div className="tenant-help-field"><Label htmlFor="support-contact">Email or phone number</Label><Input id="support-contact" type="text" value={supportForm.contact} onChange={event => setSupportForm(current => ({ ...current, contact: event.target.value }))} placeholder="Enter your email or phone number"/></div>
          <div className="tenant-help-field"><div className="tenant-help-message-header"><Label htmlFor="support-message">Message</Label><span>{supportForm.message.length}/500</span></div><textarea id="support-message" rows={5} maxLength={500} value={supportForm.message} onChange={event => setSupportForm(current => ({ ...current, message: event.target.value }))} placeholder="Tell us more about your concern..." className="tenant-help-textarea"/></div>
          <div className="tenant-help-dialog-actions"><Button type="button" variant="outline" onClick={() => setSupportOpen(false)} disabled={isSubmittingSupport}>Cancel</Button><Button type="button" onClick={() => void handleSupportSubmit()} disabled={isSubmittingSupport} className="tenant-help-submit"><Send/>{isSubmittingSupport ? "Sending..." : "Send Message"}</Button></div>
        </div>}
    </DialogContent></Dialog>
  </div>;
};
