import { Camera, ChevronLeft, ChevronRight, Image as ImageIcon, Star, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const VALID_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const FORMAT_EXTENSIONS = { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"] };

export function MultiImageUploader({ images, onImagesChange, maxImages = 10, maxFileSize = 5, allowedFormats = VALID_FORMATS, uploadProgress = null, disabled = false, compact = false }) {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const mountedRef = useRef(true);
    const previewUrlsRef = useRef(new Set());
    const imagesRef = useRef(images);
    imagesRef.current = images;
    const [isDragging, setIsDragging] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [draggedImageId, setDraggedImageId] = useState(null);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
            previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            previewUrlsRef.current.clear();
        };
    }, []);
    useEffect(() => {
        if (isCameraActive && videoRef.current) videoRef.current.srcObject = cameraStreamRef.current;
    }, [isCameraActive]);

    const commitImages = (next) => {
        imagesRef.current = next;
        onImagesChange(next);
    };
    const validateFile = (file) => {
        if (!allowedFormats.includes(file.type)) {
            toast.error(`Only ${allowedFormats.flatMap((format) => FORMAT_EXTENSIONS[format] || []).join(", ").toUpperCase()} formats are supported`);
            return false;
        }
        if (!file.size || file.size > maxFileSize * 1024 * 1024) {
            toast.error(file.size ? `Image size must be no more than ${maxFileSize}MB` : "This image is empty. Please choose another file.");
            return false;
        }
        return true;
    };
    const addImagesToState = (files) => {
        if (disabled) return;
        const current = imagesRef.current;
        const seen = new Set(current.map((image) => image.fingerprint).filter(Boolean));
        const validFiles = files.filter((file) => {
            if (!validateFile(file)) return false;
            const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
            if (seen.has(fingerprint)) { toast.error(`${file.name} has already been selected`); return false; }
            seen.add(fingerprint);
            return true;
        });
        if (!validFiles.length) return;
        const remaining = Math.max(0, maxImages - current.length);
        if (validFiles.length > remaining) toast.error(`Maximum ${maxImages} images allowed. Only the remaining ${remaining} slot${remaining === 1 ? "" : "s"} can be added.`);
        const added = validFiles.slice(0, remaining).map((file, index) => {
            const url = URL.createObjectURL(file);
            previewUrlsRef.current.add(url);
            return { id: `${Date.now()}-${index}-${Math.random()}`, url, file, isPrimary: current.length === 0 && index === 0,
                sortOrder: current.length + index, fingerprint: `${file.name}:${file.size}:${file.lastModified}` };
        });
        if (!added.length) return;
        commitImages([...current, ...added]);
        toast.success(`${added.length} image(s) added`);
    };
    const handleFileInput = (event) => {
        addImagesToState(Array.from(event.target.files || []));
        event.target.value = "";
    };
    const moveImage = (from, to) => {
        if (disabled || from < 0 || to < 0 || to >= images.length || from === to) return;
        const next = [...images];
        next.splice(to, 0, next.splice(from, 1)[0]);
        commitImages(next.map((image, index) => ({ ...image, sortOrder: index, isPrimary: compact ? index === 0 : image.isPrimary })));
        setPreviewIndex(to);
    };
    const reorderImage = (targetId) => {
        if (disabled || !draggedImageId) return;
        moveImage(images.findIndex((image) => image.id === draggedImageId), images.findIndex((image) => image.id === targetId));
        setDraggedImageId(null);
    };
    const removeImage = (id) => {
        if (disabled) return;
        const removed = images.find((image) => image.id === id);
        if (removed && previewUrlsRef.current.has(removed.url)) {
            URL.revokeObjectURL(removed.url);
            previewUrlsRef.current.delete(removed.url);
        }
        const next = images.filter((image) => image.id !== id);
        const hasCover = next.some((image) => image.isPrimary);
        commitImages(next.map((image, index) => ({ ...image, sortOrder: index, isPrimary: hasCover ? image.isPrimary : index === 0 })));
        setPreviewIndex((index) => Math.min(index, Math.max(0, next.length - 1)));
    };
    const setPrimary = (id) => {
        if (disabled) return;
        const next = compact ? [...images.filter((image) => image.id === id), ...images.filter((image) => image.id !== id)] : images;
        commitImages(next.map((image, index) => ({ ...image, isPrimary: image.id === id, sortOrder: index })));
        if (compact) setPreviewIndex(0);
    };
    const stopCamera = () => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsCameraActive(false);
    };
    const startCamera = async () => {
        if (disabled) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (!mountedRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            cameraStreamRef.current = stream;
            setIsCameraActive(true);
        } catch {
            if (!mountedRef.current) return;
            toast.error("Unable to open the live camera. Use the device camera picker instead.");
            cameraInputRef.current?.click();
        }
    };
    const capturePhoto = () => {
        if (disabled || !videoRef.current?.videoWidth || !canvasRef.current) return;
        const context = canvasRef.current.getContext("2d");
        if (!context) return;
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
            if (blob && mountedRef.current) addImagesToState([new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })]);
        }, "image/jpeg");
        stopCamera();
    };
    const safeIndex = Math.min(previewIndex, Math.max(0, images.length - 1));
    const previewImage = images[safeIndex];
    const formatNames = allowedFormats.flatMap((format) => FORMAT_EXTENSIONS[format] || []).join(", ").toUpperCase();

    return <div className={`multi-image-uploader-style-1${compact ? " multi-image-uploader--compact" : ""}`}>
        {images.length < maxImages && <div className={`multi-image-dropzone ${isDragging ? "multi-image-dropzone-active" : "multi-image-dropzone-idle"}`}
            onDragEnter={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false); }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); addImagesToState(Array.from(event.dataTransfer.files)); }}>
            <button type="button" className="multi-image-browse" disabled={disabled} onClick={() => fileInputRef.current?.click()} aria-label={compact ? "Upload room photos" : "Upload images"}>
                <Upload className="multi-image-uploader-style-2" aria-hidden="true" />
                <span className="multi-image-uploader-style-3">{compact ? "Drag and drop files here or click to browse" : "Drag images here or click to browse"}</span>
                <span className="multi-image-uploader-style-4">{formatNames} · Max {maxFileSize}MB · Up to {maxImages} {compact ? "photos" : "images"}</span>
            </button>
            {!compact && <>
                <p className="multi-image-uploader-style-5">{images.length} of {maxImages} images selected</p>
                <div className="multi-image-uploader-style-6">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="multi-image-uploader-style-7" disabled={disabled}><ImageIcon className="multi-image-uploader-style-8" />Select Images</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void startCamera()} className="multi-image-uploader-style-9" disabled={disabled}><Camera className="multi-image-uploader-style-10" />Take Photo</Button>
                </div>
            </>}
        </div>}
        <input ref={fileInputRef} type="file" multiple accept={allowedFormats.join(",")} onChange={handleFileInput} className="multi-image-uploader-style-11" disabled={disabled} aria-label={compact ? "Select room photos" : "Select images"} />
        <input ref={cameraInputRef} type="file" accept={allowedFormats.join(",")} capture="environment" onChange={handleFileInput} className="multi-image-uploader-style-12" disabled={disabled} aria-label={compact ? "Take a room photo" : "Take a photo"} />
        {compact && <p className="multi-image-compact-hint" aria-live="polite">Support: {formatNames}. Max {maxFileSize}MB each. ({images.length}/{maxImages} photos)</p>}
        {uploadProgress !== null && <div className="multi-image-uploader-style-13" role="status" aria-live="polite">
            <div className="multi-image-uploader-style-14"><span>Uploading images</span><span>{Math.round(uploadProgress)}%</span></div>
            <progress aria-label="Photo upload progress" className="multi-image-upload-progress" value={Math.max(0, Math.min(100, uploadProgress))} max={100} />
        </div>}
        {isCameraActive && <Card className="multi-image-uploader-style-17"><div className="multi-image-uploader-style-18">
            <video ref={videoRef} autoPlay playsInline className="multi-image-uploader-style-19" />
            <canvas ref={canvasRef} className="multi-image-uploader-style-20" />
            <div className="multi-image-uploader-style-21">
                <Button type="button" onClick={capturePhoto} disabled={disabled} className="multi-image-uploader-style-22 multi-image-action-grow"><Camera className="multi-image-uploader-style-23" />Capture</Button>
                <Button type="button" onClick={stopCamera} variant="outline" className="multi-image-uploader-style-24 multi-image-action-grow">Cancel</Button>
            </div>
        </div></Card>}
        {images.length > 0 && <div className="multi-image-uploader-style-25">
            {!compact && previewImage && <Card className="multi-image-uploader-style-26 multi-image-preview-card"><div className="multi-image-uploader-style-27">
                <img src={previewImage.url} alt={`Photo ${safeIndex + 1}`} className="multi-image-uploader-style-28" />
                {images.length > 1 && <>
                    <button type="button" onClick={() => setPreviewIndex((safeIndex - 1 + images.length) % images.length)} className="multi-image-uploader-style-29 multi-image-center-y" aria-label="Previous photo"><ChevronLeft className="multi-image-uploader-style-30" /></button>
                    <button type="button" onClick={() => setPreviewIndex((safeIndex + 1) % images.length)} className="multi-image-uploader-style-31 multi-image-center-y" aria-label="Next photo"><ChevronRight className="multi-image-uploader-style-32" /></button>
                </>}
                {previewImage.isPrimary && <div className="multi-image-uploader-style-33"><Star className="multi-image-uploader-style-34" />Cover Photo</div>}
            </div></Card>}
            <div className="multi-image-uploader-style-35">
                {!compact && <h4 className="multi-image-uploader-style-36">Images ({images.length}/{maxImages})</h4>}
                <div className="multi-image-uploader-style-37 multi-image-thumbnail-grid">
                    {images.map((image, index) => <div key={image.id} draggable={!disabled} onDragStart={() => setDraggedImageId(image.id)} onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => { event.preventDefault(); event.stopPropagation(); reorderImage(image.id); }} onDragEnd={() => setDraggedImageId(null)}
                        className={`multi-image-thumbnail ${image.isPrimary ? "multi-image-thumbnail-primary" : "multi-image-thumbnail-standard"}`}>
                        {compact ? <div className="multi-image-thumbnail-preview"><img src={image.url} alt={`Room photo ${index + 1}${image.isPrimary ? " (cover)" : ""}`} /></div>
                            : <button type="button" className="multi-image-thumbnail-preview" onClick={() => setPreviewIndex(index)} aria-label={`Preview photo ${index + 1}`}><img src={image.url} alt="" className="multi-image-uploader-style-38" /></button>}
                        <div className={compact ? "multi-image-compact-tools" : "multi-image-uploader-style-39"}>
                            {compact && <button type="button" disabled={disabled || index === 0} aria-label={`Move photo ${index + 1} earlier`} onClick={() => moveImage(index, index - 1)}><ChevronLeft /></button>}
                            <button type="button" title="Set as cover" aria-label={`Set photo ${index + 1} as cover`} aria-pressed={image.isPrimary} disabled={disabled} onClick={() => setPrimary(image.id)} className={compact ? undefined : "multi-image-uploader-style-40"}><Star className={compact ? undefined : "multi-image-uploader-style-41"} /></button>
                            {compact && <button type="button" disabled={disabled || index === images.length - 1} aria-label={`Move photo ${index + 1} later`} onClick={() => moveImage(index, index + 1)}><ChevronRight /></button>}
                            <button type="button" title="Remove photo" aria-label={`Remove photo ${index + 1}`} disabled={disabled} onClick={() => removeImage(image.id)} className={compact ? undefined : "multi-image-uploader-style-42"}><X className={compact ? undefined : "multi-image-uploader-style-43"} /></button>
                        </div>
                        {!compact && image.isPrimary && <div className="multi-image-uploader-style-44"><Star className="multi-image-uploader-style-45" /></div>}
                    </div>)}
                </div>
            </div>
            {images.length > 1 && <p className="multi-image-uploader-style-46">{compact ? "Use the arrows or drag photos to reorder. The first photo is the cover." : "Drag thumbnails to reorder them. The selected cover photo is saved first."}</p>}
        </div>}
        {!compact && images.length === 0 && <div className="multi-image-uploader-style-47 multi-image-empty"><ImageIcon className="multi-image-uploader-style-48" /><p className="multi-image-uploader-style-49">No images uploaded yet</p><p className="multi-image-uploader-style-50">Add images using the upload area above</p></div>}
    </div>;
}
