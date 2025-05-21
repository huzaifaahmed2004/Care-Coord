/**
 * Converts an image file to a Base64 string for storage in Firestore
 * Note: This approach is suitable for small images only (< 1MB)
 * as Firestore has a 1MB document size limit
 */
export async function convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        // Validate file size (limit to 800KB to stay under Firestore's 1MB limit)
        if (file.size > 800 * 1024) {
            reject(new Error('Image must be less than 800KB for Base64 storage'));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
            resolve(base64String);
        };
        reader.onerror = () => {
            reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(file);
    });
}

// Keep this function for backward compatibility, but it now uses Base64
export async function uploadFileToS3(file: File, folder = ""): Promise<string> {
    try {
        // Convert the image to Base64 instead of uploading to S3
        return await convertImageToBase64(file);
    } catch (error) {
        console.error("Error converting image to Base64:", error);
        throw error;
    }
}
