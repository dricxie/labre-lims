import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameStorageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName: string;
    onConfirm: (newName: string) => Promise<void>;
}

export function RenameStorageDialog({ open, onOpenChange, initialName, onConfirm }: RenameStorageDialogProps) {
    const [name, setName] = useState(initialName);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setName(initialName);
    }, [initialName, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await onConfirm(name);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Storage Unit</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface DeleteStorageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeName: string;
    onConfirm: () => Promise<void>;
}

export function DeleteStorageDialog({ open, onOpenChange, nodeName, onConfirm }: DeleteStorageDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Storage Unit</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete "{nodeName}"? This action cannot be undone.
                        Any items inside will need to be moved or they may become inaccessible.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
