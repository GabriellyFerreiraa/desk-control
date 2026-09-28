import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Link2, Undo2, Upload, Video, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/i18n/lang';
import { LANGS, Lang } from '@/i18n/strings';
import { Localized, cleanLocalized, hasText, sameLocalized } from '@/lib/localized';
import { ACCEPT_BY_KIND, MAX_FILE_BYTES, formatBytes, mimeForUpload, removeMaterialFiles, uploadMaterialFile } from '@/lib/learningFiles';
import { LocalizedFields } from './LocalizedFields';
import type { MaterialKind, MaterialNode, VersionNode } from './courseTree';

interface Slot {
  existing?: VersionNode;
  file: File | null;
  url: string;
  remove: boolean;
}

type Slots = Record<Lang, Slot>;

const KIND_ICONS: Record<MaterialKind, typeof FileText> = { file: FileText, video: Video, link: Link2 };
const KINDS: MaterialKind[] = ['file', 'video', 'link'];
const HTTPS = /^https:\/\//i;

const slotsFor = (material: MaterialNode | null): Slots => {
  const slots = {} as Slots;
  for (const lang of LANGS) {
    const existing = material?.versions.find((v) => v.language === lang);
    slots[lang] = { existing, file: null, url: existing?.url ?? '', remove: false };
  }
  return slots;
};

interface MaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  moduleId: string;
  material: MaterialNode | null;
  nextPosition: number;
  onSaved: () => void;
}

