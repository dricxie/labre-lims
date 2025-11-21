import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Reagent, Consumable } from '@/lib/types';

const app = initializeAdminApp();
const db = getFirestore(app);

export type CreateReagentParams = Omit<Reagent, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'labId'> & {
    userId: string;
    userEmail: string;
};

export async function createReagent(params: CreateReagentParams) {
    const { userId, userEmail, ...reagentData } = params;

    const newReagent = {
        ...reagentData,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userEmail,
        createdById: userId,
    };

    try {
        const docRef = await db.collection('reagents').add(newReagent);

        await db.collection('activity_log').add({
            action: 'create',
            details: `Added reagent ${newReagent.name}`,
            target_entity: 'reagents',
            target_id: docRef.id,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            user_id: userId,
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating reagent:', error);
        throw new Error('Failed to create reagent');
    }
}

export type CreateConsumableParams = Omit<Consumable, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'expiry_date' | 'labId'> & {
    userId: string;
    userEmail: string;
    expiry_date: string | null;
};

export async function createConsumable(params: CreateConsumableParams) {
    const { userId, userEmail, ...consumableData } = params;

    const newConsumable = {
        ...consumableData,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userEmail,
        createdById: userId,
    };

    try {
        const docRef = await db.collection('consumables').add(newConsumable);

        await db.collection('activity_log').add({
            action: 'create',
            details: `Added consumable ${newConsumable.name}`,
            target_entity: 'consumables',
            target_id: docRef.id,
            timestamp: new Date().toISOString(),
            user_email: userEmail,
            user_id: userId,
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating consumable:', error);
        throw new Error('Failed to create consumable');
    }
}
