"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ActivityLog } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

const getActionVariant = (action: ActivityLog['action']) => {
    switch (action) {
        case 'create':
            return 'bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'update':
            return 'bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'delete':
            return 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'login':
            return 'bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
        default:
            return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

export const columns: ColumnDef<ActivityLog>[] = [
    {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => {
            const date = row.getValue("timestamp") as string
            return (
                <div className="text-muted-foreground whitespace-nowrap">
                    {date ? format(parseISO(date), 'PPpp') : '-'}
                </div>
            )
        },
    },
    {
        accessorKey: "user_email",
        header: "User",
        cell: ({ row }) => <div className="max-w-[200px] truncate" title={row.getValue("user_email")}>{row.getValue("user_email")}</div>,
    },
    {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => {
            const action = row.getValue("action") as ActivityLog['action']
            return (
                <Badge
                    variant="outline"
                    className={cn(
                        'capitalize border-0',
                        getActionVariant(action)
                    )}
                >
                    {action}
                </Badge>
            )
        },
    },
    {
        accessorKey: "target_entity",
        header: "Target",
        cell: ({ row }) => {
            const log = row.original
            return (
                <span className="font-mono text-xs">
                    {log.target_entity}::{log.target_id}
                </span>
            )
        },
    },
    {
        accessorKey: "details",
        header: "Details",
        cell: ({ row }) => <div className="max-w-[300px] truncate" title={row.getValue("details")}>{row.getValue("details")}</div>,
    },
]
