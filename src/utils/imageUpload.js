export async function optimizeImageForUpload(source, maxDimension = 2048) {
    if (source.size <= 1.5 * 1024 * 1024 || typeof createImageBitmap !== "function")
        return source;
    try {
        const bitmap = await createImageBitmap(source);
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
            bitmap.close();
            return source;
        }
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const outputType = ["image/jpeg", "image/png", "image/webp"].includes(source.type) ? source.type : "image/jpeg";
        return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob && blob.size < source.size ? blob : source), outputType, 0.84));
    }
    catch {
        return source;
    }
}
