import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// Initialize Admin SDK
const app = initializeAdminApp();
const db = getFirestore(app);

/**
 * The Atomic Core of your LIMS.
 * This function ensures that a sample move AND the audit trail happen together.
 */
import { occupySlot, freeSlot, isSlotOccupied } from '@/domains/inventory/storage-service';

export async function moveSampleAtomic(
    sampleId: string,
    targetStorageId: string,
    targetSlotId: string,
    userId: string,
    userEmail: string
) {
    if (!sampleId || !targetStorageId || !targetSlotId) {
        throw new Error('Missing required parameters for moveSampleAtomic');
    }

    return db.runTransaction(async (t) => {
        // 1. Define References
        const sampleRef = db.doc(`samples/${sampleId}`);
        const targetStorageRef = db.doc(`storage_units/${targetStorageId}`);

        const sampleSnap = await t.get(sampleRef);
        const targetStorageSnap = await t.get(targetStorageRef);

        if (!sampleSnap.exists) throw new Error(`Sample ${sampleId} does not exist`);
        if (!targetStorageSnap.exists) throw new Error(`Storage ${targetStorageId} does not exist`);

        const sampleData = sampleSnap.data();
        if (!sampleData) throw new Error(`Sample data is missing for ${sampleId}`);

        // 2. Validation
        // Check if target slot is occupied using StorageService
        const isOccupied = await isSlotOccupied(t, targetStorageId, targetSlotId);
        if (isOccupied) {
            throw new Error(`Slot ${targetSlotId} in storage ${targetStorageId} is already occupied`);
        }

        // 3. Writes

        // A. Handle Old Location (if exists)
        if (sampleData?.storage_location_id) {
            const oldStorageRef = db.doc(`storage_units/${sampleData.storage_location_id}`);

            if (sampleData.storage_location_id === targetStorageId) {
                // Moving within the same storage unit
                if (sampleData.position_label) {
                    freeSlot(t, targetStorageId, sampleData.position_label);
                }
                occupySlot(t, targetStorageId, targetSlotId, sampleId, sampleData.sample_id || sampleId);
            } else {
                // Moving to a different storage unit
                const oldStorageSnap = await t.get(oldStorageRef);
                if (oldStorageSnap.exists) {
                    t.update(oldStorageRef, {
                        sample_count: FieldValue.increment(-1)
                    });
                    if (sampleData.position_label) {
                        freeSlot(t, sampleData.storage_location_id, sampleData.position_label);
                    }
                }

                // Update new storage
                t.update(targetStorageRef, {
                    sample_count: FieldValue.increment(1)
                });
                occupySlot(t, targetStorageId, targetSlotId, sampleId, sampleData.sample_id || sampleId);
            }
        } else {
            // New to storage
            t.update(targetStorageRef, {
                sample_count: FieldValue.increment(1)
            });
            occupySlot(t, targetStorageId, targetSlotId, sampleId, sampleData.sample_id || sampleId);
        }

        // B. Update Sample
        t.update(sampleRef, {
            storage_location_id: targetStorageId,
            position_label: targetSlotId,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: userId
        });

        // C. Audit Log
        const auditRef = db.collection('audit_logs').doc();
        t.set(auditRef, {
            action: 'MOVE',
            entityId: sampleId,
            actor: userId,
            actorEmail: userEmail,
            timestamp: FieldValue.serverTimestamp(),
            details: {
                from_storage: sampleData?.storage_location_id || null,
                from_slot: sampleData?.position_label || null,
                to_storage: targetStorageId,
                to_slot: targetSlotId
            }
        });
    });
}

export async function createSampleAtomic(
    sampleData: any,
    userId: string,
    userEmail: string
) {
    return db.runTransaction(async (t) => {
        const sampleRef = db.collection('samples').doc();
        const sampleId = sampleRef.id;

        // 1. Barcode Uniqueness Check
        if (sampleData.barcode) {
            const existingQuery = db.collection('samples').where('barcode', '==', sampleData.barcode).limit(1);
            const existingSnap = await t.get(existingQuery);
            if (!existingSnap.empty) {
                throw new Error(`Barcode ${sampleData.barcode} already exists`);
            }
        }

        // 2. Storage Check (if assigned)
        if (sampleData.storage_location_id && sampleData.position_label) {
            const storageRef = db.doc(`storage_units/${sampleData.storage_location_id}`);
            const storageSnap = await t.get(storageRef);

            if (!storageSnap.exists) throw new Error(`Storage ${sampleData.storage_location_id} does not exist`);

            // Check slot in subcollection using StorageService
            const isOccupied = await isSlotOccupied(t, sampleData.storage_location_id, sampleData.position_label);
            if (isOccupied) {
                throw new Error(`Slot ${sampleData.position_label} is already occupied`);
            }

            // Update Storage Count
            t.update(storageRef, {
                sample_count: FieldValue.increment(1)
            });

            // Create Slot Document using StorageService
            occupySlot(t, sampleData.storage_location_id, sampleData.position_label, sampleId, sampleData.sample_id || sampleId);
        }

        // 2. Create Sample
        t.set(sampleRef, {
            ...sampleData,
            id: sampleId, // Ensure ID is in the doc
            createdAt: FieldValue.serverTimestamp(),
            createdBy: userEmail,
            createdById: userId
        });

        // 3. Audit
        const auditRef = db.collection('audit_logs').doc();
        t.set(auditRef, {
            action: 'CREATE',
            entityId: sampleId,
            actor: userId,
            actorEmail: userEmail,
            timestamp: FieldValue.serverTimestamp(),
            details: { sample_id: sampleData.sample_id }
        });

        return sampleId;
    });
}

