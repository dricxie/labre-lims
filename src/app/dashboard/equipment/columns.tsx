"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Equipment } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const columns: ColumnDef<Equipment>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("type")}</div>,
    },
    {
        accessorKey: "manufacturer",
        header: "Manufacturer",
        cell: ({ row }) => {
            const item = row.original
            return (
                <div className="hidden md:block">
                    {item.manufacturer} {item.model}
                </div>
            )
        },
    },
    {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => <div className="hidden lg:block">{row.getValue("location")}</div>,
    },
    {
        accessorKey: "calibration_due_date",
        header: "Calibration Due",
        cell: ({ row }) => {
            const date = row.getValue("calibration_due_date") as string
            return (
                <div className="hidden lg:block">
                    {date ? format(parseISO(date), 'PP') : 'N/A'}
                </div>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const item = row.original

            return (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/equipment/${item.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Log Maintenance</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                Decommission
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
