'use server';

import { revalidatePath } from 'next/cache';
import {
    createReagent,
    CreateReagentParams,
    createConsumable,
    CreateConsumableParams
} from '@/domains/inventory/services';

import { verifyAuth } from '@/domains/iam/auth';

export async function createReagentAction(params: Omit<CreateReagentParams, 'userId' | 'userEmail'>) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const result = await createReagent({ ...params, userId, userEmail });
        revalidatePath('/dashboard/inventory');
        return { success: true, data: result };
    } catch (error) {
        console.error('Create reagent action failed:', error);
        return { success: false, error: 'Failed to create reagent' };
    }
}

export async function createConsumableAction(params: Omit<CreateConsumableParams, 'userId' | 'userEmail'>) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const result = await createConsumable({ ...params, userId, userEmail });
        revalidatePath('/dashboard/inventory');
        return { success: true, data: result };
    } catch (error) {
        console.error('Create consumable action failed:', error);
        return { success: false, error: 'Failed to create consumable' };
    }
}
