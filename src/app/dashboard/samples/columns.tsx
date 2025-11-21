"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Sample } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { getSampleStatusVariant } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { QRCodeSVG } from "qrcode.react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { AuthenticatedUser } from "@/lib/types"
import { SampleActions } from "./sample-actions"

export const getColumns = (
    user: AuthenticatedUser | null,
    onDelete: (sampleId: string, sampleName: string) => void,
    onEdit: (sampleId: string) => void
): ColumnDef<Sample>[] => [
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
            accessorKey: "sample_id",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Sample ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            id: "qrcode",
            header: "QR Code",
            cell: ({ row }) => {
                const sample = row.original
                return (
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="p-1 rounded-md hover:bg-muted transition-colors">
                                <QRCodeSVG value={sample.barcode} size={32} />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xs">
                            <DialogHeader>
                                <DialogTitle>{sample.sample_id}</DialogTitle>
                            </DialogHeader>
                            <div className="flex justify-center p-4">
                                <QRCodeSVG value={sample.barcode} size={256} includeMargin={true} />
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            },
        },
        {
            accessorKey: "sample_type",
            header: "Type",
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return (
                    <Badge variant={getSampleStatusVariant(status as any)} className="capitalize">
                        {status.replace('_', ' ')}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "storage_location_id",
            header: "Location",
            cell: ({ row }) => {
                const sample = row.original
                return (
                    <div className="flex flex-col gap-1">
                        <span className="text-sm">
                            {sample.storage_path_names?.length
                                ? sample.storage_path_names.join(' › ')
                                : sample.storage_location_id ?? 'Unassigned'}
                        </span>
                        {sample.position_label && (
                            <Badge variant="outline" className="w-fit">Slot {sample.position_label}</Badge>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "date_collected",
            header: "Collected",
            cell: ({ row }) => {
                const date = row.getValue("date_collected") as string
                return date ? format(parseISO(date), 'PP') : '-'
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <SampleActions
                    sample={row.original}
                    user={user}
                    onDelete={onDelete}
                    onEdit={onEdit}
                />
            ),
        },
    ]
