"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Reagent, Consumable } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, PackageCheck, MoreHorizontal } from "lucide-react"
import { format, parseISO, isBefore, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const reagentColumns: ColumnDef<Reagent>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "lot_number",
        header: "Lot Number",
    },
    {
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ row }) => {
            const reagent = row.original
            const isLowStock = reagent.quantity <= reagent.min_threshold
            return (
                <div className="flex items-center gap-2">
                    <span>{reagent.quantity} {reagent.unit}</span>
                    {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>
            )
        },
    },
    {
        accessorKey: "expiry_date",
        header: "Expiry Date",
        cell: ({ row }) => {
            const dateStr = row.getValue("expiry_date") as string
            if (!dateStr) return <span>-</span>

            const expiryDate = parseISO(dateStr)
            const now = new Date()
            const isExpired = isBefore(expiryDate, now)
            const isExpiringSoon = differenceInDays(expiryDate, now) <= 30 && !isExpired

            return (
                <div className="flex items-center gap-2">
                    <span>{format(expiryDate, 'PP')}</span>
                    {(isExpired || isExpiringSoon) && (
                        <AlertTriangle
                            className={cn("h-4 w-4", isExpired ? "text-destructive" : "text-yellow-500")}
                        />
                    )}
                </div>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm">Details</Button>
                </div>
            )
        },
    },
]

export const consumableColumns: ColumnDef<Consumable>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ row }) => {
            const item = row.original
            return <span>{item.quantity} {item.unit}</span>
        },
    },
    {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
            const item = row.original
            const isInStock = item.quantity > item.min_threshold

            if (isInStock) {
                return (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <PackageCheck className="mr-1 h-3 w-3" />
                        In Stock
                    </Badge>
                )
            }

            return (
                <Badge variant="destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Low Stock
                </Badge>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm">Restock</Button>
                </div>
            )
        },
    },
]
