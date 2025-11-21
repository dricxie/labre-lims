'use server';

import { revalidatePath } from 'next/cache';
import { createExperiment, CreateExperimentParams } from '@/domains/science/experiment-service';

import { verifyAuth } from '@/domains/iam/auth';

export async function createExperimentAction(params: Omit<CreateExperimentParams, 'userId' | 'userEmail'>) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const result = await createExperiment({ ...params, userId, userEmail });
        revalidatePath('/dashboard/experiments');
        return { success: true, data: result };
    } catch (error) {
        console.error('Create experiment action failed:', error);
        return { success: false, error: 'Failed to create experiment' };
    }
}
