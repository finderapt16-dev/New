import { Button } from "@/components/ui/button";
export const EmptyState = ({ icon: Icon, message, actionLabel, action, }) => (<div className="empty-state-card">
    <span className="empty-state-row">
      <Icon className="empty-state-icon-icon"/>
    </span>
    <p className="empty-state-text">{message}</p>
    {actionLabel && action && (<Button onClick={action} className="empty-state-button">
        {actionLabel}
      </Button>)}
  </div>);
