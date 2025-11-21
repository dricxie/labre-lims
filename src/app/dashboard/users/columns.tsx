"use client"

import { ColumnDef } from "@tanstack/react-table"
import { UserProfile } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const getRoleVariant = (role: UserProfile['role']) => {
    switch (role) {
        case 'admin':
            return 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case 'supervisor':
            return 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'technician':
            return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'assistant':
            return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'student':
            return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        default:
            return 'default';
    }
};

interface GetColumnsProps {
    onEdit: (user: UserProfile) => void;
    onToggleStatus: (user: UserProfile) => void;
}

export const getColumns = ({ onEdit, onToggleStatus }: GetColumnsProps): ColumnDef<UserProfile>[] => [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("email")}</div>,
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.getValue("role") as UserProfile['role']
            return (
                <Badge variant="outline" className={`capitalize border-0 ${getRoleVariant(role)}`}>
                    {role}
                </Badge>
            )
        },
    },
    {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.original.active ?? true
            return (
                <Badge
                    variant="default"
                    className={isActive ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30'}
                >
                    {isActive ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original
            const isActive = user.active ?? true

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
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                                Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onToggleStatus(user)}
                                className={isActive ? 'text-destructive focus:text-destructive' : ''}
                            >
                                {isActive ? 'Deactivate' : 'Activate'} User
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