export async function deleteSampleAtomic(
    sampleId: string,
    userId: string,
    userEmail: string
) {
    return db.runTransaction(async (t) => {
        const sampleRef = db.doc(`samples/${sampleId}`);
        const sampleSnap = await t.get(sampleRef);

        if (!sampleSnap.exists) throw new Error(`Sample ${sampleId} does not exist`);

        const sampleData = sampleSnap.data();

        // 1. Storage Cleanup
        if (sampleData?.storage_location_id) {
            const storageRef = db.doc(`storage_units/${sampleData.storage_location_id}`);
            const storageSnap = await t.get(storageRef);

            if (storageSnap.exists) {
                t.update(storageRef, {
                    sample_count: FieldValue.increment(-1)
                });

                if (sampleData.position_label) {
                    freeSlot(t, sampleData.storage_location_id, sampleData.position_label);
                }
            }
        }

        // 2. Delete Sample
        t.delete(sampleRef);

        // 3. Audit
        const auditRef = db.collection('audit_logs').doc();
        t.set(auditRef, {
            action: 'DELETE',
            entityId: sampleId,
            actor: userId,
            actorEmail: userEmail,
            timestamp: FieldValue.serverTimestamp(),
            details: { sample_id: sampleData?.sample_id }
        });
    });
}

export async function importSamplesAtomic(
    samplesData: any[],
    userId: string,
    userEmail: string
) {
    // Firestore transaction limit is 500 operations.
    // Each sample needs: 1 read (barcode check), 1 write (create sample).
    // Plus storage updates (read + write per storage unit).
    // If we have 100 samples, that's 200 ops + storage ops. Safe.
    // If > 200 samples, we should batch or warn.
    if (samplesData.length > 200) {
        throw new Error('Batch size too large for atomic transaction. Limit is 200.');
    }

    return db.runTransaction(async (t) => {
        const storageUpdates = new Map<string, { count: number, slots: Record<string, string> }>();

        // 1. Validate all barcodes and prepare storage updates
        for (const sample of samplesData) {
            // Check barcode
            if (sample.barcode) {
                const existingQuery = db.collection('samples').where('barcode', '==', sample.barcode).limit(1);
                const existingSnap = await t.get(existingQuery);
                if (!existingSnap.empty) {
                    throw new Error(`Barcode ${sample.barcode} already exists`);
                }
            }

            // Prepare storage
            if (sample.storage_location_id) {
                if (!storageUpdates.has(sample.storage_location_id)) {
                    storageUpdates.set(sample.storage_location_id, { count: 0, slots: {} });
                }
                const update = storageUpdates.get(sample.storage_location_id)!;
                update.count++;
                if (sample.position_label) {
                    update.slots[sample.position_label] = sample.sample_id; // Use sample_id as ref? Or doc ID?
                    // The current system uses sample_id (string) in occupied_slots, not doc ID.
                    // I will stick to sample_id as per current schema.
                }
            }
        }

        // 2. Validate and Update Storage Units
        for (const [storageId, update] of storageUpdates.entries()) {
            const storageRef = db.doc(`storage_units/${storageId}`);
            const storageSnap = await t.get(storageRef);

            if (!storageSnap.exists) throw new Error(`Storage ${storageId} does not exist`);

            // Check for slot collisions in subcollection
            for (const slot of Object.keys(update.slots)) {
                const isOccupied = await isSlotOccupied(t, storageId, slot);
                if (isOccupied) {
                    throw new Error(`Slot ${slot} in storage ${storageId} is already occupied`);
                }
            }

            // Apply updates
            t.update(storageRef, {
                sample_count: FieldValue.increment(update.count)
            });

            // Create slot documents
            for (const [slot, sampleId] of Object.entries(update.slots)) {
                occupySlot(t, storageId, slot, sampleId, sampleId); // Using sampleId as name for now
            }
        }

        // 3. Create Samples
        for (const sample of samplesData) {
            const sampleRef = db.collection('samples').doc();
            t.set(sampleRef, {
                ...sample,
                id: sampleRef.id,
                createdAt: FieldValue.serverTimestamp(),
                createdBy: userEmail,
                createdById: userId
            });
        }

        // 4. Audit
        const auditRef = db.collection('audit_logs').doc();
        t.set(auditRef, {
            action: 'IMPORT',
            entityId: 'batch_import',
            actor: userId,
            actorEmail: userEmail,
            timestamp: FieldValue.serverTimestamp(),
            details: { count: samplesData.length }
        });
    });
}
