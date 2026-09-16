import "./LandlordHelpSupport.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Building2, CheckCircle2, ChevronRight, HelpCircle, ListPlus, MessageSquare, Send, Settings, ShieldCheck } from "lucide-react";
export const LandlordHelpSupport = ({ navigate, setSettingsTab, supportSubmitted, setSupportSubmitted, supportForm, setSupportForm, handleSupportSubmit, isSubmittingSupport, }) => (<div className="help-section-container">
    <header className="help-section-header">
      <div className="help-section-row">
        <span className="help-section-grid"><HelpCircle className="help-section-help-circle-icon"/></span>
        <div><p className="help-section-help-amp-support">Help &amp; Support</p><h1 className="help-section-landlord-support-center">Landlord Support Center</h1><p className="help-section-text">Get help managing listings, verification, and tenant inquiries.</p></div>
      </div>
    </header>

    <div className="help-section-grid-2">
      {[
        { icon: ListPlus, title: "Add a Property", desc: "Create a listing with photos, rent, rooms, and location.", action: () => navigate("/add-apartment"), tone: "landlord-tone-brand" },
        { icon: Building2, title: "Manage Listings", desc: "Review your posted properties and listing performance.", action: () => navigate("/dashboard?section=overview"), tone: "landlord-tone-brand" },
        { icon: Settings, title: "Business Settings", desc: "Update permit details, rental policies, and visibility.", action: () => { setSettingsTab("business"); navigate("/dashboard?section=settings"); }, tone: "landlord-tone-brand" },
    ].map(({ icon: Icon, title, desc, action, tone }) => (<button key={title} onClick={action} className="help-section-button">
          <span className={`help-section-grid-3 ${tone}`}><Icon className="help-section-icon-icon"/></span>
          <span className="help-section-span"><strong className="help-section-strong">{title}</strong><span className="help-section-span-2">{desc}</span></span>
          <ChevronRight className="help-section-chevron-right-icon"/>
        </button>))}
    </div>

    <div className="help-section-grid-4">
      <Card className="help-section-card">
        <CardHeader>
          <CardTitle className="help-section-listing-guide">
            <BookOpen className="help-section-book-open-icon"/>
            Listing Guide
          </CardTitle>
          <CardDescription>What landlords should put in each listing.</CardDescription>
        </CardHeader>
        <CardContent className="help-section-card-content">
          {[
        ["Complete listing details", "Add rent, address, amenities, bedroom count, available date, and clear house rules."],
        ["Use real photos", "Upload accurate photos of the room, bathroom, kitchen, entrance, and shared areas."],
        ["Keep availability updated", "Mark units or rooms occupied as soon as they are no longer available."],
        ["Set clear policies", "Use Business settings for deposit, advance payment, lease term, pet, smoking, and maintenance terms."],
    ].map(([title, desc]) => (<div key={title} className="help-section-card-2">
              <p className="help-section-text-2">{title}</p>
              <p className="help-section-text-3">{desc}</p>
            </div>))}
        </CardContent>
      </Card>

      <Card className="help-section-card">
        <CardHeader>
          <CardTitle className="help-section-verification-tenant-safety">
            <ShieldCheck className="help-section-shield-check-icon"/>
            Verification & Tenant Safety
          </CardTitle>
          <CardDescription>Keep listings trustworthy and easy to review.</CardDescription>
        </CardHeader>
        <CardContent className="help-section-card-content">
          {[
        ["Permit verification", "Make sure your permit number and expiry date are current in Business settings."],
        ["Respond clearly", "Confirm rent inclusions, deposit requirements, viewing schedule, and move-in rules before visits."],
        ["Avoid misleading details", "Do not post outdated prices, unavailable rooms, or photos from a different unit."],
        ["Handle reports", "If a listing receives a report, review the details and update incorrect information quickly."],
    ].map(([title, desc]) => (<div key={title} className="help-section-card-3">
              <CheckCircle2 className="help-section-check-circle2-icon"/>
              <div>
                <p className="help-section-text-2">{title}</p>
                <p className="help-section-text-3">{desc}</p>
              </div>
            </div>))}
        </CardContent>
      </Card>
    </div>

    <Card className="help-section-card">
      <CardHeader>
        <CardTitle className="help-section-contact-support">
          <MessageSquare className="help-section-message-square-icon"/>
          Contact Support
        </CardTitle>
        <CardDescription>Your request uses the contact email associated with your landlord profile.</CardDescription>
      </CardHeader>
      <CardContent className="help-section-card-content-2">
        {supportSubmitted ? (<div className="help-section-card-4">
            <CheckCircle2 className="help-section-check-circle2-icon-2"/>
            <p className="help-section-support-request-received">Support request received</p>
            <p className="help-section-text-4">Our team will review your concern and contact you using the details provided.</p>
            <Button onClick={() => setSupportSubmitted(false)} className="help-section-send-another-request">
              Send Another Request
            </Button>
          </div>) : (<>
            <div className="help-section-grid-5">
              <div className="help-section-panel">
                <Label className="help-section-topic">Topic</Label>
                <select value={supportForm.topic} onChange={(e) => setSupportForm((f) => ({ ...f, topic: e.target.value }))} className="help-section-select">
                  <option value="">Choose a topic...</option>
                  <option value="Listing setup">Listing setup</option>
                  <option value="Verification">Verification</option>
                  <option value="Property visibility">Property visibility</option>
                  <option value="Tenant inquiry issue">Tenant inquiry issue</option>
                  <option value="Account or login">Account or login</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="help-section-panel">
                <Label className="help-section-contact-email">Contact Email</Label>
                <Input value={supportForm.contact} onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))} placeholder="your@email.com" className="help-section-input"/>
              </div>
            </div>
            <div className="help-section-panel">
              <div className="help-section-row-2">
                <Label className="help-section-message">Message</Label>
                <span className="help-section-500">{supportForm.message.length}/500</span>
              </div>
              <textarea rows={4} maxLength={500} value={supportForm.message} onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))} placeholder="Tell us what happened or what you need help with..." className="help-section-textarea"/>
            </div>
            <Button onClick={() => void handleSupportSubmit()} disabled={isSubmittingSupport} className="help-section-button-2">
              <Send className="help-section-send-icon"/>
              {isSubmittingSupport ? "Sending..." : "Send Support Request"}
            </Button>
          </>)}
      </CardContent>
    </Card>
  </div>);
