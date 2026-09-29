import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, parseISO, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Building2, Home, User } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useT } from '@/i18n/lang';
import { useDateLocale } from '@/i18n/dates';
interface AbsenceRequest {
  id: string;
  analyst_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  analyst_profile?: {
    name: string;
    avatar_url?: string | null;
  };
}
interface Analyst {
  id: string;
  user_id: string;
  name: string;
  role: string;
  start_time: string;
  end_time: string;
  work_days: any;
  avatar_url?: string | null;
}
interface TeamCalendarProps {
  className?: string;
  // Limit the calendar to these analysts (a lead's team). All analysts if omitted.
  memberIds?: string[];
}
export const TeamCalendar = ({
  className,
  memberIds
}: TeamCalendarProps) => {
  const inScope = (userId: string) => !memberIds || memberIds.includes(userId);
  const {
    user,
    userProfile
  } = useAuth();
  const t = useT();
  const locale = useDateLocale();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [
        { data: absenceData, error: absenceError },
        { data: analystData, error: analystError }
      ] = await Promise.all([
        supabase.from('absence_requests').select('*, analyst_profile:profiles!absence_requests_analyst_id_fkey(name, avatar_url)').eq('status', 'approved').order('start_date', {
          ascending: true
        }),
        supabase.from('profiles').select('*').order('name', {
          ascending: true
        })
      ]);
      if (absenceError) throw absenceError;
      if (analystError) throw analystError;
      setAbsenceRequests(absenceData || []);
      setAnalysts(analystData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('team-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_requests' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  const getAbsencesForDate = (date: Date) => {
    return absenceRequests.filter(request => inScope(request.analyst_id)).filter(request => {
      const startDate = new Date(request.start_date + 'T00:00:00');
      const endDate = new Date(request.end_date + 'T23:59:59');
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return checkDate >= new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) && checkDate <= new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    });
  };
  const getSelectedDateAbsences = () => {
    return getAbsencesForDate(selectedDate);
  };
  const formatAbsenceDisplay = (request: AbsenceRequest) => {
    const isOwner = request.analyst_id === user?.id;
    const isLead = userProfile?.role === 'lead' || userProfile?.role === 'admin';
    if (isOwner || isLead) {
      return {
        title: request.analyst_profile?.name || t.calendar.analyst,
        subtitle: request.reason
      };
    } else {
      return {
        title: request.analyst_profile?.name || t.calendar.analyst,
        subtitle: t.calendar.dayOff
      };
    }
  };
  const getWorkingAnalysts = (date: Date) => {
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNames[getDay(date)];
    const absentsOnDate = getAbsencesForDate(date);
    const absentAnalystIds = absentsOnDate.map(absence => absence.analyst_id);
    // Only analysts count as "working"; leads and admins have their own view.
    return analysts.filter(analyst => analyst.role === 'analyst' && inScope(analyst.user_id)).filter(analyst => {
      // Check if analyst is not absent on this date
      if (absentAnalystIds.includes(analyst.user_id)) return false;

      // Check if analyst is scheduled to work on this day
      const workDay = analyst.work_days && typeof analyst.work_days === 'object' ? analyst.work_days[dayName] : null;
      return workDay && workDay.active === true;
    });
  };
  const formatWorkMode = (mode: string) => {
    return mode === 'home' ? t.workMode.homeLong : t.workMode.office;
  };
  const modifiers = {
    hasAbsence: (date: Date) => getAbsencesForDate(date).length > 0
  };
  // A dot under the day number (see .day-has-absence in index.css), so the
  // today ring and the selected fill stay visible on days with absences.
  const modifiersClassNames = {
    hasAbsence: 'day-has-absence'
  };
  const selectedIsToday = isToday(selectedDate);
  const shortDate = format(selectedDate, 'EEE d MMM', { locale });
  if (loading) {
    return <Card className={className}>
        <CardHeader>
          <CardTitle>{t.calendar.loadingTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-sm text-muted-foreground">{t.calendar.loading}</div>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className={className}>
      <CardHeader>
        <CardTitle>{t.calendar.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Calendar */}
          <div className="flex justify-center">
            <div className="space-y-2">
              <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} modifiers={modifiers} modifiersClassNames={modifiersClassNames} locale={locale} className={cn("p-3 pointer-events-auto border rounded-md")} />
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-sm ring-1 ring-inset ring-primary" aria-hidden />{t.calendar.legendToday}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-status-pending" aria-hidden />{t.calendar.legendAbsence}</span>
              </div>
            </div>
          </div>

          {/* Analysts Working Today */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {selectedIsToday ? t.calendar.workingToday : t.calendar.workingOn(shortDate)}
              <span className="ml-auto text-xs font-normal text-muted-foreground">{getWorkingAnalysts(selectedDate).length}</span>
            </h3>
            
            {getWorkingAnalysts(selectedDate).length === 0 ? <p className="text-sm text-muted-foreground">
                {t.calendar.noneWorking}
              </p> : <ul className="divide-y rounded-md border">
                {getWorkingAnalysts(selectedDate).map((analyst) => {
              const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
              const dayName = dayNames[getDay(selectedDate)];
              const workDay = analyst.work_days && typeof analyst.work_days === 'object' ? analyst.work_days[dayName] : null;
              const mode = workDay?.mode || 'office';
              const ModeIcon = mode === 'home' ? Home : Building2;
              return <li key={analyst.id} className="flex items-center gap-3 px-3 py-2">
                      <UserAvatar src={analyst.avatar_url as any} name={analyst.name} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{analyst.name}</p>
                        <p className="text-xs text-muted-foreground">{(t.roles as Record<string, string>)[analyst.role] ?? analyst.role}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p className="text-foreground">{analyst.start_time?.substring(0, 5)} - {analyst.end_time?.substring(0, 5)}</p>
                        <p className="inline-flex items-center gap-1"><ModeIcon className="h-3 w-3" aria-hidden />{formatWorkMode(mode)}</p>
                      </div>
                    </li>;
            })}
              </ul>}
          </div>

          {/* Absences Today */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-status-pending" aria-hidden />
              {selectedIsToday ? t.calendar.absencesToday : t.calendar.absencesOn(shortDate)}
              <span className="ml-auto text-xs font-normal text-muted-foreground">{getSelectedDateAbsences().length}</span>
            </h3>
            
            {getSelectedDateAbsences().length === 0 ? <p className="text-sm text-muted-foreground">
                {t.calendar.noAbsences}
              </p> : <ul className="space-y-2">
                {getSelectedDateAbsences().map((request) => {
              const displayInfo = formatAbsenceDisplay(request);
              return <li key={request.id} className="rounded-md border border-l-2 border-l-status-pending px-3 py-2">
                      <div className="flex items-center gap-2">
                        <UserAvatar src={request.analyst_profile?.avatar_url as any} name={displayInfo.title} size="xs" />
                        <p className="text-sm font-medium">
                          {displayInfo.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {displayInfo.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(request.start_date), 'd MMM', { locale })} - {format(parseISO(request.end_date), 'd MMM', { locale })}
                      </p>
                    </li>;
            })}
              </ul>}
          </div>
        </div>

      </CardContent>
    </Card>;
};