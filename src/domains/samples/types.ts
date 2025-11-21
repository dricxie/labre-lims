import { FieldValue, Timestamp } from 'firebase/firestore';

export type Sample = {
    id?: string;
    sample_id: string;
    parent_sample_id?: string | null;
    barcode: string;
    project_id: string;
    sample_type: 'blood' | 'tissue' | 'hair' | 'dna' | 'other';
    collected_by: string;
    date_collected: string;
    date_received: string;
    source: string;
    initial_volume: number;
    current_volume: number;
    storage_location_id: string;
    storage_path_ids?: string[];
    storage_path_names?: string[];
    position_label?: string;
    temperature_requirement?: number;
    temperature_range?: {
        min?: number | null;
        max?: number | null;
    };
    current_location?: SampleLocation;
    location_history?: SampleLocation[];
    status: 'received' | 'in_storage' | 'processing' | 'extracted' | 'used' | 'disposed';
    createdBy: string;
    createdById: string;
    createdAt: FieldValue | Timestamp;
};

export type SampleLocationPath = {
    unitId: string;
    ancestors: string[];
    pathLabels: string[];
    fullPath: string;
};

export type GridCoordinate = {
    rowIndex: number;
    colIndex: number;
    label: string;
};

export type CustomSlotCoordinate = {
    slotId: string;
    label: string;
};

export type SampleLocation = {
    storageUnitId: string;
    path: SampleLocationPath;
    coordinate?: GridCoordinate | CustomSlotCoordinate;
    positionNote?: string;
    temperatureC?: number | null;
    assignedAt: FieldValue | Timestamp;
};

export type StorageMoveLog = {
    id?: string;
    sampleId: string;
    fromLocation?: SampleLocation | null;
    toLocation?: SampleLocation | null;
    actorUserId: string;
    reason?: string;
    createdAt: FieldValue | Timestamp;
};
