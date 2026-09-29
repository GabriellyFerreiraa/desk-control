import { differenceInCalendarDays, format } from 'date-fns';
import type { StatusVariant } from '@/lib/status';

// Where an analyst is right now, from their schedule and approved absences.
// This is the single definition of "working" used across the supervisor
// dashboard (status strip, team list, team table).
export type Presence = 'onShift' | 'onLunch' | 'onBreak' | 'absent' | 'offShift' | 'dayOff';

export interface PresenceInfo {
  presence: Presence;
  // HH:MM when the current state ends (e.g. end of lunch), if relevant.
  until?: string;
  // HH:MM when the shift starts, for analysts not yet on shift.
  startsAt?: string;
}

export interface ScheduleProfile {
  user_id: string;
  start_time: string | null;
  end_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  break1_start: string | null;
  break1_end: string | null;
  break2_start: string | null;
  break2_end: string | null;
  work_days: Record<string, { active?: boolean; mode?: string }> | null;
}

export interface AbsenceLike {
  analyst_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

const hhmm = (value: string | null | undefined) => (value ?? '').slice(0, 5);

// Work-day keys are stored as English short names (mon, tue, ...).
export const dayKey = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

// Date-only strings compare correctly as text (YYYY-MM-DD).
export const localIsoDay = (date: Date) => format(date, 'yyyy-MM-dd');

// Approved absences (and approved ones with a pending cancellation) still count.
export const isAbsentOn = (analystId: string, absences: AbsenceLike[], day: string) =>
  absences.some((a) =>
    a.analyst_id === analystId
    && (a.status === 'approved' || a.status === 'cancel_requested')
    && a.start_date <= day
    && a.end_date >= day);

const within = (time: string, start: string | null, end: string | null) =>
  !!start && !!end && time >= hhmm(start) && time < hhmm(end);

export const presenceOf = (profile: ScheduleProfile, absences: AbsenceLike[], now: Date): PresenceInfo => {
  if (isAbsentOn(profile.user_id, absences, localIsoDay(now))) return { presence: 'absent' };

  const today = profile.work_days?.[dayKey(now)];
  if (!today?.active) return { presence: 'dayOff' };

  const time = format(now, 'HH:mm');
  const start = hhmm(profile.start_time) || '09:00';
  const end = hhmm(profile.end_time) || '18:00';
  if (time < start) return { presence: 'offShift', startsAt: start };
  if (time >= end) return { presence: 'offShift' };

  if (within(time, profile.lunch_start, profile.lunch_end)) return { presence: 'onLunch', until: hhmm(profile.lunch_end) };
  if (within(time, profile.break1_start, profile.break1_end)) return { presence: 'onBreak', until: hhmm(profile.break1_end) };
  if (within(time, profile.break2_start, profile.break2_end)) return { presence: 'onBreak', until: hhmm(profile.break2_end) };
  return { presence: 'onShift', until: end };
};

export const PRESENCE_VARIANT: Record<Presence, StatusVariant> = {
  onShift: 'success',
  onLunch: 'info',
  onBreak: 'info',
  absent: 'warning',
  offShift: 'secondary',
  dayOff: 'outline',
};

// Dot color for each presence (same hues as the badges).
export const PRESENCE_DOT: Record<Presence, string> = {
  onShift: 'bg-status-success',
  onLunch: 'bg-status-info',
  onBreak: 'bg-status-info',
  absent: 'bg-status-pending',
  offShift: 'bg-status-neutral/60',
  dayOff: 'bg-status-neutral/30',
};

// Order used in lists: who is around first, then who is not.
export const PRESENCE_ORDER: Record<Presence, number> = {
  onShift: 0,
  onLunch: 1,
  onBreak: 1,
  absent: 2,
  offShift: 3,
  dayOff: 4,
};

// Inclusive length of an absence in days.
export const absenceDays = (startDate: string, endDate: string) =>
  differenceInCalendarDays(new Date(`${endDate}T00:00:00`), new Date(`${startDate}T00:00:00`)) + 1;

// Days from today until the absence starts (negative once it has started).
export const daysUntil = (startDate: string, now: Date) =>
  differenceInCalendarDays(new Date(`${startDate}T00:00:00`), new Date(localIsoDay(now) + 'T00:00:00'));
