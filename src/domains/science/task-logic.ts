import { Task, TaskSampleProgressStatus, Sample } from '@/lib/types';

/**
 * Determines if a sample processing status is considered "successful" (meaning it resulted in a viable output).
 */
export function isSampleSuccessful(status: TaskSampleProgressStatus): boolean {
    return status === 'successful' || status === 'extracted';
}

/**
 * Determines if a sample processing status requires the user to assign a storage location.
 * Typically, if a sample is successfully processed/extracted, it needs to be stored.
 */
export function requiresStorage(status: TaskSampleProgressStatus): boolean {
    return isSampleSuccessful(status);
}

/**
 * Derives the final status of a Sample entity based on the Task's progress status for it
 * and whether storage has been assigned.
 * 
 * @param taskStatus The status of the sample within the task (e.g., 'successful', 'failed')
 * @param hasStorage Whether the user has assigned a storage location for this sample
 */
export function deriveSampleStatus(
    taskStatus: TaskSampleProgressStatus,
    hasStorage: boolean
): Sample['status'] {
    if (taskStatus === 'failed') {
        return 'disposed';
    }

    if (isSampleSuccessful(taskStatus)) {
        return hasStorage ? 'in_storage' : 'extracted';
    }

    // Default fallback, though typically we shouldn't reach here for completed tasks
    return 'processing';
}

/**
 * Checks if a task is in a completed state.
 */
export function isTaskComplete(task: Task): boolean {
    return task.status === 'Completed';
}