export const MaterialDialog = ({ open, onOpenChange, courseId, moduleId, material, nextPosition, onSaved }: MaterialDialogProps) => {
  const t = useT();
  const tc = t.admin.courses;
  const [kind, setKind] = useState<MaterialKind>('file');
  const [title, setTitle] = useState<Localized>({});
  const [slots, setSlots] = useState<Slots>(() => slotsFor(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(material?.kind ?? 'file');
    setTitle(material?.title ?? {});
    setSlots(slotsFor(material));
  }, [open, material]);

  const updateSlot = (lang: Lang, patch: Partial<Slot>) => setSlots((prev) => ({ ...prev, [lang]: { ...prev[lang], ...patch } }));

  const pickFile = (lang: Lang, file: File | undefined) => {
    if (!file || kind === 'link') return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: tc.materialErrors.fileTooBig, variant: 'destructive' });
      return;
    }
    if (!mimeForUpload(file, kind)) {
      toast({ title: tc.materialErrors.fileType, variant: 'destructive' });
      return;
    }
    updateSlot(lang, { file, remove: false });
  };

  const validate = (): string | null => {
    if (!hasText(title)) return tc.materialErrors.titleRequired;
    const available = LANGS.filter((lang) => {
      const slot = slots[lang];
      if (kind === 'link') return slot.url.trim() !== '';
      return slot.file !== null || (!!slot.existing && !slot.remove);
    });
    if (available.length === 0) return tc.materialErrors.versionRequired;
    if (kind === 'link' && LANGS.some((lang) => slots[lang].url.trim() && !HTTPS.test(slots[lang].url.trim()))) {
      return tc.materialErrors.urlInvalid;
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      toast({ title: problem, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const isNew = !material;
    let materialId = material?.id ?? null;
    // Files uploaded in this save whose row wasn't written yet; removed if
    // the save fails so they don't pile up in storage.
    const pendingUploads: string[] = [];
    const replacedFiles: string[] = [];
    try {
      const cleanTitle = cleanLocalized(title);
      if (!materialId) {
        const { data, error } = await supabase
          .from('module_materials')
          .insert({ module_id: moduleId, kind, title: cleanTitle, position: nextPosition })
          .select('id')
          .single();
        if (error) throw error;
        materialId = data.id;
      } else if (!sameLocalized(title, material!.title)) {
        const { error } = await supabase.from('module_materials').update({ title: cleanTitle }).eq('id', materialId);
        if (error) throw error;
      }

      for (const lang of LANGS) {
        const slot = slots[lang];
        const existing = slot.existing;

        if (kind === 'link') {
          const url = slot.url.trim();
          if (url && url !== existing?.url) {
            const { error } = await supabase.from('material_versions').upsert(
              { material_id: materialId, language: lang, url, storage_path: null, file_name: null, mime_type: null, size_bytes: null },
              { onConflict: 'material_id,language' },
            );
            if (error) throw error;
          } else if (!url && existing) {
            const { error } = await supabase.from('material_versions').delete().eq('id', existing.id);
            if (error) throw error;
          }
          continue;
        }

        if (slot.file) {
          const mime = mimeForUpload(slot.file, kind)!;
          const path = await uploadMaterialFile(courseId, materialId, lang, slot.file, mime);
          pendingUploads.push(path);
          const { error } = await supabase.from('material_versions').upsert(
            { material_id: materialId, language: lang, storage_path: path, url: null, file_name: slot.file.name, mime_type: mime, size_bytes: slot.file.size },
            { onConflict: 'material_id,language' },
          );
          if (error) throw error;
          pendingUploads.pop();
          if (existing?.storage_path) replacedFiles.push(existing.storage_path);
        } else if (slot.remove && existing) {
          const { error } = await supabase.from('material_versions').delete().eq('id', existing.id);
          if (error) throw error;
          if (existing.storage_path) replacedFiles.push(existing.storage_path);
        }
      }

      await removeMaterialFiles(replacedFiles);
      toast({ title: tc.saved });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error('Error saving material:', error);
      if (isNew && materialId) {
        await supabase.from('module_materials').delete().eq('id', materialId);
      }
      await removeMaterialFiles(pendingUploads);
      toast({ title: tc.saveFailed, variant: 'destructive' });
      if (!isNew) onSaved();
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[hsl(var(--panel))]">
        <DialogHeader>
          <DialogTitle>{material ? tc.materialDialogEdit : tc.materialDialogNew}</DialogTitle>
          <DialogDescription>{tc.langHint}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{tc.materialType}</Label>
            <RadioGroup
              value={kind}
              onValueChange={(value) => {
                // Files picked for one type don't fit another; start over.
                setKind(value as MaterialKind);
                setSlots(slotsFor(null));
              }}
              className="grid sm:grid-cols-3 gap-2"
              disabled={!!material || saving}
            >
              {KINDS.map((k) => {
                const Icon = KIND_ICONS[k];
                return <Label
                    key={k}
                    htmlFor={`kind-${k}`}
                    className={`flex items-center gap-2 rounded-md border p-3 font-normal cursor-pointer ${kind === k ? 'border-primary' : ''} ${material ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <RadioGroupItem id={`kind-${k}`} value={k} />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {tc.kind[k]}
                  </Label>;
              })}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">{tc.kindHint[kind]}</p>
          </div>

          <LocalizedFields id="material-title" label={tc.materialTitle} value={title} onChange={setTitle} disabled={saving} />

          <div className="space-y-2">
            <Label>{tc.versions}</Label>
            <p className="text-xs text-muted-foreground">{tc.versionsHint}</p>
            <div className="space-y-2">
              {LANGS.map((lang) => {
                const slot = slots[lang];
                const inputId = `material-file-${lang}`;
                return <div key={lang} className="flex items-center gap-2 min-h-10">
                    <span className="w-7 shrink-0 text-xs font-semibold text-muted-foreground">{lang.toUpperCase()}</span>
                    {kind === 'link' ? (
                      <Input
                        value={slot.url}
                        onChange={(e) => updateSlot(lang, { url: e.target.value })}
                        placeholder={tc.urlPlaceholder}
                        disabled={saving}
                        aria-label={`URL (${lang.toUpperCase()})`}
                        className="bg-[hsl(var(--field))]"
                      />
                    ) : (
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <span className={`flex-1 truncate text-sm ${slot.remove ? 'line-through text-muted-foreground' : ''}`}>
                          {slot.file
                            ? `${slot.file.name} (${formatBytes(slot.file.size)})`
                            : slot.existing
                              ? `${slot.existing.file_name ?? ''} (${formatBytes(slot.existing.size_bytes)})`
                              : <span className="text-muted-foreground">{tc.missing}</span>}
                        </span>
                        {slot.remove && <span className="text-xs text-muted-foreground">{tc.willBeRemoved}</span>}
                        <input
                          id={inputId}
                          type="file"
                          accept={ACCEPT_BY_KIND[kind]}
                          className="sr-only"
                          disabled={saving}
                          onChange={(e) => {
                            pickFile(lang, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                        <Button asChild variant="outline" size="sm" className={saving ? 'pointer-events-none opacity-50' : ''}>
                          <label htmlFor={inputId} className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-1.5" />
                            {slot.file || slot.existing ? tc.replaceFile : tc.chooseFile}
                          </label>
                        </Button>
                        {slot.file && (
                          <Button variant="ghost" size="sm" onClick={() => updateSlot(lang, { file: null })} disabled={saving} aria-label={tc.removeFile}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {!slot.file && slot.existing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSlot(lang, { remove: !slot.remove })}
                            disabled={saving}
                            aria-label={slot.remove ? tc.undoRemove : tc.removeFile}
                          >
                            {slot.remove ? <Undo2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>;
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving}>{saving ? tc.uploading : t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};
