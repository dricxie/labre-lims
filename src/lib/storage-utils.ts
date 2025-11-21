import { StorageGridTemplate, StorageUnit, StorageUnitCapacitySnapshot, StorageUnitOverrides } from './types';

const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function buildRowLabel(rowIndex: number): string {
  if (rowIndex < ROW_LABELS.length) {
    return ROW_LABELS[rowIndex];
  }
  let result = '';
  let index = rowIndex;
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

export function getGridCoordinateLabel(rowIndex: number, colIndex: number, schema: StorageGridTemplate['label_schema']): string {
  const columnNumber = colIndex + 1;
  switch (schema) {
    case 'numeric':
      return `${rowIndex + 1}-${columnNumber}`;
    case 'custom':
      return `R${rowIndex + 1}C${columnNumber}`;
    case 'alpha-numeric':
    default:
      return `${buildRowLabel(rowIndex)}${columnNumber}`;
  }
}

type GridCapacityOptions = {
  template?: StorageGridTemplate;
  overrides?: StorageUnitOverrides;
  occupiedSlots?: Iterable<string> | Record<string, unknown> | null;
};

export function computeGridCapacitySnapshot({
  template,
  overrides,
  occupiedSlots,
}: GridCapacityOptions): StorageUnitCapacitySnapshot | undefined {
  if (!template) return undefined;
  const rows = template.rows ?? 0;
  const cols = template.cols ?? 0;
  if (rows <= 0 || cols <= 0) return undefined;

  const theoretical = rows * cols;
  const disabled = new Set(template.disabled_slots ?? []);
  overrides?.gridTemplateDisabledSlots?.forEach((slot) => disabled.add(slot));

  const enabledExplicit = new Set([
    ...(template.enabled_slots ?? []),
    ...(overrides?.gridTemplateEnabledSlots ?? []),
  ]);

  let effective: number;
  let enabledUniverse: Set<string> | null = null;
  if (enabledExplicit.size > 0) {
    enabledUniverse = new Set(enabledExplicit);
    disabled.forEach((slot) => enabledUniverse!.delete(slot));
    effective = enabledUniverse.size;
  } else {
    effective = Math.max(theoretical - disabled.size, 0);
  }

  let occupiedCount: number | null = null;
  if (occupiedSlots) {
    const labels = normalizeOccupiedSlots(occupiedSlots);
    const disabledSet = disabled;
    occupiedCount = 0;
    for (const label of labels) {
      if (enabledUniverse) {
        if (enabledUniverse.has(label)) {
          occupiedCount += 1;
        }
      } else if (!disabledSet.has(label)) {
        occupiedCount += 1;
      }
    }
  }

  const available = occupiedCount !== null ? Math.max(effective - occupiedCount, 0) : null;

  return {
    theoretical,
    effective,
    occupied: occupiedCount,
    available,
  } satisfies StorageUnitCapacitySnapshot;
}

export function deriveCapacitySnapshotFromUnit(unit: StorageUnit): StorageUnitCapacitySnapshot | undefined {
  if (unit.capacitySnapshot) return unit.capacitySnapshot;
  if (typeof unit.capacity_slots === 'number' && unit.capacity_mode && unit.capacity_mode !== 'grid') {
    return {
      theoretical: unit.capacity_slots,
      effective: unit.capacity_slots,
      occupied: typeof unit.sample_count === 'number' ? unit.sample_count : null,
      available:
        typeof unit.sample_count === 'number' ? Math.max(unit.capacity_slots - unit.sample_count, 0) : null,
    } satisfies StorageUnitCapacitySnapshot;
  }

  const template = unit.grid_spec ?? unit.grid_template;
  const occupied = unit.occupied_slots ? Object.keys(unit.occupied_slots) : undefined;
  return computeGridCapacitySnapshot({ template, overrides: unit.overrides, occupiedSlots: occupied });
}

export function normalizeOccupiedSlots(
  source: Iterable<string> | Record<string, unknown>
): string[] {
  if (!source) return [];
  if (Symbol.iterator in Object(source) && typeof source !== 'string' && !Array.isArray(source)) {
    return Array.from(source as Iterable<string>);
  }
  if (Array.isArray(source)) {
    return source.filter((item): item is string => typeof item === 'string');
  }
  return Object.keys(source);
}

export function buildPathFromAncestors(
  unit: StorageUnit,
  lookup?: Map<string, StorageUnit>
): {
  pathIds: string[];
  pathNames: string[];
  fullPath: string;
  depth: number;
} {
  const pathIds = [...(unit.path_ids ?? unit.ancestors ?? []), unit.id];
  let pathNames: string[] = [];

  if (unit.path_names?.length) {
    pathNames = unit.path_names;
  } else if (lookup && unit.ancestors?.length) {
    pathNames = unit.ancestors
      .map((ancestorId) => lookup.get(ancestorId)?.name)
      .filter((name): name is string => Boolean(name));
    pathNames.push(unit.name);
  } else {
    pathNames = [unit.name];
  }

  const fullPath = pathNames.join(' / ');
  const depth = Math.max(pathIds.length - 1, 0);

  return { pathIds, pathNames, fullPath, depth };
}
