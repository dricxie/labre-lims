import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';

import { Experiment } from '@/lib/types';

const app = initializeAdminApp();
const db = getFirestore(app);

export type CreateExperimentParams = Omit<Experiment, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'experiment_id'> & {
    userId: string;
    userEmail: string;
};

export async function createExperiment(params: CreateExperimentParams) {
    const { userId, userEmail, ...experimentData } = params;

    // Validate Sample IDs
    if (experimentData.sampleIds && experimentData.sampleIds.length > 0) {
        const samplesSnap = await db.collection('samples')
            .where(FieldPath.documentId(), 'in', experimentData.sampleIds)
            .get();

        if (samplesSnap.size !== experimentData.sampleIds.length) {
            const foundIds = samplesSnap.docs.map(doc => doc.id);
            const missingIds = experimentData.sampleIds.filter(id => !foundIds.includes(id));
            throw new Error(`Invalid sample IDs provided: ${missingIds.join(', ')}`);
        }
    }

    const experimentId = `EXP-${Date.now()}`;

    const newExperiment = {
        ...experimentData,
        experiment_id: experimentId,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userEmail,
        createdById: userId,
    };

    try {
        const docRef = await db.collection('experiments').add(newExperiment);

        // Create activity log
        await db.collection('activity_log').add({
            action: 'create',
            details: `Created experiment ${newExperiment.title}`,
            target_entity: 'experiments',
            target_id: docRef.id,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            user_id: userId,
        });

        return { success: true, id: docRef.id, experiment_id: experimentId };
    } catch (error) {
        console.error('Error creating experiment:', error);
        throw new Error('Failed to create experiment');
    }
}
