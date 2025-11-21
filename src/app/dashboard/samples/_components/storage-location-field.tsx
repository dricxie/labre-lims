// src/app/dashboard/samples/_components/storage-location-field.tsx

'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StorageOption } from '@/hooks/use-storage-options';

const SEARCHABLE_PROPS: (keyof StorageOption)[] = ['name', 'storageId', 'breadcrumb'];

export type StorageLocationFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  options: StorageOption[];
  isLoading?: boolean;
  label?: ReactNode;
  placeholder?: string;
  description?: ReactNode;
  disabled?: boolean;
  onSelect?: (option: StorageOption | undefined) => void;
};

export function StorageLocationField<TFieldValues extends FieldValues>({
  control,
  name,
  options,
  isLoading,
  label = 'Storage location',
  placeholder = 'Search storage containers…',
  description = 'Choose the exact container or box slot this sample lives in.',
  disabled,
  onSelect,
}: StorageLocationFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const optionMap = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) {
      return options;
    }
    const normalized = query.trim().toLowerCase();

    const matchesQuery = (option: StorageOption) => {
      return SEARCHABLE_PROPS.some((key) => {
        const rawValue = option[key];
        if (!rawValue) return false;
        if (Array.isArray(rawValue)) {
          return rawValue.some((value) => value?.toLowerCase?.().includes(normalized));
        }
        return rawValue.toString().toLowerCase().includes(normalized);
      });
    };

    return options.filter(matchesQuery);
  }, [options, query]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedOption = field.value ? optionMap.get(field.value as string) : undefined;
        return (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between"
                  disabled={disabled}
                >
                  <div className="flex flex-col items-start">
                    {selectedOption ? (
                      <>
                        <span className="font-medium text-sm">{selectedOption.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedOption.breadcrumb}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">{placeholder}</span>
                    )}
                  </div>
                  <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <div className="border-b p-2">
                  <Input
                    autoFocus
                    placeholder="Filter by name, ID, or path…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <ScrollArea className="max-h-72">
                  {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading storage map…</div>
                  ) : filteredOptions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No containers match “{query}”.</div>
                  ) : (
                    <div className="divide-y">
                      {filteredOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            field.onChange(option.id);
                            setOpen(false);
                            onSelect?.(option);
                          }}
                          className={cn(
                            'flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition hover:bg-muted',
                            option.id === field.value && 'bg-muted'
                          )}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{option.name}</span>
                              <span className="text-xs text-muted-foreground">{option.breadcrumb}</span>
                            </div>
                            <Badge variant="secondary" className="text-[0.65rem] uppercase tracking-wide">
                              {option.type}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{option.storageId}</span>
                            {typeof option.temperature === 'number' && <span>{option.temperature}°C</span>}
                            {option.temperatureMin !== undefined && option.temperatureMax !== undefined && (
                              <span>
                                Range: {option.temperatureMin ?? '—'}°C – {option.temperatureMax ?? '—'}°C
                              </span>
                            )}
                            {typeof option.sampleCount === 'number' && <span>{option.sampleCount} samples</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
