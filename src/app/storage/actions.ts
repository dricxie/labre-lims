'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function uploadFile(formData: FormData) {
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'uploads'
    const path = formData.get('path') as string

    if (!file) {
        return { error: 'No file provided' }
    }

    const supabase = createAdminClient()

    // If path is provided, use it. Otherwise generate one.
    let filePath = path
    if (!filePath) {
        const timestamp = Date.now()
        filePath = `${timestamp}-${file.name}`
    }

    const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        })

    if (error) {
        console.error('Upload error:', error)
        return { error: error.message }
    }

    revalidatePath('/storage')
    return { success: true, data }
}
