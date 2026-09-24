import "./LandlordHelpSupport.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, ChevronDown, Send } from "lucide-react";

const helpCategories = [
  ["Listing Setup", [["How do I add a property?", "Use Add Property to enter the listing address, rent, amenities, house rules, and property photos."], ["How do I add or edit rooms?", "Open a property and select Manage Rooms to add rooms, update rent and capacity, or upload room photos."], ["Why is my listing not visible?", "A listing must be complete, published, and have at least one available room before tenants can see it."]]],
  ["Listing Management", [["How do I update availability?", "Open Manage Rooms and mark a room as occupied, available, or under maintenance."], ["How do I improve my listing?", "Use accurate photos, complete amenities, clear rent details, and current availability information."], ["Where can I see listing performance?", "Open Overview or Market Trends to review views, favorites, and listing activity."]]],
  ["Verification & Compliance", [["How do I update my permit details?", "Open Settings, then Business, to update your permit number and expiry information."], ["What happens when a report is filed?", "Review the notification, verify the listing details, and correct inaccurate information as soon as possible."], ["How do I avoid a violation?", "Keep prices, room availability, images, and property details accurate and follow the platform's listing policies."]]],
  ["Tenant Communication", [["How should I respond to inquiries?", "Confirm the rent, included utilities, viewing schedule, and move-in requirements clearly."], ["Can I contact tenants directly?", "Use the available contact details only for legitimate rental-related communication."], ["What should I do when a room is rented?", "Mark the room as occupied right away so tenants do not see outdated availability."]]],
  ["Account & Settings", [["How do I update my profile?", "Open Settings, then Profile, to update your name, mobile number, photo, and business details."], ["How do I change alert preferences?", "Open Settings, then Alerts, to manage notifications, digest delivery, and quiet hours."], ["How do I secure my account?", "Open Settings, then Security, to update your password and security preferences."]]],
  ["Safety", [["How can I keep my listing trustworthy?", "Use photos of the actual property, provide clear rules, and never post unavailable rooms as open."], ["What should I do with suspicious activity?", "Send a support request with the property details and any relevant information."], ["How are reports handled?", "Reports are reviewed by the platform team and may require you to clarify or update listing information."]]],
];

export const LandlordHelpSupport = ({ supportSubmitted, setSupportSubmitted, supportForm, setSupportForm, handleSupportSubmit, isSubmittingSupport }) => {
  const [openTopic, setOpenTopic] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  return <div className="landlord-help-page">
    <header className="landlord-help-header"><h1 className="landlord-help-title">Help &amp; Support</h1><p className="landlord-help-subtitle">Find guidance for managing listings, rooms, verification, and tenant activity.</p></header>
    <div className="landlord-help-category-grid" aria-label="Landlord help topics">
      {helpCategories.map(([title, items], categoryIndex) => <div className="landlord-help-category" key={title}>
        <h2 className="landlord-help-category-title">{title}</h2><div className="landlord-help-topic-list">
          {items.map(([question, answer], itemIndex) => { const id = `${categoryIndex}-${itemIndex}`; const isOpen = openTopic === id; return <div className={`landlord-help-topic-item ${isOpen ? "landlord-help-topic-item-open" : ""}`} key={question}>
            <button type="button" className="landlord-help-topic-question" onClick={() => setOpenTopic(current => current === id ? null : id)} aria-expanded={isOpen}><span>{question}</span><ChevronDown className={`landlord-help-topic-chevron ${isOpen ? "landlord-help-topic-chevron-open" : ""}`}/></button>
            {isOpen && <div className="landlord-help-topic-answer"><p>{answer}</p></div>}
          </div>; })}
        </div>
      </div>)}
    </div>
    <div className="landlord-help-contact-cta"><div><h2>Still need help?</h2><p>Send us your landlord concern and our support team will assist you.</p></div><Button type="button" onClick={() => setSupportOpen(true)} className="landlord-help-contact-button">Contact Support</Button></div>
    <Dialog open={supportOpen} onOpenChange={setSupportOpen}><DialogContent className="landlord-help-dialog"><DialogHeader><DialogTitle>Send a Support Request</DialogTitle><DialogDescription>Share your landlord concern and our team will get back to you.</DialogDescription></DialogHeader>
      {supportSubmitted ? <div className="landlord-help-success"><CheckCircle className="landlord-help-success-icon"/><p className="landlord-help-success-title">Support request received</p><p className="landlord-help-success-text">Our team will review your concern and contact you using the details provided.</p><Button type="button" onClick={() => setSupportSubmitted(false)}>Send Another Request</Button></div> :
        <div className="landlord-help-support-content"><div className="landlord-help-field"><Label htmlFor="landlord-support-topic">Topic</Label><select id="landlord-support-topic" value={supportForm.topic} onChange={event => setSupportForm(current => ({ ...current, topic: event.target.value }))} className="landlord-help-select"><option value="">Choose a topic...</option><option value="Listing setup">Listing setup</option><option value="Room management">Room management</option><option value="Verification or compliance">Verification or compliance</option><option value="Tenant inquiry issue">Tenant inquiry issue</option><option value="Account or login">Account or login</option><option value="Other">Other</option></select></div>
          <div className="landlord-help-field"><Label htmlFor="landlord-support-contact">Email or phone number</Label><Input id="landlord-support-contact" type="text" value={supportForm.contact} onChange={event => setSupportForm(current => ({ ...current, contact: event.target.value }))} placeholder="Enter your email or phone number"/></div>
          <div className="landlord-help-field"><div className="landlord-help-message-header"><Label htmlFor="landlord-support-message">Message</Label><span>{supportForm.message.length}/500</span></div><textarea id="landlord-support-message" rows={5} maxLength={500} value={supportForm.message} onChange={event => setSupportForm(current => ({ ...current, message: event.target.value }))} placeholder="Tell us more about your concern..." className="landlord-help-textarea"/></div>
          <div className="landlord-help-dialog-actions"><Button type="button" variant="outline" onClick={() => setSupportOpen(false)} disabled={isSubmittingSupport}>Cancel</Button><Button type="button" onClick={() => void handleSupportSubmit()} disabled={isSubmittingSupport} className="landlord-help-submit"><Send/>{isSubmittingSupport ? "Sending..." : "Send Message"}</Button></div>
        </div>}
    </DialogContent></Dialog>
  </div>;
};
