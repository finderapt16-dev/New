import React, { useCallback, useEffect, useId, useRef, useState, } from "react";
const ERROR_IMG_SRC = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";
export function ImageWithFallback({ src, alt, className, fallbackClassName, onLoad, onError, ...rest }) {
    const [didError, setDidError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null);
    const fallbackId = useId();
    const syncCachedImageState = useCallback(() => {
        const img = imgRef.current;
        if (!img || !src) {
            return;
        }
        /*
          When navigating away from Apartments and returning, the browser may
          already have the image in memory/cache. In that case the native load
          event can be missed by React in some navigation/cache situations.
    
          `complete + naturalWidth` tells us the image is already successfully
          available, so remove the gray loading placeholder immediately.
        */
        if (img.complete) {
            if (img.naturalWidth > 0) {
                setDidError(false);
                setIsLoaded(true);
            }
            else {
                setDidError(true);
                setIsLoaded(true);
            }
        }
    }, [src]);
    useEffect(() => {
        setDidError(false);
        setIsLoaded(false);
        // Check immediately after src changes.
        const frame = requestAnimationFrame(syncCachedImageState);
        return () => {
            cancelAnimationFrame(frame);
        };
    }, [src, syncCachedImageState]);
    const handleLoad = (event) => {
        setDidError(false);
        setIsLoaded(true);
        onLoad?.(event);
    };
    const handleError = (event) => {
        setDidError(true);
        setIsLoaded(true);
        onError?.(event);
    };
    if (!src || didError) {
        return (<div className={`image-with-fallback-dynamic-1 ${fallbackClassName ?? className ?? ""}`} role="img" aria-label={alt || "Image unavailable"}>
        <div className="image-with-fallback-style-1">
          <img src={ERROR_IMG_SRC} alt="" data-original-url={typeof src === "string" ? src : undefined}/>
        </div>
      </div>);
    }
    return (<span className={`image-with-fallback-dynamic-2 ${className ?? ""}`}>
      {!isLoaded && (<span className="image-with-fallback-style-2" aria-hidden="true" data-image-placeholder={fallbackId}/>)}

      <img ref={(node) => {
            imgRef.current = node;
            if (node) {
                requestAnimationFrame(syncCachedImageState);
            }
        }} src={src} alt={alt} className={`image-with-fallback-dynamic-3 ${isLoaded ? "image-loaded" : "image-loading"}`} {...rest} onLoad={handleLoad} onError={handleError}/>
    </span>);
}
