'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, ShieldAlert, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Sample, AuthenticatedUser } from '@/lib/types';

type SampleActionsProps = {
    sample: Sample;
    user: AuthenticatedUser | null;
    onDelete: (sampleId: string, sampleName: string) => void;
    onEdit: (sampleId: string) => void;
};

export function SampleActions({ sample, user, onDelete, onEdit }: SampleActionsProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const userRole = user?.role?.toLowerCase();
    const isOwner = user?.uid === sample.createdById;
    const isSupervisor = userRole === 'supervisor';
    const isAdmin = userRole === 'admin';

    const canEdit = isOwner || isSupervisor || isAdmin;
    const canDelete = isSupervisor || isAdmin;

    const handleDeleteConfirm = () => {
        if (sample.id) {
            onDelete(sample.id, sample.sample_id);
        }
        setIsDeleteDialogOpen(false);
    };

    return (
        <>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <div className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive" />Are you absolutely sure?</div>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the sample <span className="font-semibold">{sample.sample_id}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Yes, delete sample</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex justify-end items-center gap-1">
                <Button variant="ghost" size="sm" asChild><Link href={`/dashboard/samples/${sample.id}`}>View</Link></Button>
                {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => { if (sample.id) onEdit(sample.id); }}>
                        <Edit className="h-4 w-4" /><span className="sr-only">Edit</span>
                    </Button>
                )}
                {canDelete && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
                    </Button>
                )}
            </div>
        </>
    );
}
