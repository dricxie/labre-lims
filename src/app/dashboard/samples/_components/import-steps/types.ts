import { Sample } from '@/lib/types';

export type SampleDraft = {
    sample_id?: string;
    project_id?: string;
    sample_type?: Sample['sample_type'];
    source?: string;
    storage_location_id?: string;
    position_label?: string;
    collected_by?: string;
    date_collected?: string;
    date_received?: string;
    initial_volume?: number;
    current_volume?: number;
    storage_path_ids?: string[];
    storage_path_names?: string[];
};

export type CompleteSampleDraft = SampleDraft &
    Required<
        Pick<
            SampleDraft,
            'sample_id' | 'project_id' | 'sample_type' | 'source' | 'storage_location_id' | 'collected_by' | 'date_collected' | 'date_received'
        >
    > & { initial_volume: number; current_volume: number };

export type RowStatus = 'valid' | 'invalid';
export type RowFilter = 'all' | RowStatus;

export type ParsedRow = {
    raw: Record<string, string>;
    normalized: SampleDraft;
    errors: string[];
    status: RowStatus;
};

export type BulkState = {
    prefix: string;
    suffix: string;
    projectId: string;
    sampleType: Sample['sample_type'] | '';
    source: string;
    storageId: string;
    dateCollected: string;
    dateReceived: string;
    collectedBy: string;
};
