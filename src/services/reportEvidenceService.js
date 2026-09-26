/**
 * Report Evidence Service
 * Handles:
 * - Evidence file uploads to Supabase Storage
 * - Creating report evidence records
 * - Reading signed evidence URLs for a report
 */
import { supabase } from "@/services/supabaseClient";
/**
 * Upload evidence file to Supabase Storage and create record in report_evidence table
 */
export async function uploadReportEvidence(input) {
    try {
        // Upload file to storage bucket
        const fileExt = input.fileName.split(".").pop();
        const bucketPath = `${input.reportId}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${fileExt || "bin"}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("report-evidence")
            .upload(bucketPath, input.file, {
            cacheControl: "3600",
            upsert: false,
        });
        if (uploadError || !uploadData) {
            console.error("Storage upload error:", uploadError);
            return null;
        }
        // Evidence is private. Return a short-lived signed URL to the uploader.
        const { data: signedUrl, error: signedUrlError } = await supabase.storage
            .from("report-evidence")
            .createSignedUrl(uploadData.path, 60 * 60);
        if (signedUrlError || !signedUrl?.signedUrl) {
            return null;
        }
        // Create record in report_evidence table
        const { data, error } = await supabase.from("report_evidence").insert({
            report_id: input.reportId,
            file_name: input.fileName,
            file_url: uploadData.path,
            file_type: input.fileType,
            mime_type: input.mimeType,
            file_size: input.file.size,
            uploaded_by: input.uploadedBy,
        }).select("id").single();
        if (error || !data) {
            console.error("Evidence record creation error:", error);
            await supabase.storage.from("report-evidence").remove([uploadData.path]);
            return null;
        }
        return {
            id: data.id,
            url: signedUrl.signedUrl,
        };
    }
    catch (error) {
        console.error("Error uploading report evidence:", error);
        return null;
    }
}

/**
 * Check if reporter has submitted a similar report recently (within 7 days)
 */

/**
 * Get all evidence for a report
 */
export async function getReportEvidence(reportId) {
    try {
        const { data, error } = await supabase
            .from("report_evidence")
            .select("*")
            .eq("report_id", reportId)
            .order("uploaded_at", { ascending: false });
        if (error) {
            console.error("Get evidence error:", error);
            return [];
        }
        const rows = data || [];
        return await Promise.all(rows.map(async (row) => {
            const path = typeof row.file_url === "string" ? row.file_url : "";
            if (!path || path.startsWith("http://") || path.startsWith("https://"))
                return row;
            const { data: signed } = await supabase.storage.from("report-evidence").createSignedUrl(path, 60 * 60);
            return { ...row, file_url: signed?.signedUrl || "" };
        }));
    }
    catch (error) {
        console.error("Error fetching report evidence:", error);
        return [];
    }
}
