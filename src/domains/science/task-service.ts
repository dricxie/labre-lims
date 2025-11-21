import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { Task } from '@/lib/types';

const app = initializeAdminApp();
const db = getFirestore(app);

export type CreateTaskParams = Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'status' | 'taskId' | 'labId'> & {
    userId: string;
    userEmail: string;
};

export async function createTask(params: CreateTaskParams) {
    const { userId, userEmail, ...taskData } = params;

    const taskId = `TASK-${Date.now()}`;

    const newTask = {
        ...taskData,
        taskId,
        status: 'Pending',
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userEmail,
        createdById: userId,
    };

    try {
        const batch = db.batch();

        // 1. Create Task Document
        const taskRef = db.collection('tasks').doc();
        batch.set(taskRef, newTask);

        // 2. Update Sample Statuses
        if (taskData.sampleIds && taskData.sampleIds.length > 0) {
            // Fetch current samples to validate status and existence
            const samplesSnapshot = await db.collection('samples')
                .where(FieldPath.documentId(), 'in', taskData.sampleIds)
                .get();

            if (samplesSnapshot.size !== taskData.sampleIds.length) {
                const foundIds = samplesSnapshot.docs.map(doc => doc.id);
                const missingIds = taskData.sampleIds.filter(id => !foundIds.includes(id));
                throw new Error(`Invalid sample IDs provided: ${missingIds.join(', ')}`);
            }

            const { assertSampleTransition } = await import('@/domains/samples/machine');

            samplesSnapshot.docs.forEach(doc => {
                const sample = doc.data() as any; // Type casting for now
                if (sample.status) {
                    assertSampleTransition(sample.status, 'processing');
                }
            });

            taskData.sampleIds.forEach(sampleId => {
                const sampleRef = db.collection('samples').doc(sampleId);
                batch.update(sampleRef, { status: 'processing' });
            });

            // Log for bulk update
            const bulkLogRef = db.collection('activity_log').doc();
            batch.set(bulkLogRef, {
                action: 'update',
                details: `Bulk updated ${taskData.sampleIds.length} samples to 'processing' for task: ${taskData.title}`,
                target_entity: 'samples',
                target_id: 'batch_update',
                timestamp: new Date().toISOString(),
                user_email: userEmail,
                user_id: userId,
            });
        }

        // 3. Log for Task Creation
        const taskLogRef = db.collection('activity_log').doc();
        batch.set(taskLogRef, {
            action: 'create',
            details: `Created task "${taskData.title}" and assigned it to user ID ${taskData.assignedTo}`,
            target_entity: 'tasks',
            target_id: taskRef.id,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            user_id: userId,
        });

        await batch.commit();

        return { success: true, id: taskRef.id, taskId };
    } catch (error) {
        console.error('Error creating task:', error);
        throw new Error('Failed to create task');
    }
}
