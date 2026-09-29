// One place that decides how each domain state looks, so the same state
// has the same color on every screen. Variants are defined in badge.tsx:
//   warning = needs attention / waiting    success = done / approved / active
//   destructive = rejected / failed        info = in progress
//   secondary = neutral / inactive         outline = closed, no action needed

export type StatusVariant = 'warning' | 'success' | 'destructive' | 'info' | 'secondary' | 'outline';

const ABSENCE: Record<string, StatusVariant> = {
  pending: 'warning',
  cancel_requested: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'outline',
};

const TASK: Record<string, StatusVariant> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
};

const USER: Record<string, StatusVariant> = {
  pending: 'warning',
  active: 'success',
  inactive: 'secondary',
};

const COURSE_PROGRESS: Record<string, StatusVariant> = {
  notStarted: 'outline',
  inProgress: 'info',
  completed: 'success',
};

export const absenceStatusVariant = (status: string): StatusVariant => ABSENCE[status] ?? 'outline';
export const taskStatusVariant = (status: string): StatusVariant => TASK[status] ?? 'outline';
export const userStatusVariant = (status: string): StatusVariant => USER[status] ?? 'outline';
export const courseProgressVariant = (status: string): StatusVariant => COURSE_PROGRESS[status] ?? 'outline';
export const publishedVariant = (published: boolean): StatusVariant => (published ? 'success' : 'outline');
