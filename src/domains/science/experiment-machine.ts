import { Experiment } from '@/lib/types';

type ExperimentStatus = Experiment['status'];

const EXPERIMENT_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
    'planned': ['running', 'cancelled'],
    'running': ['completed', 'cancelled', 'planned'], // Can go back to planned if paused/reset
    'completed': [], // Terminal state usually, but maybe could be re-opened? For now, terminal.
    'cancelled': ['planned'], // Can be re-planned
};

export function validateExperimentTransition(current: ExperimentStatus, next: ExperimentStatus): boolean {
    if (current === next) return true;

    const allowed = EXPERIMENT_TRANSITIONS[current];
    if (!allowed) return false;

    return allowed.includes(next);
}

export function assertExperimentTransition(current: ExperimentStatus, next: ExperimentStatus) {
    if (!validateExperimentTransition(current, next)) {
        throw new Error(`Invalid experiment status transition from '${current}' to '${next}'`);
    }
}
