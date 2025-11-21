import { formatsToTry } from './constants';

export function tryNormalizeDate(value: string | Date | undefined): string | null {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
    }
    const normalized = new Date(value);
    if (!Number.isNaN(normalized.getTime())) {
        return normalized.toISOString();
    }
    for (const fmt of formatsToTry) {
        const parsed = Date.parse(String(value));
        if (!Number.isNaN(parsed)) {
            return new Date(parsed).toISOString();
        }
    }
    return null;
}

export function toDateInputValue(value?: string): string {
    if (!value) return '';
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return '';
    return new Date(timestamp).toISOString().slice(0, 10);
}
