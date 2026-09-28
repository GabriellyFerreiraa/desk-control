import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/UserAvatar';
import { Pencil, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/i18n/lang';

type Project = Database['public']['Tables']['projects']['Row'];
type Role = Database['public']['Enums']['app_role'];
type Person = { user_id: string; name: string; avatar_url: string | null; role: Role; project_id: string | null };

interface Draft {
  id: string | null;
  name: string;
  active: boolean;
  leadIds: string[];
}

const EMPTY_DRAFT: Draft = { id: null, name: '', active: true, leadIds: [] };

export const ProjectsPanel = () => {
  const t = useT();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leadsByProject, setLeadsByProject] = useState<Record<string, string[]>>({});
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [
        { data: projectRows, error: projectsError },
        { data: leadRows, error: leadsError },
        { data: personRows, error: peopleError },
      ] = await Promise.all([
        supabase.from('projects').select('*').order('name'),
        supabase.from('project_leads').select('project_id, lead_id'),
        supabase.from('profiles').select('user_id, name, avatar_url, role, project_id').order('name'),
      ]);
      if (projectsError || leadsError || peopleError) throw projectsError || leadsError || peopleError;

      const grouped: Record<string, string[]> = {};
      for (const row of leadRows || []) {
        (grouped[row.project_id] ||= []).push(row.lead_id);
      }
      setProjects(projectRows || []);
      setLeadsByProject(grouped);
      setPeople(personRows || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({ title: t.common.error, description: t.admin.projects.saveFailed, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const personById = (id: string) => people.find((p) => p.user_id === id);
  const leadCandidates = people.filter((p) => p.role === 'lead' || p.role === 'admin');

  const openNew = () => setDraft(EMPTY_DRAFT);
  const openEdit = (project: Project) => setDraft({
    id: project.id,
    name: project.name,
    active: project.active,
    leadIds: leadsByProject[project.id] || [],
  });

  const toggleLead = (leadId: string, checked: boolean) => {
    setDraft((d) => d && {
      ...d,
      leadIds: checked ? [...d.leadIds, leadId] : d.leadIds.filter((id) => id !== leadId),
    });
  };

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast({ title: t.admin.projects.nameRequired, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let projectId = draft.id;
      if (projectId) {
        const { error } = await supabase.from('projects').update({ name, active: draft.active }).eq('id', projectId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('projects').insert({ name, active: draft.active }).select('id').single();
        if (error) throw error;
        projectId = data.id;
      }

      const current = leadsByProject[projectId] || [];
      const removed = current.filter((id) => !draft.leadIds.includes(id));
      const added = draft.leadIds.filter((id) => !current.includes(id));
      if (removed.length > 0) {
        const { error } = await supabase.from('project_leads').delete().eq('project_id', projectId).in('lead_id', removed);
        if (error) throw error;
      }
      if (added.length > 0) {
        const { error } = await supabase.from('project_leads').insert(added.map((lead_id) => ({ project_id: projectId!, lead_id })));
        if (error) throw error;
      }

      toast({ title: t.admin.projects.saved, description: name });
      setDraft(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving project:', error);
      const duplicate = (error as { code?: string })?.code === '23505';
      toast({
        title: duplicate ? t.admin.projects.nameTaken : t.admin.projects.saveFailed,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return <Card className="bg-[hsl(var(--panel))]">
      <CardHeader className="bg-[hsl(var(--panel))] flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t.admin.projects.title}</CardTitle>
          <CardDescription>{t.admin.projects.description}</CardDescription>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t.admin.projects.new}
        </Button>
      </CardHeader>
      <CardContent className="bg-[hsl(var(--panel))]">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t.common.loading}</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t.admin.projects.empty}</p>
        ) : (
          <ul className="divide-y">
            {projects.map((project) => {
              const leads = (leadsByProject[project.id] || []).map(personById).filter(Boolean) as Person[];
              const memberCount = people.filter((p) => p.project_id === project.id).length;
              return <li key={project.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{project.name}</span>
                      {!project.active && <Badge variant="outline">{t.status.inactive}</Badge>}
                      <span className="text-xs text-muted-foreground">{t.admin.projects.members(memberCount)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-muted-foreground">{t.admin.projects.leads}:</span>
                      {leads.length === 0 ? (
                        <span className="text-muted-foreground">{t.admin.projects.noLeads}</span>
                      ) : leads.map((lead) => (
                        <span key={lead.user_id} className="inline-flex items-center gap-1.5">
                          <UserAvatar src={lead.avatar_url} name={lead.name} size="xs" />
                          {lead.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(project)} aria-label={`${t.admin.projects.edit}: ${project.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </li>;
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-md bg-[hsl(var(--panel))]">
          <DialogHeader>
            <DialogTitle>{draft?.id ? t.admin.projects.edit : t.admin.projects.new}</DialogTitle>
          </DialogHeader>
          {draft && <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="project-name">{t.admin.projects.name}</Label>
                <Input
                  id="project-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder={t.admin.projects.namePlaceholder}
                  className="bg-[hsl(var(--field))]"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="project-active">{t.admin.projects.active}</Label>
                <Switch
                  id="project-active"
                  checked={draft.active}
                  onCheckedChange={(checked) => setDraft({ ...draft, active: checked })}
                />
              </div>

              <div className="space-y-3">
                <Label>{t.admin.projects.leads}</Label>
                {leadCandidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.admin.projects.noLeadCandidates}</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {leadCandidates.map((person) => {
                      const id = `lead-${person.user_id}`;
                      return <div key={person.user_id} className="flex items-center gap-3">
                          <Checkbox
                            id={id}
                            checked={draft.leadIds.includes(person.user_id)}
                            onCheckedChange={(checked) => toggleLead(person.user_id, checked === true)}
                          />
                          <Label htmlFor={id} className="flex items-center gap-2 font-normal cursor-pointer">
                            <UserAvatar src={person.avatar_url} name={person.name} size="xs" />
                            {person.name}
                            <span className="text-xs text-muted-foreground">({t.roles[person.role]})</span>
                          </Label>
                        </div>;
                    })}
                  </div>
                )}
              </div>
            </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>{t.common.cancel}</Button>
            <Button onClick={save} disabled={saving}>{saving ? t.common.saving : t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>;
};
