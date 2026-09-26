import "./AdminDocumentReview.css";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fetchApartmentInspectionDetails } from "@/services/apartmentsService";
import "./admin-theme.css";
import { fetchUserById } from "@/services/dashboardSupabaseService";
import { fetchApartmentVerificationDocuments, VERIFICATION_DOCUMENT_TYPES } from "@/services/verificationDocumentsService";

const textValue = (value, fallback = "Not provided") => typeof value === "string" && value.trim() ? value : fallback;

export function AdminDocumentReview() {
  const { id: apartmentId, documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [document, setDocument] = useState(null);
  const [apartment, setApartment] = useState(null);
  const [landlord, setLandlord] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const returnTo = location.state?.returnTo || `/admin/apartment/${apartmentId}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!apartmentId || !documentId) return;
      setLoading(true);
      try {
        const [details, documents] = await Promise.all([
          fetchApartmentInspectionDetails(apartmentId),
          fetchApartmentVerificationDocuments(apartmentId),
        ]);
        const loadedApartment = details?.apartment ?? null;
        const selectedDocument = documents.find((item) => item.id === documentId) ?? null;
        const loadedLandlord = loadedApartment?.landlordId ? await fetchUserById(loadedApartment.landlordId) : null;
        if (!active) return;
        setApartment(loadedApartment);
        setDocument(selectedDocument);
        setLandlord(loadedLandlord);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [apartmentId, documentId]);

  const documentLabel = useMemo(() => VERIFICATION_DOCUMENT_TYPES.find((item) => item.key === document?.documentType)?.label || "Verification Document", [document?.documentType]);
  const verification = apartment?.features?.verification && typeof apartment.features.verification === "object" ? apartment.features.verification : {};
  const isPdf = document?.mimeType === "application/pdf";

  if (!loading && !document) {
    return <main className="admin-document-page admin-document-page-empty"><h1>Document not found</h1><Button onClick={() => navigate(returnTo)}>Back to Review</Button></main>;
  }

  return <main className="admin-document-page">
    <header className="admin-document-header">
      <button type="button" onClick={() => navigate(returnTo)}><ArrowLeft /> Back to Review</button>
      <div><h1>{documentLabel}</h1><p>Submitted verification document</p></div>
      <span aria-hidden="true" />
    </header>

    <div className="admin-document-layout">
      <section className="admin-document-preview-card">
        <div className="admin-document-toolbar"><span>{isPdf ? "Page 1 of 1" : "Image preview"}</span><div><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(70, value - 10))}><Minus /></button><span>{zoom}%</span><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(150, value + 10))}><Plus /></button></div></div>
        <div className="admin-document-stage">
          {loading ? <span>Loading document...</span> : isPdf ? <iframe title={documentLabel} src={document.previewUrl} style={{ transform: `scale(${zoom / 100})` }} /> : <img src={document.previewUrl} alt={documentLabel} style={{ transform: `scale(${zoom / 100})` }} />}
        </div>
      </section>

      <aside className="admin-document-details">
        <section><h2>Document Details</h2><p>Information submitted by the landlord.</p><dl><div><dt>Document Type</dt><dd>{documentLabel}</dd></div><div><dt>Permit Number</dt><dd>{textValue(verification.businessPermit)}</dd></div><div><dt>Date Submitted</dt><dd>{document?.createdAt ? new Date(document.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "Not provided"}</dd></div><div><dt>File Name</dt><dd>{document?.fileName}</dd></div></dl></section>
        <section><h3>Submitted By</h3><div className="admin-document-person"><span>{landlord?.name?.[0]?.toUpperCase() || "L"}</span><div><strong>{landlord?.name || "Landlord"}</strong><small>{landlord?.email || "Property landlord"}</small></div></div></section>
        <section><h3>Review Status</h3><span className="admin-document-status">Document Submitted</span><p>Confirm that this document matches the details of {apartment?.title || "the submitted property"}.</p></section>
        <Button variant="outline" onClick={() => navigate(returnTo)}>Return to Landlord Review</Button>
      </aside>
    </div>
  </main>;
}
