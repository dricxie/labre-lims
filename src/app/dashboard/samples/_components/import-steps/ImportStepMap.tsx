import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ImportStepMapProps = {
    requiredFields: string[];
    optionalFields: string[];
    rawHeaders: string[];
    columnMapping: Record<string, string>;
    onMappingChange: (field: string, value: string) => void;
};

export function ImportStepMap({
    requiredFields,
    optionalFields,
    rawHeaders,
    columnMapping,
    onMappingChange,
}: ImportStepMapProps) {
    return (
        <div className="space-y-6">
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                <p className="font-medium">Map your columns</p>
                <p className="mt-1">
                    We've attempted to match your CSV headers to our system fields. Please verify and correct any mappings below.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Required Fields</h3>
                    {requiredFields.map((field) => (
                        <div key={field} className="grid gap-2">
                            <Label htmlFor={`map-${field}`} className="capitalize flex items-center gap-2">
                                {field.replace(/_/g, ' ')}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={columnMapping[field] || 'ignore'}
                                onValueChange={(value) => onMappingChange(field, value === 'ignore' ? '' : value)}
                            >
                                <SelectTrigger id={`map-${field}`} className={cn(!columnMapping[field] && "border-destructive ring-destructive/20")}>
                                    <SelectValue placeholder="Select column..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ignore" className="text-muted-foreground italic">
                                        -- Unmapped --
                                    </SelectItem>
                                    {rawHeaders.map((header) => (
                                        <SelectItem key={header} value={header}>
                                            {header}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Optional Fields</h3>
                    {optionalFields.map((field) => (
                        <div key={field} className="grid gap-2">
                            <Label htmlFor={`map-${field}`} className="capitalize">
                                {field.replace(/_/g, ' ')}
                            </Label>
                            <Select
                                value={columnMapping[field] || 'ignore'}
                                onValueChange={(value) => onMappingChange(field, value === 'ignore' ? '' : value)}
                            >
                                <SelectTrigger id={`map-${field}`}>
                                    <SelectValue placeholder="Select column..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ignore" className="text-muted-foreground italic">
                                        -- Unmapped --
                                    </SelectItem>
                                    {rawHeaders.map((header) => (
                                        <SelectItem key={header} value={header}>
                                            {header}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
