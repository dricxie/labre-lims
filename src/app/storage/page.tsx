'use client'

import { useState } from 'react'
import { uploadFile } from './actions'

export default function StoragePage() {
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setUploading(true)
        setMessage(null)

        const result = await uploadFile(formData)

        if (result.error) {
            setMessage(`Error: ${result.error}`)
        } else {
            setMessage('File uploaded successfully!')
        }

        setUploading(false)
    }

    return (
        <div className="p-8 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6">Supabase Storage Upload</h1>

            <form action={handleSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                        type="file"
                        name="file"
                        className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={uploading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {uploading ? 'Uploading...' : 'Upload File'}
                </button>
            </form>

            {message && (
                <div className={`mt-4 p-4 rounded-md ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div className="mt-8 text-sm text-gray-500">
                <p>Note: Ensure you have created a public bucket named 'uploads' in your Supabase dashboard.</p>
            </div>
        </div>
    )
}
