import { Sample } from '@/lib/types';

type SampleStatus = Sample['status'];

const SAMPLE_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
    'received': ['in_storage', 'processing', 'used', 'disposed'],
    'in_storage': ['processing', 'used', 'disposed', 'extracted'], // Can go to extracted if it's a source for extraction
    'processing': ['in_storage', 'extracted', 'used', 'disposed', 'failed' as SampleStatus], // 'failed' might be a new status we need to handle or map to 'used'
    'extracted': ['in_storage', 'used', 'disposed'],
    'used': ['disposed'],
    'disposed': [], // Terminal state
};

// Helper to handle potential new statuses not yet in the type definition
// For now, we stick to the strict type
export function validateSampleTransition(current: SampleStatus, next: SampleStatus): boolean {
    if (current === next) return true;

    const allowed = SAMPLE_TRANSITIONS[current];
    if (!allowed) return false;

    return allowed.includes(next);
}

export function assertSampleTransition(current: SampleStatus, next: SampleStatus) {
    if (!validateSampleTransition(current, next)) {
        throw new Error(`Invalid sample status transition from '${current}' to '${next}'`);
    }
}
