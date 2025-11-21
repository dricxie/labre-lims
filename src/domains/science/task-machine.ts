import { Task } from '@/lib/types';

type TaskStatus = Task['status'];

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    'Pending': ['In Progress', 'Cancelled'],
    'In Progress': ['Completed', 'Cancelled', 'Pending'], // Can go back to pending if paused
    'Completed': [], // Terminal
    'Cancelled': ['Pending'], // Can be restarted
};

export function validateTaskTransition(current: TaskStatus, next: TaskStatus): boolean {
    if (current === next) return true;

    const allowed = TASK_TRANSITIONS[current];
    if (!allowed) return false;

    return allowed.includes(next);
}

export function assertTaskTransition(current: TaskStatus, next: TaskStatus) {
    if (!validateTaskTransition(current, next)) {
        throw new Error(`Invalid task status transition from '${current}' to '${next}'`);
    }
}
