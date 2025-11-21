import { Sample } from '@/lib/types';
import { SampleDraft } from './types';

export const requiredFields: (keyof SampleDraft)[] = [
    'sample_id',
    'project_id',
    'sample_type',
    'source',
    'storage_location_id',
    'collected_by',
    'date_collected',
    'date_received',
    'initial_volume',
    'current_volume',
];

export const ALLOWED_SAMPLE_TYPES: Sample['sample_type'][] = ['blood', 'tissue', 'hair', 'dna', 'other'];

export const formatsToTry = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'MMM dd yyyy'];
