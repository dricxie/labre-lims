import { FieldValue, Timestamp } from 'firebase/firestore';
import { Sample } from '../samples/types';

export type StorageCapacityMode = 'none' | 'grid' | 'custom' | 'unbounded';

export type GridLabelSchema = 'alpha-numeric' | 'numeric' | 'custom';

export type StorageGridLabelScheme = {
    row?: 'letters' | 'numbers' | 'custom';
    col?: 'letters' | 'numbers' | 'custom';
    customRowLabels?: string[];
    customColLabels?: string[];
};

export type StorageGridTemplate = {
    rows: number;
    cols: number;
    label_schema?: GridLabelSchema;
    label_scheme?: StorageGridLabelScheme;
    disabled_slots?: string[];
    enabled_slots?: string[];
};

export type CustomSlotTemplate = {
    slot_id: string;
    label: string;
    disabled?: boolean;
    metadata?: Record<string, unknown>;
};

export type StorageTypeDefaults = {
    temperatureC?: number | null;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    dragDropEnabled?: boolean;
    allowChildren?: boolean;
    gridUIEnabled?: boolean;
    allowCustomNotes?: boolean;
    allowedSampleTypes?: Sample['sample_type'][];
    metadata?: Record<string, unknown>;
};

export type StorageUnitOverrides = {
    temperatureC?: number | null;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    dragDropEnabled?: boolean;
    allowChildren?: boolean;
    gridUIEnabled?: boolean;
    gridTemplateDisabledSlots?: string[];
    gridTemplateEnabledSlots?: string[];
    customSlotsOverrides?: {
        slot_id: string;
        disabled?: boolean;
        label_override?: string;
    }[];
    metadata?: Record<string, unknown>;
};

export type StorageUnitCapacitySnapshot = {
    theoretical: number | null;
    effective: number | null;
    occupied: number | null;
    available: number | null;
    lastRecalculatedAt?: FieldValue | Timestamp;
};

export type StorageUnit = {
    id: string;
    storage_id: string;
    slug?: string;
    name: string;
    description?: string;
    type: string;
    type_id: string | null;
    type_label: string | null;
    parent_storage_id: string | null;
    parentId?: string | null;
    ancestors?: string[];
    path_ids?: string[];
    path_names?: string[];
    path_labels?: string[];
    full_path?: string;
    depth?: number;
    sort_order?: number;
    child_count?: number;
    sample_count?: number;
    occupancy_version?: number;
    temperature?: number;
    temperature_min?: number | null;
    temperature_max?: number | null;
    capacity_slots?: number;
    capacity_mode?: StorageCapacityMode;
    theoretical_slots?: number;
    effective_slots?: number;
    capacitySnapshot?: StorageUnitCapacitySnapshot;
    defaults_snapshot?: StorageTypeDefaults;
    overrides?: StorageUnitOverrides;
    grid_spec?: StorageGridTemplate;
    grid_template?: StorageGridTemplate;
    custom_slots_template?: CustomSlotTemplate[];
    custom_slots_effective?: CustomSlotTemplate[];
    occupied_slots?: Record<string, string>;
    child_allowed?: boolean;
    drag_enabled?: boolean;
    allow_children?: boolean;
    dragDropEnabled?: boolean;
    metadata?: Record<string, unknown>;
    createdById: string;
    createdAt?: FieldValue | Timestamp;
    updatedAt?: FieldValue | Timestamp;
    archived?: boolean;
    enabled?: boolean;
    slots?: Record<string, any>; // Added to support the new slots subcollection migration if needed in type
};

export type StorageType = {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    category?: string;
    capacity_mode?: StorageCapacityMode;
    theoretical_capacity?: number | null;
    default_temperature?: number | null;
    temperature_min?: number | null;
    temperature_max?: number | null;
    default_capacity?: number | null;
    grid_defaults?: StorageGridTemplate;
    custom_slots_template?: CustomSlotTemplate[];
    defaults?: StorageTypeDefaults;
    drag_enabled?: boolean;
    child_allowed?: boolean;
    allow_children?: boolean;
    allowed_child_types?: string[];
    allowed_sample_types?: Sample['sample_type'][];
    metadata?: Record<string, unknown>;
    createdById: string;
    enabled?: boolean;
    createdAt?: FieldValue | Timestamp;
    updatedAt?: FieldValue | Timestamp;
    schemaVersion?: number;
};

export type Reagent = {
    id?: string;
    reagent_id: string;
    name: string;
    lot_number: string;
    vendor: string;
    quantity: number;
    unit: 'kit' | 'mL' | 'unit' | 'tube' | 'µL';
    expiry_date: string;
    storage_condition: '-20°C' | '4°C' | 'RT' | '-80°C';
    storage_location_id: string;
    min_threshold: number;
    createdAt: FieldValue | Timestamp;
    createdBy: string;
    createdById: string;
    used?: number;
};

export type Consumable = {
    id?: string;
    consumable_id: string;
    name: string;
    lot_number: string;
    vendor: string;
    quantity: number;
    unit: 'box' | 'pack' | 'item';
    expiry_date: string | null;
    storage_location_id: string;
    min_threshold: number;
    createdAt: FieldValue | Timestamp;
    createdBy: string;
    createdById: string;
};

export type Equipment = {
    id?: string;
    equipment_id: string;
    name: string;
    type: string;
    manufacturer: string;
    model: string;
    serial_number: string;
    location: string;
    calibration_due_date?: string;
    createdById: string;
};

export type EquipmentUsageLog = {
    id?: string;
    log_id: string;
    equipment_id: string;
    user_id: string;
    experiment_id: string;
    start_time: string;
    end_time: string;
    notes?: string;
};
