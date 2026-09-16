import { ChevronLeft, ChevronRight, Expand, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getImageUrl } from "@/utils/images";
export function RoomImageGallery({ images = [], roomName = "Room" }) {
    const sources = useMemo(() => [...new Set(images.filter((image) => typeof image === "string" && image.trim()).map(getImageUrl))], [images]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [fullScreen, setFullScreen] = useState(false);
    useEffect(() => {
        setActiveIndex((current) => Math.min(current, Math.max(0, sources.length - 1)));
    }, [sources.length]);
    useEffect(() => {
        if (!fullScreen)
            return;
        const onKeyDown = (event) => {
            if (event.key === "Escape")
                setFullScreen(false);
            if (event.key === "ArrowLeft")
                setActiveIndex((current) => (current - 1 + sources.length) % sources.length);
            if (event.key === "ArrowRight")
                setActiveIndex((current) => (current + 1) % sources.length);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [fullScreen, sources.length]);
    if (sources.length === 0) {
        return <div className="room-image-gallery-style-1"><div className="room-image-gallery-empty-content"><ImageIcon className="room-image-gallery-style-2"/><p className="room-image-gallery-style-3">No room photos uploaded</p></div></div>;
    }
    const previous = () => setActiveIndex((current) => (current - 1 + sources.length) % sources.length);
    const next = () => setActiveIndex((current) => (current + 1) % sources.length);
    const controls = sources.length > 1 && <>
    <button type="button" aria-label="Previous room image" onClick={(event) => { event.stopPropagation(); previous(); }} className="room-image-gallery-style-4 room-image-gallery-centered-y"><ChevronLeft className="room-image-gallery-style-5"/></button>
    <button type="button" aria-label="Next room image" onClick={(event) => { event.stopPropagation(); next(); }} className="room-image-gallery-style-6 room-image-gallery-centered-y"><ChevronRight className="room-image-gallery-style-7"/></button>
  </>;
    return <>
    <div className="room-image-gallery-style-8">
      <div className="room-image-gallery-style-9">
        <img src={sources[activeIndex]} alt={`${roomName} photo ${activeIndex + 1}`} className="room-image-gallery-style-10"/>
        {controls}
        <span className="room-image-gallery-style-11">{activeIndex === 0 ? "Cover · " : ""}{activeIndex + 1} / {sources.length}</span>
        <button type="button" onClick={() => setFullScreen(true)} className="room-image-gallery-style-12"><Expand className="room-image-gallery-style-13"/>Full screen</button>
      </div>
      {sources.length > 1 && <div className="room-image-gallery-style-14" aria-label={`${roomName} image thumbnails`}>
        {sources.map((source, index) => <button type="button" key={`${source}-${index}`} onClick={() => setActiveIndex(index)} className={`room-image-gallery-dynamic-1 ${index === activeIndex ? "room-image-gallery-thumb-active" : "room-image-gallery-thumb-idle"}`}><img src={source} alt={`${roomName} thumbnail ${index + 1}`} className="room-image-gallery-style-15"/></button>)}
      </div>}
    </div>

    {fullScreen && <div className="room-image-gallery-style-16" role="dialog" aria-modal="true" aria-label={`${roomName} full-screen photos`} onClick={(event) => { event.stopPropagation(); setFullScreen(false); }}>
      <button type="button" aria-label="Close full-screen preview" onClick={() => setFullScreen(false)} className="room-image-gallery-style-17"><X className="room-image-gallery-style-18"/></button>
      <div className="room-image-gallery-style-19" onClick={(event) => event.stopPropagation()}>
        <img src={sources[activeIndex]} alt={`${roomName} photo ${activeIndex + 1} full screen`} className="room-image-gallery-style-20"/>
        {controls}
        <span className="room-image-gallery-style-21 room-image-gallery-centered-x">{activeIndex + 1} / {sources.length}</span>
      </div>
    </div>}
  </>;
}
