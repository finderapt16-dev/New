import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
export function NotFound() {
    const navigate = useNavigate();
    return (<div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <p className="not-found-message">Page not found</p>
        <Button onClick={() => navigate("/")}>
          <Home className="not-found-icon"/>
          Back to Home
        </Button>
      </div>
    </div>);
}
