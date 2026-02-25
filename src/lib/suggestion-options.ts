import { SuggestionCategory, SuggestionOwnerEffort, SuggestionStatus } from '@prisma/client';

export const SUSTAINABILITY_PLAN_OPTIONS = [
  'I can do this myself this stay',
  'I can do this next time',
  'Another guest could do this easily',
  'Owner action needed, but <15 minutes',
] as const;

export type SustainabilityPlanValue = (typeof SUSTAINABILITY_PLAN_OPTIONS)[number];

export const SUGGESTION_CATEGORY_OPTIONS: Array<{ value: SuggestionCategory; label: string }> = [
  { value: 'SUPPLIES_RESTOCK', label: 'Supplies / restock' },
  { value: 'LAYOUT_COMFORT', label: 'Layout / comfort' },
  { value: 'INSTRUCTIONS_GUIDEBOOK', label: 'Instructions / guidebook' },
  { value: 'CLEANING_TURNOVER', label: 'Cleaning / turnover' },
  { value: 'SAFETY_SECURITY', label: 'Safety / security' },
  { value: 'OTHER', label: 'Other' },
];

export const OWNER_EFFORT_OPTIONS: Array<{ value: SuggestionOwnerEffort; label: string }> = [
  { value: 'ZERO_MIN', label: '0 min' },
  { value: 'LT_5_MIN', label: '< 5 min' },
  { value: 'MIN_5_TO_15', label: '5–15 min' },
  { value: 'MIN_15_TO_60', label: '15–60 min' },
  { value: 'GT_60_MIN', label: '> 60 min (likely not sustainable)' },
];

export const SUGGESTION_STATUS_OPTIONS: Array<{ value: SuggestionStatus; label: string }> = [
  { value: 'NEW', label: 'New' },
  { value: 'REVIEWING', label: 'Under review' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DONE', label: 'Done' },
  { value: 'DECLINED', label: 'Declined' },
];

export function categoryLabel(value: SuggestionCategory): string {
  return SUGGESTION_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function ownerEffortLabel(value: SuggestionOwnerEffort): string {
  return OWNER_EFFORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function suggestionStatusLabel(value: SuggestionStatus): string {
  return SUGGESTION_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
