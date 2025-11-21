import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = initializeAdminApp();
const db = getFirestore(app);

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'IMPORT';

export async function logAudit(
    action: AuditAction,
    entityType: string,
    entityId: string,
    actorId: string,
    actorEmail: string,
    details: Record<string, any>
) {
    try {
        await db.collection('audit_logs').add({
            action,
            entityType,
            entityId,
            actor: actorId,
            actorEmail,
            timestamp: FieldValue.serverTimestamp(),
            details
        });
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // We don't throw here to avoid blocking the main operation if audit fails, 
        // UNLESS strict compliance is required. 
        // For "Level 5" compliance, we SHOULD probably throw or ensure it's part of the transaction.
        // But this helper is for non-transactional contexts.
    }
}
