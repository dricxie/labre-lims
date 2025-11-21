// src/app/dashboard/storage/components/storage-toolbar.tsx

'use client';

import { Search, PlusCircle, Box, Beaker, LineChart, Filter, Rows3, ListCollapse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import { cn } from '@/lib/utils';

type StorageToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  storageTypes: string[];
  activeType: string | null;
  onTypeChange: (value: string | null) => void;
  stats: {
    totalUnits: number;
    totalSamples: number;
  };
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAddStorage: () => void;
};

export function StorageToolbar({
  search,
  onSearchChange,
  storageTypes,
  activeType,
  onTypeChange,
  stats,
  onExpandAll,
  onCollapseAll,
  onAddStorage,
}: StorageToolbarProps) {
  const avgSamples = stats.totalUnits ? Number((stats.totalSamples / stats.totalUnits).toFixed(1)) : 0;
  const hasFilters = Boolean(activeType) || Boolean(search.trim());

  const resetFilters = () => {
    if (search) onSearchChange('');
    if (activeType) onTypeChange(null);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search storage ID, name, or sample ID"
            className="border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border bg-background">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-none border-r px-3"
              onClick={onExpandAll}
            >
              <Rows3 className="mr-1 h-4 w-4" /> Expand
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-none px-3"
              onClick={onCollapseAll}
            >
              <ListCollapse className="mr-1 h-4 w-4" /> Collapse
            </Button>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
              Clear filters
            </Button>
          )}
          <Button size="sm" onClick={onAddStorage} className="gap-2">
            <PlusCircle className="h-4 w-4" /> Add storage
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Storage types
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={activeType === null ? 'default' : 'outline'}
            className={cn('cursor-pointer', activeType === null && 'bg-primary text-primary-foreground')}
            onClick={() => onTypeChange(null)}
          >
            All
          </Badge>
          {storageTypes.map((type) => (
            <Badge
              key={type}
              variant={activeType === type ? 'default' : 'outline'}
              className={cn('cursor-pointer capitalize', activeType === type && 'bg-primary text-primary-foreground')}
              onClick={() => onTypeChange(type === activeType ? null : type)}
            >
              {type.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total units" value={stats.totalUnits} icon={Box} />
        <StatsCard label="Total samples" value={stats.totalSamples} icon={Beaker} />
        <StatsCard label="Avg samples/unit" value={avgSamples} icon={LineChart} />
        <StatsCard
          label="Active filter"
          value={activeType ? activeType.replace(/_/g, ' ') : 'All types'}
          icon={Filter}
          isString
        />
      </div>
    </div>
  );
}

type StatsCardProps = {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  isString?: boolean;
};

function StatsCard({ label, value, icon: Icon, isString }: StatsCardProps) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <div className="mt-1 text-2xl font-semibold">
        {typeof value === 'number' && !isString ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
