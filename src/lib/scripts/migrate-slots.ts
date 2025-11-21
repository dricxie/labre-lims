import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeAdminApp();
const db = getFirestore(app);

async function migrateSlots() {
    console.log('Starting migration: occupied_slots -> slots subcollection...');

    const storageRef = db.collection('storage_units');
    const snapshot = await storageRef.get();

    let totalMoved = 0;
    let unitsProcessed = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const occupiedSlots = data.occupied_slots;

        if (occupiedSlots && Object.keys(occupiedSlots).length > 0) {
            console.log(`Processing unit ${doc.id} with ${Object.keys(occupiedSlots).length} slots...`);

            const batch = db.batch();
            const slotsRef = doc.ref.collection('slots');

            for (const [slotId, sampleId] of Object.entries(occupiedSlots)) {
                const slotDocRef = slotsRef.doc(slotId);
                batch.set(slotDocRef, {
                    sample_id: sampleId,
                    occupiedAt: new Date().toISOString(),
                    migrated: true
                });
                totalMoved++;
            }

            // Remove the old map field to enforce the new source of truth
            batch.update(doc.ref, {
                occupied_slots: null // or FieldValue.delete() if I imported it
            });

            await batch.commit();
            unitsProcessed++;
        }
    }

    console.log(`Migration complete.`);
    console.log(`Processed ${unitsProcessed} storage units.`);
    console.log(`Moved ${totalMoved} slots to subcollections.`);
}

migrateSlots().catch(console.error);
