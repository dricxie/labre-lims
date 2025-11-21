'use server';

import { revalidatePath } from 'next/cache';
import { createShipment, CreateShipmentParams } from '@/domains/shipping/services';

import { verifyAuth } from '@/domains/iam/auth';

export async function createShipmentAction(params: Omit<CreateShipmentParams, 'userId' | 'userEmail'>) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const result = await createShipment({ ...params, userId, userEmail });
        revalidatePath('/dashboard/shipments');
        return { success: true, data: result };
    } catch (error) {
        console.error('Create shipment action failed:', error);
        return { success: false, error: 'Failed to create shipment' };
    }
}
