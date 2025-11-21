'use client';

import Link from 'next/link';
import { Plus, TestTube, FlaskConical, Truck, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function QuickActions() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
                    <Link href="/dashboard/samples?action=new">
                        <div className="rounded-full bg-primary/10 p-2">
                            <TestTube className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold">Register Sample</span>
                            <span className="text-xs text-muted-foreground font-normal">Add a new sample to inventory</span>
                        </div>
                    </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
                    <Link href="/dashboard/experiments?action=new">
                        <div className="rounded-full bg-primary/10 p-2">
                            <FlaskConical className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold">New Experiment</span>
                            <span className="text-xs text-muted-foreground font-normal">Start a new experiment run</span>
                        </div>
                    </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
                    <Link href="/dashboard/shipments?action=new">
                        <div className="rounded-full bg-primary/10 p-2">
                            <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold">Create Shipment</span>
                            <span className="text-xs text-muted-foreground font-normal">Log incoming or outgoing items</span>
                        </div>
                    </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start gap-2 p-4" asChild>
                    <Link href="/dashboard/tasks?action=new">
                        <div className="rounded-full bg-primary/10 p-2">
                            <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold">Assign Task</span>
                            <span className="text-xs text-muted-foreground font-normal">Create a task for a team member</span>
                        </div>
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
