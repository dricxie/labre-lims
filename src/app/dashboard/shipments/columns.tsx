"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Shipment } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Truck, MoreHorizontal } from "lucide-react"
import { format, parseISO } from "date-fns"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface GetColumnsProps {
    onTrack: (courier: string, awb: string) => void;
}

export const getColumns = ({ onTrack }: GetColumnsProps): ColumnDef<Shipment>[] => [
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
        accessorKey: "shipment_id",
        header: "Shipment ID",
        cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("shipment_id")}</div>,
    },
    {
        accessorKey: "item_name",
        header: "Item",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium">{row.getValue("item_name")}</span>
                <span className="text-muted-foreground text-xs">{row.original.item_type}</span>
            </div>
        ),
    },
    {
        accessorKey: "destination",
        header: "Destination",
    },
    {
        accessorKey: "date_sent",
        header: "Date Sent",
        cell: ({ row }) => {
            const date = row.getValue("date_sent") as string
            return <div>{format(parseISO(date), 'PP')}</div>
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as Shipment['status']
            let variant: "default" | "secondary" | "destructive" | "outline" = "secondary"
            let className = ""

            switch (status) {
                case 'Received':
                    className = 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                    break
                case 'In Transit':
                    className = 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent'
                    break
                case 'Cancelled':
                    variant = 'destructive'
                    break
                default:
                    variant = 'secondary'
            }

            return (
                <Badge variant={variant} className={className}>
                    {status}
                </Badge>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const shipment = row.original

            return (
                <div className="flex items-center justify-end gap-2">
                    {shipment.tracking_number && shipment.courier && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onTrack(shipment.courier!, shipment.tracking_number!)}
                        >
                            <Truck className="mr-2 h-3 w-3" />
                            Track
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(shipment.shipment_id)}
                            >
                                Copy Shipment ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
