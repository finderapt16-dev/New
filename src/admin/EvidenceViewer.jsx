import { ChevronLeft, ChevronRight, Download, Eye, FileText, Image as ImageIcon, } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
const FORMAT_LABELS = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "application/pdf": "PDF",
};
const FORMAT_ICONS = {
    image: ImageIcon,
    document: FileText,
    screenshot: ImageIcon,
};
export function EvidenceViewer({ evidence, title = "Supporting Evidence", onDownload, }) {
    const [previewImageId, setPreviewImageId] = useState(evidence.find((e) => e.fileType === "image")?.id || null);
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
    const imageEvidence = useMemo(() => evidence.filter((e) => e.fileType === "image"), [evidence]);
    if (evidence.length === 0) {
        return (<Card className="evidence-viewer-card">
        <ImageIcon className="evidence-viewer-image-icon-icon"/>
        <p className="evidence-viewer-no-evidence-attached">No evidence attached</p>
      </Card>);
    }
    const handlePreviousImage = () => {
        if (imageEvidence.length === 0)
            return;
        const prevIndex = currentPreviewIndex === 0 ? imageEvidence.length - 1 : currentPreviewIndex - 1;
        setCurrentPreviewIndex(prevIndex);
        setPreviewImageId(imageEvidence[prevIndex].id);
    };
    const handleNextImage = () => {
        if (imageEvidence.length === 0)
            return;
        const nextIndex = (currentPreviewIndex + 1) % imageEvidence.length;
        setCurrentPreviewIndex(nextIndex);
        setPreviewImageId(imageEvidence[nextIndex].id);
    };
    const goToImage = (id) => {
        setPreviewImageId(id);
        const index = imageEvidence.findIndex((e) => e.id === id);
        setCurrentPreviewIndex(index);
    };
    const handleDownload = (evidence) => {
        if (onDownload) {
            onDownload(evidence.fileUrl, evidence.fileName);
        }
        else {
            // Default download behavior
            const link = document.createElement("a");
            link.href = evidence.fileUrl;
            link.download = evidence.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    const currentPreviewEvidence = previewImageId
        ? evidence.find((e) => e.id === previewImageId)
        : null;
    const formatFileSize = (bytes) => {
        if (!bytes)
            return "Unknown size";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };
    return (<div className="evidence-viewer-panel">
      <div className="evidence-viewer-row">
        <h3 className="evidence-viewer-heading">
          <ImageIcon className="evidence-viewer-image-icon-icon-2"/>
          {title}
          <Badge variant="secondary" className="evidence-viewer-file">
            {evidence.length} file{evidence.length !== 1 ? "s" : ""}
          </Badge>
        </h3>
      </div>

      {imageEvidence.length > 0 && currentPreviewEvidence && (<div className="evidence-viewer-panel-2">
          <div className="evidence-viewer-card-2">
            <img src={currentPreviewEvidence.fileUrl} alt={currentPreviewEvidence.fileName} className="evidence-viewer-image"/>

            {imageEvidence.length > 1 && (<>
                <Button size="icon" variant="ghost" onClick={handlePreviousImage} className="evidence-viewer-button">
                  <ChevronLeft className="evidence-viewer-chevron-left-icon"/>
                </Button>
                <Button size="icon" variant="ghost" onClick={handleNextImage} className="evidence-viewer-button-2">
                  <ChevronRight className="evidence-viewer-chevron-right-icon"/>
                </Button>
                <div className="evidence-viewer-panel-3">
                  {currentPreviewIndex + 1} / {imageEvidence.length}
                </div>
              </>)}

            <Button size="icon" variant="ghost" onClick={() => handleDownload(currentPreviewEvidence)} className="evidence-viewer-button-3" title="Download image">
              <Download className="evidence-viewer-download-icon"/>
            </Button>
          </div>

          {imageEvidence.length > 1 && (<div className="evidence-viewer-grid">
              {imageEvidence.map((img) => (<button key={img.id} onClick={() => goToImage(img.id)} className={`evidence-viewer-button-4 ${previewImageId === img.id
                        ? "evidence-viewer-button-5"
                        : "evidence-viewer-button-6"}`}>
                  <img src={img.fileUrl} alt={img.fileName} className="evidence-viewer-image-2"/>
                </button>))}
            </div>)}
        </div>)}

      <div className="evidence-viewer-panel-4">
        <div className="evidence-viewer-all-evidence">
          All Evidence ({evidence.length})
        </div>
        <div className="evidence-viewer-panel-4">
          {evidence.map((item) => {
            const Icon = FORMAT_ICONS[item.fileType] || FileText;
            return (<Card key={item.id} className="evidence-viewer-row-2">
                <div className="evidence-viewer-row-3">
                  <div className={`evidence-viewer-row-4 ${item.fileType === "image"
                    ? "evidence-viewer-panel-5"
                    : "evidence-viewer-panel-6"}`}>
                    <Icon className="evidence-viewer-icon-icon"/>
                  </div>
                  <div className="evidence-viewer-panel-7">
                    <p className="evidence-viewer-text">
                      {item.fileName}
                    </p>
                    <div className="evidence-viewer-row-5">
                      <Badge variant="outline" className="evidence-viewer-badge">
                        {FORMAT_LABELS[item.mimeType] || item.mimeType}
                      </Badge>
                      <span className="evidence-viewer-span">
                        {formatFileSize(item.fileSize)}
                      </span>
                      {item.uploadedAt && (<span className="evidence-viewer-span-2">
                          {new Date(item.uploadedAt).toLocaleDateString()}
                        </span>)}
                    </div>
                  </div>
                </div>
                <div className="evidence-viewer-row-6">
                  {item.fileType === "image" && (<Button size="icon" variant="ghost" onClick={() => goToImage(item.id)} className="evidence-viewer-button-7" title="View image">
                      <Eye className="evidence-viewer-eye-icon"/>
                    </Button>)}
                  <Button size="icon" variant="ghost" onClick={() => handleDownload(item)} className="evidence-viewer-button-7" title="Download file">
                    <Download className="evidence-viewer-download-icon-2"/>
                  </Button>
                </div>
              </Card>);
        })}
        </div>
      </div>
    </div>);
}
