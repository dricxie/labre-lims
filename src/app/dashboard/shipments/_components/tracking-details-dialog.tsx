'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Package, Truck, Calendar, AlertCircle } from 'lucide-react';
import { BinderByteData } from '@/app/actions/binderbyte';
import { format, parseISO } from 'date-fns';
import Barcode from 'react-barcode';

interface TrackingDetailsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    trackingData: BinderByteData | null;
    isLoading: boolean;
    error: string | null;
}

export function TrackingDetailsDialog({
    isOpen,
    onOpenChange,
    trackingData,
    isLoading,
    error,
}: TrackingDetailsDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Tracking Details
                    </DialogTitle>
                    <DialogDescription>
                        Real-time tracking information for your shipment.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-muted-foreground">Fetching tracking info...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-destructive">
                            <AlertCircle className="h-12 w-12" />
                            <p className="font-medium">{error}</p>
                        </div>
                    ) : trackingData ? (
                        <ScrollArea className="h-[50vh] pr-4">
                            <div className="space-y-6">
                                {/* Summary Section */}
                                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-lg">{trackingData.summary.courier}</h4>
                                            <p className="text-sm text-muted-foreground font-mono mb-2">
                                                {trackingData.summary.awb}
                                            </p>
                                            <Barcode
                                                value={trackingData.summary.awb}
                                                width={1.5}
                                                height={40}
                                                fontSize={12}
                                                margin={0}
                                                displayValue={false}
                                            />
                                        </div>
                                        <Badge
                                            variant={
                                                trackingData.summary.status === 'DELIVERED'
                                                    ? 'default' // Changed from 'success' to 'default' as 'success' might not exist in default shadcn
                                                    : 'secondary'
                                            }
                                            className={
                                                trackingData.summary.status === 'DELIVERED' ? 'bg-green-600 hover:bg-green-700' : ''
                                            }
                                        >
                                            {trackingData.summary.status}
                                        </Badge>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block">Service</span>
                                            <span className="font-medium">{trackingData.summary.service}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Weight</span>
                                            <span className="font-medium">{trackingData.summary.weight}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Origin</span>
                                            <span className="font-medium">{trackingData.detail.origin}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Destination</span>
                                            <span className="font-medium">{trackingData.detail.destination}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline Section */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Tracking History
                                    </h4>
                                    <div className="relative border-l-2 border-muted ml-2 space-y-6 pb-2">
                                        {trackingData.history.map((event, index) => (
                                            <div key={index} className="ml-6 relative">
                                                <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(parseISO(event.date), 'PP p')}
                                                    </span>
                                                    <p className="text-sm font-medium">{event.desc}</p>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {event.location}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Package className="h-12 w-12 mb-2 opacity-20" />
                            <p>No tracking information available.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
