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

/**
 * Converts a byte array (Uint8Array) to a data URL for displaying images
 * This is useful when retrieving image data stored as byte arrays from Firestore
 */
export function byteArrayToDataUrl(byteArray: Uint8Array): string {
    // Convert byte array to base64 string
    let binary = '';
    const bytes = new Uint8Array(byteArray);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    
    // Encode as base64 and create data URL (assuming it's a JPEG image)
    // You may need to adjust the MIME type if you're storing different image formats
    return 'data:image/jpeg;base64,' + btoa(binary);
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
