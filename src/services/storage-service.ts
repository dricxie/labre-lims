import { createClient } from '@/utils/supabase/client';

// Create a single instance for the service
const supabase = createClient();

export const STORAGE_BUCKETS = {
    ATTACHMENTS: 'attachments',
    PROTOCOLS: 'protocols',
    GEL_IMAGES: 'gel-images',
};

/**
 * Uploads a file to Supabase Storage.
 * @param bucket The storage bucket name.
 * @param path The file path within the bucket (e.g., 'experiments/exp-1/image.png').
 * @param file The file object to upload.
 * @returns The data object containing the path or an error.
 */
import { uploadFile as uploadFileAction } from '@/app/storage/actions';

export const uploadFile = async (bucket: string, path: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', path);

    const result = await uploadFileAction(formData);

    if (result.error) {
        throw new Error(`Upload failed: ${result.error}`);
    }

    return result.data;
};

/**
 * Deletes a file from Supabase Storage.
 * @param bucket The storage bucket name.
 * @param path The file path to delete.
 */
export const deleteFile = async (bucket: string, path: string) => {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
};

/**
 * Creates a signed URL for a file in Supabase Storage.
 * @param bucket The storage bucket name.
 * @param path The file path.
 * @param expiresInSeconds The number of seconds until the URL expires (default: 3600).
 * @returns The signed URL string.
 */
export const createSignedUrl = async (bucket: string, path: string, expiresInSeconds = 3600) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

    if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
};

/**
 * Lists files in a folder.
 * @param bucket The storage bucket name.
 * @param folder The folder path.
 */
export const listFiles = async (bucket: string, folder: string) => {
    const { data, error } = await supabase.storage.from(bucket).list(folder);

    if (error) {
        throw new Error(`List failed: ${error.message}`);
    }

    return data;
}
