import { FieldValue, Timestamp } from 'firebase/firestore';

export type Experiment = {
    id?: string;
    experiment_id: string;
    title: string;
    type: 'DNA extraction' | 'PCR' | 'Electrophoresis' | 'Sequencing';
    protocol_id: string;
    project_id: string;
    start_time: string;
    end_time?: string;
    createdBy: string;
    createdById: string;
    createdAt: FieldValue | Timestamp;
    status: 'planned' | 'running' | 'completed' | 'cancelled';
    sampleIds?: string[];
    attachments?: { name: string; url: string; path: string; type: string }[];
    taskId?: string;
};

export type ExperimentSample = {
    id?: string;
    experiment_id: string;
    sample_id?: string;
    dna_id?: string;
    role: 'test' | 'control_positive' | 'control_negative' | 'marker';
    notes?: string;
    createdById: string;
};

export type Result = {
    id?: string;
    result_id: string;
    experiment_id: string;
    sampleId?: string;
    dnaId?: string;
    resultType: 'numeric' | 'qualitative' | 'image' | 'gel_band';
    value: string;
    unit?: string;
    fileDataUrl?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    validationStatus?: 'pending' | 'verified' | 'retest_required';
    createdAt: string;
    createdBy: string;
    createdById: string;
};

export type Protocol = {
    id?: string;
    protocol_id: string;
    title: string;
    version: string;
    content: string;
    author: string;
    authorId: string;
    createdAt: FieldValue | Timestamp;
};

export type DnaExtract = {
    id?: string;
    dna_id: string;
    sample_id: string;
    project_id: string;
    barcode: string;
    date_extracted: string;
    operator: string;
    yield_ng_per_ul?: number | null;
    a260_a280?: number | null;
    a260_a230?: number | null;
    volume_ul?: number | null;
    storage_location_id: string;
    storage_position_label?: string | null;
    status: 'stored' | 'used' | 'disposed';
    source_task_id?: string;
    extraction_method?: string | null;
    notes?: string | null;
    technician?: string | null;
    technician_id?: string | null;
    gelImageUrl?: string | null;
    createdAt: FieldValue | Timestamp;
    createdBy: string;
    createdById: string;
};

export type TaskSampleProgressStatus =
    | 'pending'
    | 'in_progress'
    | 'successful'
    | 'failed'
    | 'needs_review'
    | 'extracted';

export type Task = {
    id?: string;
    taskId: string;
    title: string;
    description?: string;
    type: 'DNA Extraction' | 'PCR' | 'Sample Reception' | 'Analysis';
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    assignedTo: string;
    createdBy: string;
    createdById: string;
    sampleIds: string[];
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    createdAt: FieldValue | Timestamp;
    dueDate?: string;
    sampleProgress?: Record<string, TaskSampleProgressStatus>;
};
