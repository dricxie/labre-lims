import React from 'react';
import { File, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ImportStepSelectProps = {
    file: File | null;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: () => void;
};

export function ImportStepSelect({ file, onFileChange, onRemoveFile }: ImportStepSelectProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
                <label
                    htmlFor="sample-import-file"
                    className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/40 px-6 py-12 text-center transition hover:bg-muted"
                >
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-4 text-sm">
                        <span className="font-semibold">Click to upload</span> or drag and drop a CSV
                    </p>
                    <p className="text-xs text-muted-foreground">CSV only · Max 5MB · Include a header row</p>
                    <input
                        id="sample-import-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={onFileChange}
                    />
                </label>
            </div>
            {file && (
                <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                        <File className="h-4 w-4" />
                        <div className="flex flex-col text-left">
                            <span className="font-medium">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onRemoveFile}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove file</span>
                    </Button>
                </div>
            )}
        </div>
    );
}
