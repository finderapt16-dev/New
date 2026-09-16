import "./NotificationDetailModal.css";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
export const NotificationDetailModal = ({ selectedNotificationDetail, getAppealMetadata, myApartments, landlordAppeals, setSelectedNotificationDetail, openAppealForNotification, }) => {
    const { notification, violation, appeal } = selectedNotificationDetail;
    const payload = notification.payload ?? {};
    const appealSource = appeal ? getAppealMetadata(appeal, "source") : undefined;
    const apartmentId = String(payload.apartment_id ?? violation?.apartment_id ?? appealSource?.apartment_id ?? "");
    const apartment = myApartments.find((item) => item.id === apartmentId);
    const apartmentTitle = String(payload.apartment_title ?? appealSource?.apartment_title ?? apartment?.title ?? "Apartment unavailable");
    const reportId = String(payload.report_id ?? payload.related_report_id ?? violation?.related_report_id ?? appeal?.report_id ?? "");
    const violationId = String(payload.violation_id ?? violation?.id ?? appeal?.violation_id ?? "");
    const existingAppeal = landlordAppeals.find((item) => {
        const source = getAppealMetadata(item, "source");
        return (reportId && item.report_id === reportId)
            || (violationId && item.violation_id === violationId)
            || (!reportId && !violationId && source?.notification_id === notification.id);
    });
    const canAppeal = notification.type !== "appeal_status_updated";
    const appealForAction = appeal ?? existingAppeal;
    const needsInformation = appealForAction?.status === "needs_information";
    return (<div className="notification-detail-modal-overlay" onClick={() => setSelectedNotificationDetail(null)}>
      <div className="notification-detail-modal-overlay-2"/>
      <div role="dialog" aria-modal="true" className="notification-detail-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="notification-detail-modal-row"><div><p className="notification-detail-modal-administrative-notification">Administrative notification</p><h2 className="notification-detail-modal-heading">{notification.title || "Admin message"}</h2></div><button onClick={() => setSelectedNotificationDetail(null)} className="notification-detail-modal-button"><X className="notification-detail-modal-x-icon"/></button></div>
        <div className="notification-detail-modal-panel">
          <div className="notification-detail-modal-grid">
            <div className="notification-detail-modal-panel-2"><p className="notification-detail-modal-apartment">Apartment</p><p className="notification-detail-modal-text">{apartmentTitle}</p></div>
            <div className="notification-detail-modal-panel-2"><p className="notification-detail-modal-date-received">Date received</p><p className="notification-detail-modal-text">{new Date(notification.created_at ?? notification.createdAt ?? Date.now()).toLocaleString("en-PH")}</p></div>
            <div className="notification-detail-modal-panel-2"><p className="notification-detail-modal-related-record">Related record</p><p className="notification-detail-modal-text-2">{violationId ? `${violation?.mode === "notice" ? "Notice" : "Violation"}: ${violationId}` : reportId ? `Report: ${reportId}` : `Message: ${notification.id ?? "Unavailable"}`}</p></div>
            <div className="notification-detail-modal-panel-2"><p className="notification-detail-modal-status">Status</p><p className="notification-detail-modal-text-3">{String(appeal?.status ?? existingAppeal?.status ?? payload.status ?? "open").replace(/_/g, " ")}</p></div>
          </div>
          <div><p className="notification-detail-modal-admin-message">Admin message</p><p className="notification-detail-modal-text-4">{String(appeal?.admin_response ?? payload.admin_response ?? notification.message ?? "No message provided.")}</p></div>
          {(appeal || existingAppeal) && <div className="notification-detail-modal-card-2"><p className="notification-detail-modal-appeal-status">Appeal status: {String((appeal || existingAppeal)?.status ?? "pending").replace(/_/g, " ")}</p>{(appeal || existingAppeal)?.admin_response && <p className="notification-detail-modal-text-5">{(appeal || existingAppeal)?.admin_response}</p>}</div>}
        </div>
        <div className="notification-detail-modal-content"><Button variant="outline" onClick={() => setSelectedNotificationDetail(null)} className="notification-detail-modal-close">Close</Button>{(canAppeal || needsInformation) && <Button disabled={Boolean(existingAppeal) && !needsInformation} onClick={() => openAppealForNotification({ ...selectedNotificationDetail, appeal: appealForAction ?? null })} className="notification-detail-modal-button-2"><MessageSquare className="notification-detail-modal-message-square-icon"/>{needsInformation ? "Provide Information" : existingAppeal ? "Appeal Submitted" : "Submit Appeal"}</Button>}</div>
      </div>
    </div>);
};
