import React from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ParsedRow } from './types';

type ImportStepCommitProps = {
    validRows: ParsedRow[];
    invalidRows: ParsedRow[];
    isCommitting: boolean;
    onCommit: () => void;
    onBack: () => void;
};

export function ImportStepCommit({
    validRows,
    invalidRows,
    isCommitting,
    onCommit,
    onBack,
}: ImportStepCommitProps) {
    return (
        <div className="space-y-6">
            <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Review & confirm</h4>
                <p className="text-sm text-muted-foreground">
                    {validRows.length} rows will be imported. {invalidRows.length ? `${invalidRows.length} rows will be ignored.` : ''}
                </p>
                <Separator className="my-2" />
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                        <p className="text-xs uppercase text-muted-foreground">Sample IDs</p>
                        <p className="font-medium">
                            {validRows.length <= 5
                                ? validRows.map((row) => row.normalized.sample_id).join(', ')
                                : `${validRows[0]?.normalized.sample_id}, ${validRows[1]?.normalized.sample_id}, …`}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-muted-foreground">Projects covered</p>
                        <p className="font-medium">
                            {Array.from(new Set(validRows.map((row) => row.normalized.project_id))).join(', ') || '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-muted-foreground">Earliest collected</p>
                        <p className="font-medium">
                            {validRows.length
                                ? format(
                                    new Date(
                                        validRows.reduce((earliest, row) => {
                                            const date = new Date(row.normalized.date_collected ?? Date.now()).getTime();
                                            return Math.min(earliest, date);
                                        }, Date.now()),
                                    ),
                                    'PP',
                                )
                                : '—'}
                        </p>
                    </div>
                </div>
                {invalidRows.length > 0 && (
                    <Alert>
                        <AlertTitle>Unimported rows detected</AlertTitle>
                        <AlertDescription>{invalidRows.length} rows will stay in draft unless you resolve them.</AlertDescription>
                    </Alert>
                )}
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onBack} disabled={isCommitting}>
                    Back
                </Button>
                <Button onClick={onCommit} disabled={isCommitting || !validRows.length}>
                    {isCommitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import {validRows.length ? `${validRows.length} samples` : ''}
                </Button>
            </div>
        </div>
    );
}
