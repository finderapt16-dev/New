import { AlertTriangle, ChevronLeft, ChevronRight, Eye, FileText, Upload, X, } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
const ALLOWED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOCUMENT_FORMATS = ["application/pdf"];
const ALLOWED_FORMATS = [...ALLOWED_IMAGE_FORMATS, ...ALLOWED_DOCUMENT_FORMATS];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const FORMAT_LABELS = {
    "image/jpeg": "JPEG Image",
    "image/png": "PNG Image",
    "image/webp": "WebP Image",
    "application/pdf": "PDF Document",
};
const validateFile = (file, maxFileSize) => {
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSize) {
        return `File is too large (${fileSizeInMB.toFixed(1)}MB). Maximum is ${maxFileSize}MB.`;
    }
    // Check MIME type
    if (!ALLOWED_FORMATS.includes(file.type)) {
        return `File format not supported. Accepted: JPG, PNG, WebP, PDF`;
    }
    // Check extension
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return `File extension not allowed. Use: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    return null;
};
const getFileTypeCategory = (mimeType) => {
    if (ALLOWED_IMAGE_FORMATS.includes(mimeType)) {
        return "image";
    }
    return "document";
};
export function EvidenceUploader({ evidenceFiles, onEvidenceChange, maxFiles = 5, maxFileSize = 10, required = true, }) {
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const [previewImageId, setPreviewImageId] = useState(null);
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
    const remainingSlots = maxFiles - evidenceFiles.length;
    // Get preview URL for current image
    const currentPreviewUrl = useMemo(() => {
        if (!previewImageId)
            return null;
        const file = evidenceFiles.find((f) => f.id === previewImageId);
        return file?.preview;
    }, [previewImageId, evidenceFiles]);
    // Get images only for carousel
    const imageFiles = useMemo(() => evidenceFiles.filter((f) => f.fileType === "image"), [evidenceFiles]);
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer.files);
        addFilesToState(files);
    };
    const handleFileInputChange = (e) => {
        const files = Array.from(e.currentTarget.files || []);
        addFilesToState(files);
    };
    const addFilesToState = (files) => {
        if (evidenceFiles.length >= maxFiles) {
            toast.error(`Maximum ${maxFiles} files allowed`);
            return;
        }
        const validFiles = [];
        for (const file of files) {
            if (evidenceFiles.length + validFiles.length >= maxFiles) {
                toast.warning(`Added ${validFiles.length} files. Maximum ${maxFiles} reached.`);
                break;
            }
            const error = validateFile(file, maxFileSize);
            if (error) {
                toast.error(`${file.name}: ${error}`);
                continue;
            }
            const fileId = `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const fileType = getFileTypeCategory(file.type);
            const mimeType = file.type;
            // Create preview for images
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = event.target?.result;
                    onEvidenceChange([
                        ...evidenceFiles,
                        {
                            id: fileId,
                            file,
                            fileName: file.name,
                            fileType,
                            mimeType,
                            fileSize: file.size,
                            preview,
                            uploadedAt: new Date(),
                        },
                    ]);
                };
                reader.readAsDataURL(file);
            }
            else {
                validFiles.push({
                    id: fileId,
                    file,
                    fileName: file.name,
                    fileType,
                    mimeType,
                    fileSize: file.size,
                    uploadedAt: new Date(),
                });
            }
        }
        if (validFiles.length > 0) {
            onEvidenceChange([...evidenceFiles, ...validFiles]);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    const removeFile = (id) => {
        const updated = evidenceFiles.filter((f) => f.id !== id);
        onEvidenceChange(updated);
        if (previewImageId === id) {
            setPreviewImageId(null);
        }
    };
    const previousImage = () => {
        if (imageFiles.length === 0)
            return;
        const prevIndex = currentPreviewIndex === 0 ? imageFiles.length - 1 : currentPreviewIndex - 1;
        setCurrentPreviewIndex(prevIndex);
        setPreviewImageId(imageFiles[prevIndex].id);
    };
    const nextImage = () => {
        if (imageFiles.length === 0)
            return;
        const nextIndex = (currentPreviewIndex + 1) % imageFiles.length;
        setCurrentPreviewIndex(nextIndex);
        setPreviewImageId(imageFiles[nextIndex].id);
    };
    const goToImage = (id) => {
        setPreviewImageId(id);
        const index = imageFiles.findIndex((f) => f.id === id);
        setCurrentPreviewIndex(index);
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };
    return (<div className="evidence-uploader-style-1">
      {required && <div className="evidence-uploader-style-2">
        <AlertTriangle className="evidence-uploader-style-3"/>
        <div>
          <p className="evidence-uploader-style-4">Evidence required</p>
          <p className="evidence-uploader-style-5">
            Upload at least one image, screenshot, or document to support this report.
          </p>
        </div>
      </div>}

      {remainingSlots > 0 && (<div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`evidence-dropzone ${dragActive ? "evidence-dropzone-active" : "evidence-dropzone-idle"}`}>
          <input ref={fileInputRef} type="file" multiple accept={ALLOWED_EXTENSIONS.join(",")} onChange={handleFileInputChange} className="evidence-uploader-style-6"/>

          <div className="evidence-uploader-style-7 evidence-uploader-column">
            <div className="evidence-uploader-style-8">
              <Upload className="evidence-uploader-style-9"/>
            </div>
            <div>
              <p className="evidence-uploader-style-10">
                Drag and drop files here or click to browse
              </p>
              <p className="evidence-uploader-style-11">
                JPG, PNG, WebP, PDF • Max {maxFileSize}MB each • {remainingSlots} slot{remainingSlots !== 1 ? "s" : ""} remaining
              </p>
            </div>
          </div>
        </div>)}

      {imageFiles.length > 0 && (<div className="evidence-uploader-style-12">
          {previewImageId && currentPreviewUrl && (<div className="evidence-uploader-style-13">
              <img src={currentPreviewUrl} alt="Evidence preview" className="evidence-uploader-style-14"/>
              {imageFiles.length > 1 && (<>
                  <Button size="icon" variant="ghost" onClick={previousImage} className="evidence-uploader-style-15 evidence-uploader-center-y">
                    <ChevronLeft className="evidence-uploader-style-16"/>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={nextImage} className="evidence-uploader-style-17 evidence-uploader-center-y">
                    <ChevronRight className="evidence-uploader-style-18"/>
                  </Button>
                  <div className="evidence-uploader-style-19 evidence-uploader-center-x">
                    {imageFiles.findIndex((f) => f.id === previewImageId) + 1} / {imageFiles.length}
                  </div>
                </>)}
            </div>)}

          <div className="evidence-uploader-style-20 evidence-uploader-thumbnail-grid">
            {imageFiles.map((file) => (<div key={file.id} onClick={() => goToImage(file.id)} className={`evidence-thumbnail ${previewImageId === file.id ? "evidence-thumbnail-active" : "evidence-thumbnail-idle"}`}>
                <img src={file.preview} alt={file.fileName} className="evidence-uploader-style-21"/>
              </div>))}
          </div>
        </div>)}

      {evidenceFiles.length > 0 && (<div className="evidence-uploader-style-22">
          <div className="evidence-uploader-style-23">
            Attached Evidence ({evidenceFiles.length}/{maxFiles})
          </div>
          <div className="evidence-uploader-style-24">
            {evidenceFiles.map((file) => (<Card key={file.id} className="evidence-uploader-style-25">
                <div className="evidence-uploader-style-26 evidence-uploader-grow">
                  {file.fileType === "image" ? (<img src={file.preview} alt={file.fileName} className="evidence-uploader-style-27 evidence-uploader-no-shrink"/>) : (<div className="evidence-uploader-style-28 evidence-uploader-no-shrink">
                      <FileText className="evidence-uploader-style-29"/>
                    </div>)}
                  <div className="evidence-uploader-file-copy">
                    <p className="evidence-uploader-style-30">
                      {file.fileName}
                    </p>
                    <p className="evidence-uploader-style-31">
                      {FORMAT_LABELS[file.mimeType] || file.mimeType} • {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="evidence-uploader-style-32 evidence-uploader-no-shrink">
                  {file.fileType === "image" && (<Button size="icon" variant="ghost" onClick={() => goToImage(file.id)} className="evidence-uploader-style-33">
                      <Eye className="evidence-uploader-style-34"/>
                    </Button>)}
                  <Button size="icon" variant="ghost" onClick={() => removeFile(file.id)} className="evidence-uploader-style-35">
                    <X className="evidence-uploader-style-36"/>
                  </Button>
                </div>
              </Card>))}
          </div>
        </div>)}

      {required && evidenceFiles.length === 0 && (<div className="evidence-uploader-style-37">
          ⚠ At least one file is required to submit this report
        </div>)}
    </div>);
}
