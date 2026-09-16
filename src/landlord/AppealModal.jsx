import "./AppealModal.css";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageSquare, X } from "lucide-react";
export const AppealModal = ({ closeAppealModal, appealModal, isSubmittingAppeal, appealMessage, setAppealMessage, appealContact, setAppealContact, appealEvidence, setAppealEvidence, handleSubmitAppeal, }) => (<div className="appeal-modal-overlay" onClick={closeAppealModal}>
    <div className="appeal-modal-overlay-2"/>
    <div className="appeal-modal-card" onClick={(e) => e.stopPropagation()}>
      <div className="appeal-modal-row">
        <div className="appeal-modal-row-2">
          <div className="appeal-modal-row-3">
            <MessageSquare className="appeal-modal-message-square-icon"/>
          </div>
          <div>
            <p className="appeal-modal-submit-appeal">Submit Appeal</p>
            <p className="appeal-modal-text">{appealModal.relatedLabel}</p>
          </div>
        </div>
        <button onClick={closeAppealModal} disabled={isSubmittingAppeal} className="appeal-modal-button">
          <X className="appeal-modal-x-icon"/>
        </button>
      </div>
      <div className="appeal-modal-panel">
        <div className="appeal-modal-grid">
          <div className="appeal-modal-panel-2"><p className="appeal-modal-related-apartment">Related apartment</p><p className="appeal-modal-text-2">{appealModal.apartmentTitle}</p></div>
          <div className="appeal-modal-panel-2"><p className="appeal-modal-related-record">Related record</p><p className="appeal-modal-text-3">{appealModal.relatedLabel}</p></div>
        </div>
        <div className="appeal-modal-panel-3">
          <div className="appeal-modal-row-4">
            <label className="appeal-modal-appeal-message-required">Appeal Message (required)</label>
            <span className="appeal-modal-500">{appealMessage.length}/500</span>
          </div>
          <textarea rows={4} maxLength={500} value={appealMessage} onChange={(e) => setAppealMessage(e.target.value)} placeholder="Explain your appeal and provide any supporting information…" className="appeal-modal-textarea"/>
        </div>

        <div className="appeal-modal-panel-3"><label className="appeal-modal-contact-information">Contact information</label><input type="email" value={appealContact} onChange={(event) => setAppealContact(event.target.value)} placeholder="Email address" className="appeal-modal-input"/></div>

        <div><p className="appeal-modal-supporting-evidence">Supporting evidence</p><EvidenceUploader evidenceFiles={appealEvidence} onEvidenceChange={setAppealEvidence} required={false} maxFiles={5} maxFileSize={10}/></div>

        <div className={"appeal-modal-card-2"}>
          <AlertTriangle className="appeal-modal-alert-triangle-icon"/>
          <p className="appeal-modal-text-4">
            Your appeal will be reviewed by an administrator. Please provide clear and detailed information.
          </p>
        </div>
      </div>
      <div className="appeal-modal-row-5">
        <Button disabled={isSubmittingAppeal} onClick={handleSubmitAppeal} className="appeal-modal-button-2">
          <MessageSquare className="appeal-modal-message-square-icon-2"/>
          {isSubmittingAppeal ? "Submitting..." : "Submit Appeal"}
        </Button>
        <Button variant="outline" onClick={closeAppealModal} disabled={isSubmittingAppeal} className="appeal-modal-cancel">
          Cancel
        </Button>
      </div>
    </div>
  </div>);
