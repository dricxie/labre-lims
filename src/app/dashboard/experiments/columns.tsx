"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Experiment } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import Link from "next/link"

const getStatusVariant = (status: Experiment['status']) => {
    switch (status) {
        case 'completed':
            return 'default';
        case 'running':
            return 'secondary';
        case 'planned':
            return 'outline';
        case 'cancelled':
            return 'destructive';
        default:
            return 'default';
    }
};

export const columns: ColumnDef<Experiment>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "experiment_id",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Experiment ID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="font-medium">{row.getValue("experiment_id")}</div>,
    },
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <div className="hidden md:block">{row.getValue("type")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as Experiment['status']
            return (
                <Badge variant={getStatusVariant(status)} className="capitalize">
                    {status}
                </Badge>
            )
        },
    },
    {
        accessorKey: "start_time",
        header: "Start Time",
        cell: ({ row }) => {
            const date = row.getValue("start_time") as string
            return <div className="hidden lg:block">{date ? format(parseISO(date), 'PPp') : '-'}</div>
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const experiment = row.original
            return (
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/experiments/${experiment.id}`}>View</Link>
                </Button>
            )
        },
    },
]
