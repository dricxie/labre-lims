'use server';



import { moveSampleAtomic, createSampleAtomic, deleteSampleAtomic, importSamplesAtomic } from '@/domains/samples/services';
import { revalidatePath } from 'next/cache';

import { verifyAuth } from '@/domains/iam/auth';

export async function moveSampleAction(
    sampleId: string,
    targetStorageId: string,
    targetSlotId: string
) {
    try {
        const { userId, userEmail } = await verifyAuth();
        await moveSampleAtomic(sampleId, targetStorageId, targetSlotId, userId, userEmail);
        revalidatePath('/dashboard/storage');
        revalidatePath('/dashboard/samples');
        return { success: true };
    } catch (error: any) {
        console.error('Move sample action failed:', error);
        return { success: false, error: error.message || 'Failed to move sample' };
    }
}

export async function createSampleAction(sampleData: any) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const sampleId = await createSampleAtomic(sampleData, userId, userEmail);
        revalidatePath('/dashboard/samples');
        revalidatePath('/dashboard/storage');
        return { success: true, sampleId };
    } catch (error: any) {
        console.error('Create sample action failed:', error);
        return { success: false, error: 'Failed to create sample' };
    }
}

export async function deleteSampleAction(sampleId: string) {
    try {
        const { userId, userEmail } = await verifyAuth();
        await deleteSampleAtomic(sampleId, userId, userEmail);
        revalidatePath('/dashboard/samples');
        revalidatePath('/dashboard/storage');
        return { success: true };
    } catch (error: any) {
        console.error('Delete sample action failed:', error);
        return { success: false, error: 'Failed to delete sample' };
    }
}

export async function importSamplesAction(samplesData: any[]) {
    try {
        const { userId, userEmail } = await verifyAuth();
        await importSamplesAtomic(samplesData, userId, userEmail);
        revalidatePath('/dashboard/samples');
        revalidatePath('/dashboard/storage');
        return { success: true };
    } catch (error: any) {
        console.error('Import samples action failed:', error);
        return { success: false, error: 'Failed to import samples' };
    }
}
