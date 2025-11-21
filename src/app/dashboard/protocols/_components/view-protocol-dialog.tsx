'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Protocol } from '@/lib/types';

type ViewProtocolDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  protocol: Protocol | null;
};

export function ViewProtocolDialog({
  isOpen,
  onOpenChange,
  protocol,
}: ViewProtocolDialogProps) {
  if (!protocol) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{protocol.title}</DialogTitle>
          <DialogDescription>
            Protocol ID: {protocol.protocol_id} | Version: {protocol.version} | Author: {protocol.author}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {protocol.content}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
