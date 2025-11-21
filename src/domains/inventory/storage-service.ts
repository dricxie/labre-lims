import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, Transaction } from 'firebase-admin/firestore';

const app = initializeAdminApp();
const db = getFirestore(app);

/**
 * StorageService handles low-level storage operations.
 * It is designed to be used within Firestore transactions for atomicity.
 */

/**
 * Occupies a slot in a storage unit.
 * Must be used within a transaction.
 */
export function occupySlot(
    t: Transaction,
    storageId: string,
    slotId: string,
    sampleId: string,
    sampleName: string
) {
    const slotRef = db.doc(`storage_units/${storageId}/slots/${slotId}`);

    // We don't strictly need to read the slot here if we trust the caller's check,
    // but for safety in a transaction, we might want to ensure it's empty.
    // However, `moveSampleAtomic` in samples/services.ts already does checks.
    // Let's keep this focused on the WRITE operation.

    t.set(slotRef, {
        sample_id: sampleId,
        sample_name: sampleName,
        occupied: true,
        updatedAt: new Date().toISOString()
    }, { merge: true });
}

/**
 * Frees a slot in a storage unit.
 * Must be used within a transaction.
 */
export function freeSlot(
    t: Transaction,
    storageId: string,
    slotId: string
) {
    const slotRef = db.doc(`storage_units/${storageId}/slots/${slotId}`);

    t.update(slotRef, {
        sample_id: null,
        sample_name: null,
        occupied: false,
        updatedAt: new Date().toISOString()
    });
}

/**
 * Checks if a slot is occupied.
 * Must be used within a transaction.
 */
export async function isSlotOccupied(
    t: Transaction,
    storageId: string,
    slotId: string
): Promise<boolean> {
    const slotRef = db.doc(`storage_units/${storageId}/slots/${slotId}`);
    const slotSnap = await t.get(slotRef);

    if (!slotSnap.exists) {
        // If slot doc doesn't exist, it's effectively empty/available in our model
        // (or it's an invalid slot, but we assume valid grid coordinates)
        return false;
    }

    const data = slotSnap.data();
    return !!data?.occupied;
}
