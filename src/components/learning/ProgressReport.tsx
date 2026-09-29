import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { Localized, asLocalized, pickLocalized } from '@/lib/localized';
import { ExportCell, ExportColumn, downloadCsv, downloadXlsx } from '@/lib/exportTable';
import type { CourseStatus } from './learningData';
import { courseProgressVariant } from '@/lib/status';

interface ReportRow {
  analystId: string;
  analystName: string;
  projectId: string;
  projectName: string;
  courseId: string;
  courseTitle: Localized;
  totalModules: number;
  passedModules: number;
  currentModule: number | null;
  totalAttempts: number;
  attemptsByModule: { module: number; attempts: number }[];
  startedAt: string | null;
  completedAt: string | null;
  status: CourseStatus;
  percent: number;
}

const ALL = 'all';
const STATUSES: CourseStatus[] = ['notStarted', 'inProgress', 'completed'];

const localDay = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');
const shortDate = (iso: string | null) => (iso ? format(new Date(iso), 'dd/MM/yyyy') : '');

export const ProgressReport = () => {
  const t = useT();
  const { lang } = useLang();
  const tp = t.progress;
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [projectFilter, setProjectFilter] = useState(ALL);
  const [courseFilter, setCourseFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [analystFilter, setAnalystFilter] = useState('');
  const [completedFrom, setCompletedFrom] = useState('');
  const [completedTo, setCompletedTo] = useState('');

  useEffect(() => {
    supabase.rpc('learning_progress_report').then(({ data, error }) => {
      if (error) {
        console.error('Error loading progress report:', error);
        toast({ title: tp.loadFailed, variant: 'destructive' });
      } else {
        setRows((data || []).map((r) => {
          const status: CourseStatus = r.completed_at ? 'completed' : r.started_at ? 'inProgress' : 'notStarted';
          return {
            analystId: r.analyst_id,
            analystName: r.analyst_name,
            projectId: r.project_id,
            projectName: r.project_name,
            courseId: r.course_id,
            courseTitle: asLocalized(r.course_title),
            totalModules: r.total_modules,
            passedModules: r.passed_modules,
            currentModule: r.current_module,
            totalAttempts: r.total_attempts,
            attemptsByModule: (r.attempts_by_module as { module: number; attempts: number }[]) ?? [],
            startedAt: r.started_at,
            completedAt: r.completed_at,
            status,
            // A completed course stays at 100% even if modules were added later.
            percent: status === 'completed'
              ? 100
              : r.total_modules === 0 ? 0 : Math.round((r.passed_modules / r.total_modules) * 100),
          };
        }));
      }
      setLoading(false);
    });
  }, [tp.loadFailed]);

  const projects = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.projectId, r.projectName]));
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const courses = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.courseId, pickLocalized(r.courseTitle, lang)]));
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows, lang]);

  const visible = useMemo(() => {
    const query = analystFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (projectFilter !== ALL && r.projectId !== projectFilter) return false;
      if (courseFilter !== ALL && r.courseId !== courseFilter) return false;
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (query && !r.analystName.toLowerCase().includes(query)) return false;
      if (completedFrom || completedTo) {
        if (!r.completedAt) return false;
        const day = localDay(r.completedAt);
        if (completedFrom && day < completedFrom) return false;
        if (completedTo && day > completedTo) return false;
      }
      return true;
    });
  }, [rows, projectFilter, courseFilter, statusFilter, analystFilter, completedFrom, completedTo]);

  const hasFilters = projectFilter !== ALL || courseFilter !== ALL || statusFilter !== ALL || analystFilter !== '' || completedFrom !== '' || completedTo !== '';
  const clearFilters = () => {
    setProjectFilter(ALL);
    setCourseFilter(ALL);
    setStatusFilter(ALL);
    setAnalystFilter('');
    setCompletedFrom('');
    setCompletedTo('');
  };

  const currentModuleText = (r: ReportRow) =>
    r.completedAt || r.currentModule === null ? tp.allModulesDone : tp.moduleOf(r.currentModule, r.totalModules);
  const attemptsText = (r: ReportRow) =>
    r.attemptsByModule.map((a) => `M${a.module}: ${a.attempts}`).join(' · ');

  const exportColumns: ExportColumn[] = [
    { header: tp.columns.analyst, width: 26 },
    { header: tp.columns.project, width: 18 },
    { header: tp.columns.course, width: 32 },
    { header: tp.columns.status, width: 16 },
    { header: tp.columns.currentModule, width: 16 },
    { header: tp.columns.progress, width: 12 },
    { header: tp.columns.totalAttempts, width: 14 },
    { header: tp.columns.attemptsByModule, width: 28 },
    { header: tp.columns.startedAt, width: 14 },
    { header: tp.columns.completedAt, width: 18 },
  ];
  const exportRows = (): ExportCell[][] => visible.map((r) => [
    r.analystName,
    r.projectName,
    pickLocalized(r.courseTitle, lang),
    t.learning.status[r.status],
    currentModuleText(r),
    r.percent,
    r.totalAttempts,
    attemptsText(r),
    r.startedAt ? new Date(r.startedAt) : null,
    r.completedAt ? new Date(r.completedAt) : null,
  ]);

  const exportFile = async (kind: 'csv' | 'xlsx') => {
    const name = `${tp.fileName}-${format(new Date(), 'yyyy-MM-dd')}`;
    setExporting(true);
    try {
      if (kind === 'csv') downloadCsv(name, exportColumns, exportRows());
      else await downloadXlsx(name, tp.title, exportColumns, exportRows());
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({ title: tp.exportFailed, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{tp.title}</CardTitle>
          <CardDescription>{tp.description}</CardDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => exportFile('csv')} disabled={exporting || visible.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {tp.exportCsv}
          </Button>
          <Button size="sm" onClick={() => exportFile('xlsx')} disabled={exporting || visible.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {tp.exportExcel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="filter-project">{tp.filters.project}</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger id="filter-project"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{tp.filters.all}</SelectItem>
                {projects.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-course">{tp.filters.course}</Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger id="filter-course"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{tp.filters.all}</SelectItem>
                {courses.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-status">{tp.filters.status}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="filter-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{tp.filters.all}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t.learning.status[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-analyst">{tp.filters.analyst}</Label>
            <Input id="filter-analyst" value={analystFilter} onChange={(e) => setAnalystFilter(e.target.value)} placeholder={tp.filters.analystPlaceholder} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-from">{tp.filters.completedFrom}</Label>
            <Input id="filter-from" type="date" value={completedFrom} onChange={(e) => setCompletedFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-to">{tp.filters.completedTo}</Label>
            <Input id="filter-to" type="date" value={completedTo} onChange={(e) => setCompletedTo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">{tp.summary.rows(visible.length)}</p>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>{tp.filters.clear}</Button>}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t.common.loading}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{tp.empty}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{tp.noMatches}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tp.columns.analyst}</TableHead>
                  <TableHead>{tp.columns.project}</TableHead>
                  <TableHead>{tp.columns.course}</TableHead>
                  <TableHead>{tp.columns.status}</TableHead>
                  <TableHead>{tp.columns.currentModule}</TableHead>
                  <TableHead>{tp.columns.progress}</TableHead>
                  <TableHead className="text-right">{tp.columns.totalAttempts}</TableHead>
                  <TableHead>{tp.columns.attemptsByModule}</TableHead>
                  <TableHead>{tp.columns.completedAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={`${r.analystId}-${r.courseId}`}>
                    <TableCell className="font-medium whitespace-nowrap">{r.analystName}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.projectName}</TableCell>
                    <TableCell className="min-w-[160px]">{pickLocalized(r.courseTitle, lang)}</TableCell>
                    <TableCell><Badge variant={courseProgressVariant(r.status)}>{t.learning.status[r.status]}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">{currentModuleText(r)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={r.percent} className="h-2" aria-label={`${tp.columns.progress}: ${r.percent}%`} />
                        <span className="text-xs tabular-nums w-9 text-right">{r.percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.totalAttempts}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{attemptsText(r)}</TableCell>
                    <TableCell className="whitespace-nowrap">{shortDate(r.completedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>;
};
