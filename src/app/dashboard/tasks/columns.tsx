"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Task } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { getTaskStatusVariant } from "@/lib/utils"
import Link from "next/link"

export const getColumns = (
    userMap: Map<string, string>,
    currentUserId?: string
): ColumnDef<Task>[] => [
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
            accessorKey: "title",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Title
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
        },
        {
            accessorKey: "type",
            header: "Type",
        },
        {
            accessorKey: "assignedTo",
            header: "Assigned To",
            cell: ({ row }) => {
                const assignedTo = row.getValue("assignedTo") as string
                const name = userMap.get(assignedTo) || (assignedTo === currentUserId ? 'You' : assignedTo)
                return <div>{name}</div>
            },
        },
        {
            accessorKey: "sampleIds",
            header: "Samples",
            cell: ({ row }) => {
                const ids = row.getValue("sampleIds") as string[]
                return <div>{ids?.length || 0}</div>
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as Task['status']
                return (
                    <Badge variant={getTaskStatusVariant(status)} className="capitalize">
                        {status}
                    </Badge>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const task = row.original
                return (
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/tasks/${task.id}`}>View</Link>
                    </Button>
                )
            },
        },
    ]
