'use server';

import { revalidatePath } from 'next/cache';
import {
    createDnaExtract,
    CreateDnaExtractParams,
    bulkUpdateDnaExtracts,
    BulkUpdateExtractsParams,
    saveQuantification,
    SaveQuantificationParams
} from '@/domains/science/dna-service';


// Since we can't pass functions (logDetails) to server actions, we need to adapt the params
export type ClientBulkUpdateParams = Omit<BulkUpdateExtractsParams, 'logDetails'> & {
    logDetailsTemplate: string; // e.g. "Updated status to {status}"
};

import { verifyAuth } from '@/domains/iam/auth';

export async function createDnaExtractAction(params: Omit<CreateDnaExtractParams, 'userId' | 'userEmail'>) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const result = await createDnaExtract({ ...params, userId, userEmail });
        revalidatePath('/dashboard/dna-extracts');
        return { success: true, data: result };
    } catch (error) {
        console.error('Create DNA extract action failed:', error);
        return { success: false, error: 'Failed to create DNA extract' };
    }
}

export async function bulkUpdateDnaExtractsAction(params: Omit<BulkUpdateExtractsParams, 'userId' | 'userEmail' | 'logDetails'> & { logDetailsTemplate: string }) {
    try {
        const { userId, userEmail } = await verifyAuth();
        // Reconstruct the logDetails function on the server
        const logDetails = (id: string) => params.logDetailsTemplate.replace('{id}', id);

        const result = await bulkUpdateDnaExtracts({ ...params, userId, userEmail, logDetails });
        revalidatePath('/dashboard/dna-extracts');
        return { success: true, data: result };
    } catch (error) {
        console.error('Bulk update DNA extracts action failed:', error);
        return { success: false, error: 'Failed to bulk update DNA extracts' };
    }
}

export async function saveQuantificationAction(params: Omit<SaveQuantificationParams, 'userId' | 'userEmail'>) {
    try {
        const { userId, userEmail } = await verifyAuth();
        const result = await saveQuantification({ ...params, userId, userEmail });
        revalidatePath(`/dashboard/tasks/${params.taskId}`);
        return { success: true, data: result };
    } catch (error) {
        console.error('Save quantification action failed:', error);
        return { success: false, error: 'Failed to save quantification' };
    }
}
