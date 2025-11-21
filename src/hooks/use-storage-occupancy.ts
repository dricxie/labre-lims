import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { Sample, DnaExtract } from '@/lib/types';

export function useStorageOccupancy(storageId: string | null | undefined) {
    const firestore = useFirestore();

    const samplesQuery = useMemo(() => {
        if (!storageId || !firestore) return null;
        return query(collection(firestore, 'samples'), where('storage_location_id', '==', storageId));
    }, [firestore, storageId]);

    const dnaExtractsQuery = useMemo(() => {
        if (!storageId || !firestore) return null;
        return query(collection(firestore, 'dna_extracts'), where('storage_location_id', '==', storageId));
    }, [firestore, storageId]);

    const { data: samples, isLoading: loadingSamples } = useCollection<Sample>(samplesQuery);
    const { data: extracts, isLoading: loadingExtracts } = useCollection<DnaExtract>(dnaExtractsQuery);

    // NEW: Fetch the slots subcollection for authoritative occupancy
    const slotsQuery = useMemo(() => {
        if (!storageId || !firestore) return null;
        return collection(firestore, 'storage_units', storageId, 'slots');
    }, [firestore, storageId]);

    const { data: slots, isLoading: loadingSlots } = useCollection<{ sample_id: string, occupiedAt: string }>(slotsQuery);

    const occupiedSlots = useMemo(() => {
        const set = new Set<string>();

        samples?.forEach((s) => {
            if (s.position_label) set.add(s.position_label);
        });

        extracts?.forEach((e) => {
            if (e.storage_position_label) set.add(e.storage_position_label);
        });

        return set;
    }, [samples, extracts]);

    // NEW: Merge subcollection data
    const authoritativeSlots = useMemo(() => {
        const set = new Set(occupiedSlots);
        slots?.forEach((doc) => {
            // The doc ID is the slot label (e.g., "A1")
            if (doc.id) set.add(doc.id);
        });
        return set;
    }, [occupiedSlots, slots]);

    return {
        occupiedSlots: authoritativeSlots,
        isLoading: loadingSamples || loadingExtracts || loadingSlots,
    };
}
