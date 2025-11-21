import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';

import { Shipment } from '@/lib/types';

const app = initializeAdminApp();
const db = getFirestore(app);

export type CreateShipmentParams = Omit<Shipment, 'id' | 'createdAt' | 'createdBy' | 'createdById'> & {
    userId: string;
    userEmail: string;
};

export async function createShipment(params: CreateShipmentParams) {
    const { userId, userEmail, ...shipmentData } = params;

    // Validate Sample ID if item type is Sample
    if (shipmentData.item_type === 'Sample' && shipmentData.item_id) {
        const sampleRef = db.collection('samples').doc(shipmentData.item_id);
        const sampleSnap = await sampleRef.get();

        if (!sampleSnap.exists) {
            throw new Error(`Invalid sample ID provided: ${shipmentData.item_id}`);
        }
    }

    const newShipment = {
        ...shipmentData,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userEmail,
        createdById: userId,
    };

    try {
        const docRef = await db.collection('shipments').add(newShipment);

        // Create activity log
        await db.collection('activity_log').add({
            action: 'create',
            details: `Created shipment ${newShipment.shipment_id} for item ${newShipment.item_name}`,
            target_entity: 'shipments',
            target_id: docRef.id,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            user_id: userId,
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating shipment:', error);
        throw new Error('Failed to create shipment');
    }
}
