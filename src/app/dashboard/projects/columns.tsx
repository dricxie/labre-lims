"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Project } from "@/lib/types"
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

const getProjectStatus = (project: Project): { text: string, variant: 'default' | 'secondary' | 'outline' } => {
    const now = new Date();
    if (project.end_date && parseISO(project.end_date) < now) {
        return { text: 'Completed', variant: 'outline' };
    }
    if (parseISO(project.start_date) > now) {
        return { text: 'Planned', variant: 'secondary' };
    }
    return { text: 'Active', variant: 'default' };
};

export const columns: ColumnDef<Project>[] = [
    {
        accessorKey: "title",
        header: "Project Title",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium">{row.getValue("title")}</span>
                <span className="text-xs text-muted-foreground font-mono">{row.original.project_id}</span>
            </div>
        ),
    },
    {
        accessorKey: "supervisor_email",
        header: "Supervisor",
        cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("supervisor_email")}</div>,
    },
    {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = getProjectStatus(row.original)
            return (
                <Badge
                    variant={status.variant}
                    className={status.variant === 'default' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                    {status.text}
                </Badge>
            )
        },
    },
    {
        id: "timeline",
        header: "Timeline",
        cell: ({ row }) => {
            const project = row.original
            return (
                <div>
                    {format(parseISO(project.start_date), 'PP')} - {project.end_date ? format(parseISO(project.end_date), 'PP') : 'Ongoing'}
                </div>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const project = row.original

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
                                <Link href={`/dashboard/projects/${project.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Project</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                Archive Project
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
