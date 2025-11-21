import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { DnaExtract, TaskSampleProgressStatus } from '@/lib/types';

const app = initializeAdminApp();
const db = getFirestore(app);

export type CreateDnaExtractParams = Omit<DnaExtract, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'barcode' | 'labId'> & {
    userId: string;
    userEmail: string;
};

export async function createDnaExtract(params: CreateDnaExtractParams) {
    const { userId, userEmail, ...extractData } = params;

    // Validate Source Sample ID
    if (extractData.sample_id) {
        const sampleRef = db.collection('samples').doc(extractData.sample_id);
        const sampleSnap = await sampleRef.get();

        if (!sampleSnap.exists) {
            throw new Error(`Invalid source sample ID: ${extractData.sample_id}`);
        }
    }

    const newExtract = {
        ...extractData,
        barcode: extractData.dna_id,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userEmail,
        createdById: userId,
    };

    try {
        const docRef = await db.collection('dna_extracts').add(newExtract);

        await db.collection('activity_log').add({
            action: 'create',
            details: `Created DNA extract ${newExtract.dna_id}`,
            target_entity: 'dna_extracts',
            target_id: docRef.id,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            user_id: userId,
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating DNA extract:', error);
        throw new Error('Failed to create DNA extract');
    }
}

export type BulkUpdateExtractsParams = {
    extractIds: string[];
    update: Partial<DnaExtract>;
    logDetails: (extractId: string) => string;
    userId: string;
    userEmail: string;
};

export async function bulkUpdateDnaExtracts(params: BulkUpdateExtractsParams) {
    const { extractIds, update, logDetails, userId, userEmail } = params;
    const batch = db.batch();

    try {
        extractIds.forEach(id => {
            const extractRef = db.collection('dna_extracts').doc(id);
            batch.update(extractRef, update);

            const logRef = db.collection('activity_log').doc();
            batch.set(logRef, {
                action: 'update',
                details: logDetails(id),
                target_entity: 'dna_extracts',
                target_id: id,
                timestamp: new Date().toISOString(),
                user_email: userEmail,
                user_id: userId,
            });
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error('Error bulk updating DNA extracts:', error);
        throw new Error('Failed to bulk update DNA extracts');
    }
}

export type QuantificationUpdateParams = {
    id: string;
    dna_id: string;
    yield_ng_per_ul?: number;
    a260_a280?: number;
    sample_id?: string;
};

export type SaveQuantificationParams = {
    taskId: string;
    updates: QuantificationUpdateParams[];
    userId: string;
    userEmail: string;
};

export async function saveQuantification(params: SaveQuantificationParams) {
    const { taskId, updates, userId, userEmail } = params;
    const batch = db.batch();
    const sampleStatusUpdates: Record<string, TaskSampleProgressStatus> = {};

    try {
        updates.forEach(update => {
            const extractRef = db.collection('dna_extracts').doc(update.id);
            batch.update(extractRef, {
                yield_ng_per_ul: update.yield_ng_per_ul,
                a260_a280: update.a260_a280,
            });

            if (update.sample_id) {
                sampleStatusUpdates[update.sample_id] = 'successful';
            }

            const logRef = db.collection('activity_log').doc();
            batch.set(logRef, {
                action: 'update',
                details: `Recorded quantification for ${update.dna_id} (task ${taskId})`,
                target_entity: 'dna_extracts',
                target_id: update.id,
                timestamp: new Date().toISOString(),
                user_email: userEmail,
                user_id: userId,
            });
        });

        if (Object.keys(sampleStatusUpdates).length > 0) {
            const sampleIds = Object.keys(sampleStatusUpdates);
            const samplesSnapshot = await db.collection('samples')
                .where(FieldPath.documentId(), 'in', sampleIds)
                .get();

            const { assertSampleTransition } = await import('@/domains/samples/machine');

            samplesSnapshot.docs.forEach(doc => {
                const sample = doc.data() as any;
                const nextStatus = 'extracted'; // 'successful' task progress implies 'extracted' sample status
                if (sample.status) {
                    assertSampleTransition(sample.status, nextStatus);
                }
            });

            const taskRef = db.collection('tasks').doc(taskId);
            const statusPayload = Object.entries(sampleStatusUpdates).reduce(
                (acc, [sampleId, status]) => {
                    acc[`sampleProgress.${sampleId}`] = status;
                    return acc;
                },
                {} as Record<string, TaskSampleProgressStatus>
            );
            batch.update(taskRef, statusPayload);

            // Also update the samples themselves to 'extracted'
            sampleIds.forEach(sampleId => {
                const sampleRef = db.collection('samples').doc(sampleId);
                batch.update(sampleRef, { status: 'extracted' });
            });
        }

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error('Error saving quantification:', error);
        throw new Error('Failed to save quantification');
    }
}
