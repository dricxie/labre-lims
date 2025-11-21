"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DnaExtract, Task } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, Edit, Link2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface GetColumnsProps {
    taskLookup: Map<string, Task>;
    onEdit: (extract: DnaExtract) => void;
}

export const getColumns = ({ taskLookup, onEdit }: GetColumnsProps): ColumnDef<DnaExtract>[] => [
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
        accessorKey: "dna_id",
        header: "DNA ID",
        cell: ({ row }) => <div className="font-medium">{row.getValue("dna_id")}</div>,
    },
    {
        accessorKey: "sample_id",
        header: "Parent Sample",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as DnaExtract['status']
            return (
                <Badge
                    variant={status === 'stored' ? 'default' : status === 'used' ? 'secondary' : 'destructive'}
                    className="capitalize"
                >
                    {status}
                </Badge>
            )
        },
    },
    {
        accessorKey: "source_task_id",
        header: "Task",
        cell: ({ row }) => {
            const taskId = row.getValue("source_task_id") as string | undefined
            if (!taskId) return <span className="text-sm text-muted-foreground">Unlinked</span>

            const task = taskLookup.get(taskId)
            return (
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <Link href={`/dashboard/tasks/${taskId}`}>
                        <Link2 className="mr-1 h-3 w-3" />
                        {task?.taskId ?? taskId}
                    </Link>
                </Button>
            )
        },
    },
    {
        accessorKey: "yield_ng_per_ul",
        header: "Yield (ng/µL)",
        cell: ({ row }) => row.getValue("yield_ng_per_ul") ?? '-',
    },
    {
        accessorKey: "a260_a280",
        header: "Purity",
        cell: ({ row }) => row.getValue("a260_a280") ?? '-',
    },
    {
        accessorKey: "date_extracted",
        header: "Extracted On",
        cell: ({ row }) => {
            const date = row.getValue("date_extracted") as string
            return date ? format(parseISO(date), 'PP') : '-'
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const extract = row.original

            return (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/dna-extracts/${extract.id}`}>View</Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open row actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(extract)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit metadata
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
