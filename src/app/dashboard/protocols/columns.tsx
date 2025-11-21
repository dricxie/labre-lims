"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Protocol } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

interface GetColumnsProps {
    onView: (protocol: Protocol) => void;
}

export const getColumns = ({ onView }: GetColumnsProps): ColumnDef<Protocol>[] => [
    {
        accessorKey: "protocol_id",
        header: "Protocol ID",
        cell: ({ row }) => <div className="font-medium">{row.getValue("protocol_id")}</div>,
    },
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
    },
    {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => <div className="text-muted-foreground">v{row.getValue("version")}</div>,
    },
    {
        accessorKey: "author",
        header: "Author",
        cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("author")}</div>,
    },
    {
        accessorKey: "createdAt",
        header: "Created On",
        cell: ({ row }) => {
            const createdAt = row.original.createdAt as any;
            return (
                <div>
                    {createdAt && typeof createdAt.toDate === 'function'
                        ? format(createdAt.toDate(), 'PP')
                        : 'Pending...'}
                </div>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const protocol = row.original

            return (
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => onView(protocol)}>
                        View
                    </Button>
                </div>
            )
        },
    },
]
