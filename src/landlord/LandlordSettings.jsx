import "./LandlordSettings.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const LandlordSettings = ({ settingsTab, setSettingsTab, profileTab, alertsTab, businessTab, securityTab }) => {
    return (<div className="landlord-settings">
      <div className="settings-section-card">
        <div className="settings-section-row">
          <div><h1 className="settings-section-settings">Settings</h1><p className="settings-section-text">Manage your account, preferences, business information, and security.</p></div>
        </div>
      </div>

      <Tabs value={settingsTab} onValueChange={setSettingsTab} className="settings-section-tabs">
        <TabsList className="settings-section-grid-2">
          <TabsTrigger value="profile" className="settings-section-profile">
            Profile
          </TabsTrigger>
          <TabsTrigger value="alerts" className="settings-section-alerts">
            Alerts
          </TabsTrigger>
          <TabsTrigger value="business" className="settings-section-business">
            Business
          </TabsTrigger>
          <TabsTrigger value="security" className="settings-section-security">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="settings-section-tabs-content">{profileTab}</TabsContent>
        <TabsContent value="alerts" className="settings-section-tabs-content">{alertsTab}</TabsContent>
        <TabsContent value="business" className="settings-section-tabs-content">{businessTab}</TabsContent>
        <TabsContent value="security" className="settings-section-tabs-content">{securityTab}</TabsContent>
      </Tabs>
    </div>);
};
