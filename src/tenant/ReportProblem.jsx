import { EvidenceUploader } from "@/components/EvidenceUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, CheckCircle, Image as ImageIcon, LockKeyhole, Mail, MessageCircle, RotateCcw, Send, Shield } from "lucide-react";
export const ReportProblem = ({ reportSubmitted, resetReport, reportForm, setReportForm, publishedApartments, reportEvidenceFiles, setReportEvidenceFiles, user, handleReportSubmit, isSubmittingReport, }) => (<div className="report-page">
    <header className="report-hero">
      <div className="report-section-panel">
        <h2 className="report-section-report-a-problem">Report a Problem</h2>
        <p className="report-section-text">Tell us about inaccurate or problematic apartment listing information.</p>
      </div>
    </header>

    {reportSubmitted ? (<Card className="report-success">
        <CardContent className="report-section-content">
          <div className="report-section-row">
            <CheckCircle className="report-section-check-circle-icon"/>
          </div>
          <h3 className="report-section-report-submitted">Report Submitted</h3>
          <p className="report-section-text-2">
            Thank you for helping us keep listings accurate. You will receive a notification after an administrator completes the review.
          </p>
          <Button onClick={resetReport} className="report-section-submit-another-report">
            Submit Another Report
          </Button>
        </CardContent>
      </Card>) : (<Card className="report-form">
        <CardContent className="report-section-card-content">
          <ReportStep icon={Building2} step="1" title="Select Apartment" description="Choose the apartment listing related to your report." tone="tenant-tone-brand">
            <select value={reportForm.apartment} onChange={(e) => setReportForm((f) => ({ ...f, apartment: e.target.value }))} className="report-section-select">
              <option value="">Select an apartment...</option>
              {publishedApartments.map((apt) => <option key={apt.id} value={apt.id}>{apt.title}</option>)}
            </select>
          </ReportStep>

          <ReportStep icon={MessageCircle} step="2" title="Describe the Problem" description="Please provide as much detail as possible." tone="tenant-tone-brand">
            <div className="report-section-panel-3">
              <textarea rows={5} maxLength={500} value={reportForm.details} onChange={(e) => setReportForm((f) => ({ ...f, details: e.target.value }))} placeholder="Describe what you experienced in as much detail as possible..." className="report-section-textarea"/>
              <span className="report-section-500">{reportForm.details.length}/500</span>
            </div>
          </ReportStep>

          <ReportStep icon={ImageIcon} step="3" title="Upload Image / Evidence" description="Attach at least one image or document for admin review." note="Required" tone="tenant-tone-brand">
            <EvidenceUploader evidenceFiles={reportEvidenceFiles} onEvidenceChange={setReportEvidenceFiles} maxFiles={5} maxFileSize={10} required/>
            <div className="report-section-card">
              <Shield className="report-section-shield-icon"/>
              <div>
                <p className="report-section-text-3">Evidence helps us review your report faster.</p>
                <p className="report-section-text-4">Clear screenshots, photos, or documents are very helpful.</p>
              </div>
            </div>
          </ReportStep>

          <ReportStep icon={Mail} step="4" title="Contact Information" description="We may contact you for more details if needed." tone="tenant-tone-brand">
            <div className="report-section-panel-3">
              <Mail className="report-section-mail-icon"/>
              <input type="text" value={reportForm.contact} onChange={(e) => setReportForm((f) => ({ ...f, contact: e.target.value }))} placeholder={user?.email || "Enter your email address"} className="report-section-input"/>
            </div>
          </ReportStep>

          <div className="report-section-grid">
            <Button variant="outline" onClick={resetReport} className="report-section-clear-form">
              <RotateCcw className="report-section-rotate-ccw-icon"/>
              Clear Form
            </Button>
            <div className="report-section-row-2">
              <span className="report-section-row-3"><LockKeyhole className="report-section-lock-keyhole-icon"/></span>
              <span><strong className="report-section-your-information-is-secure">Your information is secure.</strong> We only use this information for this report.</span>
            </div>
            <Button onClick={() => void handleReportSubmit()} disabled={isSubmittingReport || !reportForm.apartment || !reportForm.details.trim() || reportEvidenceFiles.length === 0} className="report-section-button">
              <Send className="report-section-send-icon"/>
              {isSubmittingReport ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </CardContent>
      </Card>)}
  </div>);
export function ReportStep({ icon: Icon, step, title, description, note, tone, children, }) {
    return (<section className="report-step">
    <div className="report-step-row">
      <div className={`report-step-row-2 ${tone}`}>
        <Icon className="report-step-icon-icon"/>
      </div>
      <div className="report-step-panel">
        <div className="report-step-row-3">
          <span className="report-step-row-4">{step}</span>
          <h3 className="report-step-heading">{title}</h3>
          {note && <span className="report-step-span">{note}</span>}
        </div>
        <p className="report-step-text">{description}</p>
      </div>
    </div>
    <div className="report-step-panel">{children}</div>
  </section>);
}
