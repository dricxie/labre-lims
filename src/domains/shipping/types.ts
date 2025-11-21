import { FieldValue, Timestamp } from 'firebase/firestore';

export type Shipment = {
    id?: string;
    shipment_id: string;
    item_type: 'Sample' | 'Reagent' | 'Consumable' | 'Other';
    item_id: string;
    item_name: string;
    origin: string;
    destination: string;
    date_sent: string;
    received_by?: string;
    received_date?: string;
    status: 'In Transit' | 'Received' | 'Cancelled';
    tracking_number?: string;
    courier?: string;
    createdBy: string;
    createdById: string;
    createdAt: FieldValue | Timestamp;
};
