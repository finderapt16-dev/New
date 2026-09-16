import "./LandlordSettings.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Building2, Settings, Shield, User } from "lucide-react";
export const LandlordSettings = ({ settingsTab, setSettingsTab, profileTab, alertsTab, businessTab, securityTab }) => {
    return (<div className="landlord-settings">
      <div className="settings-section-card">
        <div className="settings-section-row">
          <span className="settings-section-grid"><Settings className="settings-section-settings-icon"/></span>
          <div><h1 className="settings-section-settings">Settings</h1><p className="settings-section-text">Manage your account, preferences, business information, and security.</p></div>
        </div>
      </div>

      <Tabs value={settingsTab} onValueChange={setSettingsTab} className="settings-section-tabs">
        <TabsList className="settings-section-grid-2">
          <TabsTrigger value="profile" className="settings-section-profile">
            <User className="settings-section-user-icon"/> Profile
          </TabsTrigger>
          <TabsTrigger value="alerts" className="settings-section-alerts">
            <Bell className="settings-section-bell-icon"/> Alerts
          </TabsTrigger>
          <TabsTrigger value="business" className="settings-section-business">
            <Building2 className="settings-section-building2-icon"/> Business
          </TabsTrigger>
          <TabsTrigger value="security" className="settings-section-security">
            <Shield className="settings-section-shield-icon"/> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="settings-section-tabs-content">{profileTab}</TabsContent>
        <TabsContent value="alerts" className="settings-section-tabs-content">{alertsTab}</TabsContent>
        <TabsContent value="business" className="settings-section-tabs-content">{businessTab}</TabsContent>
        <TabsContent value="security" className="settings-section-tabs-content">{securityTab}</TabsContent>
      </Tabs>
    </div>);
};
