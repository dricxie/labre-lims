export type AuthenticatedUser = {
    uid: string;
    email: string | null;
    role?: 'student' | 'assistant' | 'technician' | 'supervisor' | 'admin';
    displayName?: string | null;
    emailVerified?: boolean;
};

export type UserProfile = {
    id?: string;
    email: string;
    name: string;
    role: 'student' | 'assistant' | 'technician' | 'supervisor' | 'admin';
    active?: boolean;
};

export type Project = {
    id: string;
    project_id: string;
    title: string;
    supervisor_email: string;
    start_date: string;
    end_date?: string;
    createdById: string;
};

export type ActivityLog = {
    id?: string;
    timestamp: string;
    user_email: string;
    user_id: string;
    action: 'create' | 'update' | 'delete' | 'login' | 'export';
    target_entity: string;
    target_id: string;
    details: string;
};
