import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Sample, Task } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getTaskStatusVariant = (status: Task['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Pending':
        return 'outline';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'default';
    }
};

export const getSampleStatusVariant = (status: Sample['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'in_storage':
      return 'default';
    case 'processing':
    case 'extracted':
      return 'secondary';
    case 'received':
      return 'outline';
    case 'used':
    case 'disposed':
      return 'destructive';
    default:
      return 'default';
  }
};
