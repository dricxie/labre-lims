'use server';

import { revalidatePath } from 'next/cache';
import { createTask, CreateTaskParams } from '@/domains/science/task-service';

import { verifyAuth } from '@/domains/iam/auth';

export async function createTaskAction(params: Omit<CreateTaskParams, 'userId' | 'userEmail'>) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const result = await createTask({ ...params, userId, userEmail });
        revalidatePath('/dashboard/tasks');
        return { success: true, data: result };
    } catch (error) {
        console.error('Create task action failed:', error);
        return { success: false, error: 'Failed to create task' };
    }
}
