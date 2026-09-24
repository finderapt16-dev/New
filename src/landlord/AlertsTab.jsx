import "./AlertsTab.css";
import { Button } from "@/components/ui/button";
import { AlertRow } from "@/landlord/AlertRow";
import { SettingsField as Field, SettingsSectionTitle as SectionTitle, SettingsInput, SettingsSelect, SettingsToggle as Toggle } from "@/landlord/SettingsFormFields";
export const AlertsTab = ({ alerts, setA, handleSaveAlerts, }) => (<div className="alerts-tab-panel">
    <div className="alerts-tab-card">
      <SectionTitle title="Tenant Activity" subtitle="In-app reminders when tenants interact with your listings"/>
      <AlertRow label="Listing Added to Favorites" hint="A tenant saves your apartment to their Favorites." pushVal={alerts.reviewPush} onPush={(v) => setA("reviewPush", v)}/>
      <AlertRow label="Listing Appears in Recommended or Popular" hint="Your unit is being surfaced to tenants in their dashboard" pushVal={alerts.listingPush} onPush={(v) => setA("listingPush", v)}/>
    </div>

    <div className="alerts-tab-card">
      <SectionTitle title="Admin & Compliance" subtitle="Reports, violations, and notices from platform administrators"/>
      <AlertRow label="Report Filed Against Listing" hint="A tenant submits a report about your unit" pushVal={alerts.reportPush} onPush={(v) => setA("reportPush", v)}/>
      <AlertRow label="Violation / Notice Issued" hint="Admin issues a formal violation or notice" pushVal={alerts.violationPush} onPush={(v) => setA("violationPush", v)}/>
      <AlertRow label="Permit Verification Reminder" hint="30-day reminder before your business permit expires" pushVal={alerts.permitPush} onPush={(v) => setA("permitPush", v)}/>
    </div>

    <div className="alerts-tab-card">
      <SectionTitle title="System & Platform" subtitle="Account changes and platform announcements"/>
      <AlertRow label="Platform Announcements" hint="New features, policy updates, maintenance" pushVal={alerts.systemPush} onPush={(v) => setA("systemPush", v)}/>
    </div>

    <div className="alerts-tab-card-2">
      <SectionTitle title="Delivery Preferences" subtitle="Digest schedule and quiet hours"/>
      <Field label="Activity Digest" hint="Receive a summary instead of individual notifications">
        <SettingsSelect value={alerts.digest} onChange={(e) => setA("digest", e.target.value)}>
          <option value="realtime">Real-time (no digest)</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
        </SettingsSelect>
      </Field>
      <div className="alerts-tab-card-3">
        <div>
          <p className="alerts-tab-quiet-hours">Quiet Hours</p>
          <p className="alerts-tab-text">Pause push notifications during rest hours</p>
        </div>
        <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)}/>
      </div>
      {alerts.quietEnabled && (<div className="alerts-tab-grid">
          <Field label="Quiet From">
            <SettingsInput type="time" value={alerts.quietStart} onChange={(e) => setA("quietStart", e.target.value)}/>
          </Field>
          <Field label="Quiet Until">
            <SettingsInput type="time" value={alerts.quietEnd} onChange={(e) => setA("quietEnd", e.target.value)}/>
          </Field>
        </div>)}
    </div>

    <Button onClick={handleSaveAlerts} className="alerts-tab-save-alert-preferences">
      Save Alert Preferences
    </Button>
  </div>);
