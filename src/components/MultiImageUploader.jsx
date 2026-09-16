import { Camera, ChevronLeft, ChevronRight, Image as ImageIcon, Star, Upload, X, } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
const VALID_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const FORMAT_EXTENSIONS = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
};
export function MultiImageUploader({ images, onImagesChange, maxImages = 10, maxFileSize = 5, allowedFormats = VALID_FORMATS, uploadProgress = null, disabled = false, }) {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const dropZoneRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const previewUrlsRef = useRef(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [draggedImageId, setDraggedImageId] = useState(null);
    useEffect(() => () => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewUrlsRef.current.clear();
    }, []);
    const validateFile = (file) => {
        if (!allowedFormats.includes(file.type)) {
            const validExtensions = allowedFormats
                .flatMap((format) => FORMAT_EXTENSIONS[format] || [])
                .join(", ")
                .toUpperCase();
            toast.error(`Only ${validExtensions} formats are supported`);
            return false;
        }
        if (file.size > maxFileSize * 1024 * 1024) {
            toast.error(`Image size must be less than ${maxFileSize}MB`);
            return false;
        }
        return true;
    };
    const addImagesToState = (files) => {
        const seen = new Set(images.map((image) => image.fingerprint).filter(Boolean));
        const validFiles = files.filter((file) => {
            if (!validateFile(file))
                return false;
            const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
            if (seen.has(fingerprint)) {
                toast.error(`${file.name} has already been selected`);
                return false;
            }
            seen.add(fingerprint);
            return true;
        });
        if (validFiles.length === 0)
            return;
        const remainingSlots = maxImages - images.length;
        if (remainingSlots <= 0) {
            toast.error(`Maximum ${maxImages} images allowed`);
            return;
        }
        const filesToAdd = validFiles.slice(0, remainingSlots);
        const loadedImages = filesToAdd.map((file, index) => {
            const previewUrl = URL.createObjectURL(file);
            previewUrlsRef.current.add(previewUrl);
            return {
                id: `${Date.now()}-${index}-${Math.random()}`,
                url: previewUrl,
                file,
                isPrimary: images.length === 0 && index === 0,
                sortOrder: images.length + index,
                fingerprint: `${file.name}:${file.size}:${file.lastModified}`,
            };
        });
        onImagesChange([...images, ...loadedImages]);
        toast.success(`${loadedImages.length} image(s) added`);
    };
    const handleFileInput = (e) => {
        const files = Array.from(e.target.files || []);
        addImagesToState(files);
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    const reorderImage = (targetId) => {
        if (!draggedImageId || draggedImageId === targetId)
            return;
        const fromIndex = images.findIndex((image) => image.id === draggedImageId);
        const toIndex = images.findIndex((image) => image.id === targetId);
        if (fromIndex < 0 || toIndex < 0)
            return;
        const reordered = [...images];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        onImagesChange(reordered.map((image, index) => ({ ...image, sortOrder: index })));
        setDraggedImageId(null);
        setPreviewIndex(toIndex);
    };
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === dropZoneRef.current) {
            setIsDragging(false);
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length === 0) {
            toast.error("Please drop image files");
            return;
        }
        addImagesToState(imageFiles);
    };
    const removeImage = (id) => {
        const removed = images.find((image) => image.id === id);
        if (removed?.url.startsWith("blob:") && previewUrlsRef.current.has(removed.url)) {
            URL.revokeObjectURL(removed.url);
            previewUrlsRef.current.delete(removed.url);
        }
        const updated = images.filter((img) => img.id !== id);
        // Reassign sort orders
        const reordered = updated.map((img, idx) => ({
            ...img,
            sortOrder: idx,
            isPrimary: idx === 0 ? true : img.isPrimary,
        }));
        onImagesChange(reordered);
        toast.success("Image removed");
    };
    const setPrimary = (id) => {
        const updated = images.map((img) => ({
            ...img,
            isPrimary: img.id === id,
        }));
        onImagesChange(updated);
        toast.success("Primary image updated");
    };
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            cameraStreamRef.current = stream;
            setIsCameraActive(true);
            requestAnimationFrame(() => {
                if (videoRef.current)
                    videoRef.current.srcObject = stream;
            });
        }
        catch {
            toast.error("Unable to open the live camera. Use the device camera picker instead.");
            cameraInputRef.current?.click();
        }
    };
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0);
                canvasRef.current.toBlob((blob) => {
                    if (blob) {
                        addImagesToState([new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })]);
                    }
                }, "image/jpeg");
                stopCamera();
            }
        }
    };
    const stopCamera = () => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        if (videoRef.current)
            videoRef.current.srcObject = null;
        setIsCameraActive(false);
    };
    const primaryImage = images.find((img) => img.isPrimary) || images[0];
    const previewImage = images[previewIndex] || primaryImage;
    return (<div className="multi-image-uploader-style-1">
      {images.length < maxImages && (<div ref={dropZoneRef} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`multi-image-dropzone ${isDragging ? "multi-image-dropzone-active" : "multi-image-dropzone-idle"}`} onClick={() => !disabled && fileInputRef.current?.click()}>
          <Upload className="multi-image-uploader-style-2"/>
          <p className="multi-image-uploader-style-3">
            Drag images here or click to browse
          </p>
          <p className="multi-image-uploader-style-4">
            Supported: JPG, PNG, WebP (max {maxFileSize}MB each)
          </p>
          <p className="multi-image-uploader-style-5">
            {images.length} of {maxImages} images uploaded
          </p>

          <div className="multi-image-uploader-style-6">
            <Button type="button" variant="outline" size="sm" onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
            }} className="multi-image-uploader-style-7" disabled={disabled}>
              <ImageIcon className="multi-image-uploader-style-8"/>
              Select Images
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={(e) => {
                e.stopPropagation();
                void startCamera();
            }} className="multi-image-uploader-style-9" disabled={disabled}>
              <Camera className="multi-image-uploader-style-10"/>
              Take Photo
            </Button>
          </div>

          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileInput} className="multi-image-uploader-style-11" disabled={disabled}/>
          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileInput} className="multi-image-uploader-style-12" disabled={disabled}/>
        </div>)}

      {uploadProgress !== null && (<div className="multi-image-uploader-style-13" role="status" aria-live="polite">
          <div className="multi-image-uploader-style-14"><span>Uploading room images</span><span>{Math.round(uploadProgress)}%</span></div>
          <progress className="multi-image-upload-progress" value={Math.max(0, Math.min(100, uploadProgress))} max={100}/>
        </div>)}

      {isCameraActive && (<Card className="multi-image-uploader-style-17">
          <div className="multi-image-uploader-style-18">
            <video ref={videoRef} autoPlay playsInline className="multi-image-uploader-style-19"/>
            <canvas ref={canvasRef} className="multi-image-uploader-style-20"/>
            <div className="multi-image-uploader-style-21">
              <Button onClick={capturePhoto} className="multi-image-uploader-style-22 multi-image-action-grow">
                <Camera className="multi-image-uploader-style-23"/>
                Capture
              </Button>
              <Button onClick={stopCamera} variant="outline" className="multi-image-uploader-style-24 multi-image-action-grow">
                Cancel
              </Button>
            </div>
          </div>
        </Card>)}

      {images.length > 0 && (<div className="multi-image-uploader-style-25">
          {previewImage && (<Card className="multi-image-uploader-style-26 multi-image-preview-card">
              <div className="multi-image-uploader-style-27">
                <img src={previewImage.url} alt={previewImage.isPrimary ? "Primary" : "Preview"} className="multi-image-uploader-style-28"/>
                {images.length > 1 && (<>
                    <button type="button" onClick={() => setPreviewIndex((prev) => prev === 0 ? images.length - 1 : prev - 1)} className="multi-image-uploader-style-29 multi-image-center-y">
                      <ChevronLeft className="multi-image-uploader-style-30"/>
                    </button>
                    <button type="button" onClick={() => setPreviewIndex((prev) => prev === images.length - 1 ? 0 : prev + 1)} className="multi-image-uploader-style-31 multi-image-center-y">
                      <ChevronRight className="multi-image-uploader-style-32"/>
                    </button>
                  </>)}
                {previewImage.isPrimary && (<div className="multi-image-uploader-style-33">
                    <Star className="multi-image-uploader-style-34"/>
                    Cover Photo
                  </div>)}
              </div>
            </Card>)}

          <div className="multi-image-uploader-style-35">
            <h4 className="multi-image-uploader-style-36">
              Images ({images.length}/{maxImages})
            </h4>
            <div className="multi-image-uploader-style-37 multi-image-thumbnail-grid">
              {images.map((img, idx) => (<div key={img.id} draggable={!disabled} onDragStart={() => setDraggedImageId(img.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderImage(img.id)} onDragEnd={() => setDraggedImageId(null)} className={`multi-image-thumbnail ${img.isPrimary ? "multi-image-thumbnail-primary" : "multi-image-thumbnail-standard"}`}>
                  <img src={img.url} alt={`Image ${idx + 1}`} className="multi-image-uploader-style-38" onClick={() => setPreviewIndex(idx)}/>

                  <div className="multi-image-uploader-style-39">
                    <button type="button" title="Set as primary" onClick={(e) => {
                    e.preventDefault();
                    setPrimary(img.id);
                }} className="multi-image-uploader-style-40">
                      <Star className="multi-image-uploader-style-41"/>
                    </button>
                    <button type="button" title="Delete" onClick={(e) => {
                    e.preventDefault();
                    removeImage(img.id);
                }} className="multi-image-uploader-style-42">
                      <X className="multi-image-uploader-style-43"/>
                    </button>
                  </div>

                  {img.isPrimary && (<div className="multi-image-uploader-style-44">
                      <Star className="multi-image-uploader-style-45"/>
                    </div>)}
                </div>))}
            </div>
          </div>

          {images.length > 1 && (<div className="multi-image-uploader-style-46">
              Drag thumbnails to reorder them. The selected cover photo is saved first.
            </div>)}
        </div>)}

      {images.length === 0 && (<div className="multi-image-uploader-style-47 multi-image-empty">
          <ImageIcon className="multi-image-uploader-style-48"/>
          <p className="multi-image-uploader-style-49">No images uploaded yet</p>
          <p className="multi-image-uploader-style-50">Add images using the upload area above</p>
        </div>)}
    </div>);
}
