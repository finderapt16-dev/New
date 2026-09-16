import { useLocation, useOutlet } from "react-router-dom";
import { Toaster } from "./ui/sonner";
import { ApartmentsProvider } from "../contexts/ApartmentsContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "@/services/supabaseClient";
import { useEffect, useState } from "react";
function RootContent() {
    const location = useLocation();
    const outlet = useOutlet();
    const { user } = useAuth();
    const [maintenance, setMaintenance] = useState(null);
    useEffect(() => {
        if (!user) {
            setMaintenance(null);
            return;
        }
        const load = () => void supabase.from("platform_status").select("status,title,message,expected_end_at").eq("id", true).maybeSingle().then(({ data }) => setMaintenance(data));
        load();
        const channel = supabase.channel("platform-maintenance-gate").on("postgres_changes", { event: "*", schema: "public", table: "platform_status" }, load).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [user?.id]);
    return (<div className="app-root">
      {(<div className="app-root-ambient">
          <div className="app-root-orb app-root-orb-top"/>
          <div className="app-root-orb app-root-orb-bottom"/>
        </div>)}
      <main key={`${location.pathname}${location.search}`}>
        {maintenance?.status === "maintenance" ? <div className="maintenance-page"><section className="maintenance-card"><div className="maintenance-icon">🛠</div><h1 className="maintenance-title">{maintenance.title || "AptFindr is temporarily under maintenance"}</h1><p className="maintenance-message">{maintenance.message || "We're performing system updates to improve platform reliability. Please try again later."}</p>{maintenance.expected_end_at && <p className="maintenance-time">Expected availability: {new Date(maintenance.expected_end_at).toLocaleString("en-PH")}</p>}</section></div> : outlet}
      </main>
      <Toaster />
    </div>);
}
export function Root() {
    return (<ApartmentsProvider>
      <RootContent />
    </ApartmentsProvider>);
}
