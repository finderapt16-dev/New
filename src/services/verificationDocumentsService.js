import { supabase } from "@/services/supabaseClient";
export const VERIFICATION_DOCUMENT_TYPES = [
    { key: "proof_of_ownership", label: "Proof of Ownership or Authority" },
    { key: "business_registration", label: "Business Registration" },
    { key: "barangay_clearance", label: "Barangay Clearance" },
    { key: "mayors_business_permit", label: "Mayor’s / Business Permit" },
    { key: "bir_registration", label: "BIR Registration" },
    { key: "fire_safety_certificate", label: "Fire Safety Inspection Certificate" },
    { key: "occupancy_permit", label: "Occupancy Permit" },
    { key: "building_permit", label: "Building Permit" },
    { key: "sanitary_permit", label: "Sanitary Permit" },
    { key: "environmental_compliance", label: "Environmental / Waste Management Compliance" },
    { key: "rental_documents", label: "Rental Documents" },
    { key: "safety_requirements", label: "Safety Requirements" },
    { key: "additional_supporting_documents", label: "Additional Supporting Documents" },
];
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
export function validateVerificationFile(file) {
    if (!ALLOWED_TYPES.has(file.type))
        return "Use a JPG, JPEG, PNG, WebP, or PDF file.";
    if (file.size > MAX_FILE_SIZE)
        return "The file must be 10 MB or smaller.";
    return null;
}
const safeExtension = (file) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension && ["jpg", "jpeg", "png", "webp", "pdf"].includes(extension))
        return extension;
    return file.type === "application/pdf" ? "pdf" : "jpg";
};
export async function uploadVerificationDocuments(apartmentId, landlordId, documents) {
    for (const document of documents) {
        const validationError = validateVerificationFile(document.file);
        if (validationError)
            throw new Error(`${document.file.name}: ${validationError}`);
        const { data: previousRow } = await supabase
            .from("apartment_verification_documents")
            .select("storage_path")
            .eq("apartment_id", apartmentId)
            .eq("document_type", document.type)
            .maybeSingle();
        const previousPath = typeof previousRow?.storage_path === "string" ? previousRow.storage_path : null;
        const path = `${landlordId}/${apartmentId}/${document.type}-${Date.now()}.${safeExtension(document.file)}`;
        const { error: uploadError } = await supabase.storage.from("verification-documents").upload(path, document.file, {
            cacheControl: "3600",
            contentType: document.file.type,
            upsert: false,
        });
        if (uploadError)
            throw new Error(uploadError.message || "Unable to upload a verification document.");
        const { error: rowError } = await supabase.from("apartment_verification_documents").upsert({
            apartment_id: apartmentId,
            landlord_id: landlordId,
            document_type: document.type,
            file_name: document.file.name,
            mime_type: document.file.type,
            storage_path: path,
            updated_at: new Date().toISOString(),
        }, { onConflict: "apartment_id,document_type" });
        if (rowError) {
            await supabase.storage.from("verification-documents").remove([path]);
            throw new Error(rowError.message || "Unable to save verification document details.");
        }
        if (previousPath && previousPath !== path) {
            await supabase.storage.from("verification-documents").remove([previousPath]);
        }
    }
}
export async function fetchApartmentVerificationDocuments(apartmentId) {
    const { data, error } = await supabase
        .from("apartment_verification_documents")
        .select("*")
        .eq("apartment_id", apartmentId)
        .order("created_at", { ascending: true });
    if (error)
        throw new Error(error.message || "Unable to load verification documents.");
    return Promise.all((data ?? []).map(async (row) => {
        const { data: signed } = await supabase.storage
            .from("verification-documents")
            .createSignedUrl(String(row.storage_path), 15 * 60);
        return {
            id: String(row.id),
            apartmentId: String(row.apartment_id),
            landlordId: String(row.landlord_id),
            documentType: row.document_type,
            fileName: String(row.file_name),
            mimeType: String(row.mime_type),
            storagePath: String(row.storage_path),
            previewUrl: signed?.signedUrl ?? "",
            createdAt: row.created_at ? String(row.created_at) : undefined,
            updatedAt: row.updated_at ? String(row.updated_at) : undefined,
        };
    }));
}
