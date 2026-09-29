import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowDown, ArrowUp, Check, FileText, Link2, Pencil, Plus, Trash2, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { Localized, cleanLocalized, pickLocalized, sameLocalized } from '@/lib/localized';
import { openMaterialFile, removeMaterialFiles } from '@/lib/learningFiles';
import { ConfirmAction } from './ConfirmAction';
import { LocalizedFields } from './LocalizedFields';
import { MaterialDialog } from './MaterialDialog';
import { QuestionDialog } from './QuestionDialog';
import { MaterialNode, ModuleNode, QuestionNode, VersionNode, moveId, storagePathsOf } from './courseTree';

const KIND_ICONS = { file: FileText, video: Video, link: Link2 };

interface ModuleEditorProps {
  courseId: string;
  module: ModuleNode;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onChanged: () => void;
}

export const ModuleEditor = ({ courseId, module, index, total, onMove, onChanged }: ModuleEditorProps) => {
  const t = useT();
  const { lang } = useLang();
  const tc = t.admin.courses;

  const [title, setTitle] = useState<Localized>(module.title);
  const [description, setDescription] = useState<Localized>(module.description);
  const [savingDetails, setSavingDetails] = useState(false);
  const [passScore, setPassScore] = useState(String(module.passScore));
  const [materialDialog, setMaterialDialog] = useState<{ open: boolean; material: MaterialNode | null }>({ open: false, material: null });
  const [questionDialog, setQuestionDialog] = useState<{ open: boolean; question: QuestionNode | null }>({ open: false, question: null });

  // Every save reloads the whole course, so `module` is a new object each
  // time. Reset the form only when the stored values change, or unsaved
  // edits here would vanish whenever something else in the module is saved.
  const savedTitle = JSON.stringify(module.title);
  const savedDescription = JSON.stringify(module.description);
  useEffect(() => setTitle(JSON.parse(savedTitle)), [savedTitle]);
  useEffect(() => setDescription(JSON.parse(savedDescription)), [savedDescription]);
  useEffect(() => setPassScore(String(module.passScore)), [module.passScore]);

  const detailsDirty = !sameLocalized(title, module.title) || !sameLocalized(description, module.description);
  const passScoreNumber = Number(passScore);
  const passScoreValid = Number.isInteger(passScoreNumber) && passScoreNumber >= 70 && passScoreNumber <= 100;
  const passScoreDirty = passScoreNumber !== module.passScore;

  const run = async (action: () => PromiseLike<{ error: unknown }>, successTitle = tc.saved) => {
    const { error } = await action();
    if (error) {
      console.error('Module editor error:', error);
      toast({ title: tc.saveFailed, variant: 'destructive' });
      return false;
    }
    toast({ title: successTitle });
    onChanged();
    return true;
  };

  const saveDetails = async () => {
    setSavingDetails(true);
    await run(() => supabase.from('modules')
      .update({ title: cleanLocalized(title), description: cleanLocalized(description) })
      .eq('id', module.id));
    setSavingDetails(false);
  };

  const savePassScore = async () => {
    if (!passScoreValid) {
      toast({ title: tc.passScoreInvalid, variant: 'destructive' });
      return;
    }
    await run(() => supabase.from('quizzes').update({ pass_score: passScoreNumber }).eq('module_id', module.id));
  };

  const deleteModule = async () => {
    const paths = storagePathsOf(module.materials);
    if (await run(() => supabase.from('modules').delete().eq('id', module.id), tc.deleted)) {
      await removeMaterialFiles(paths);
    }
  };

  const deleteMaterial = async (material: MaterialNode) => {
    const paths = storagePathsOf([material]);
    if (await run(() => supabase.from('module_materials').delete().eq('id', material.id), tc.deleted)) {
      await removeMaterialFiles(paths);
    }
  };

  const reorder = (kind: 'materials' | 'questions', ids: string[], itemIndex: number, direction: -1 | 1) => {
    const next = moveId(ids, itemIndex, direction);
    if (next) run(() => supabase.rpc('admin_reorder', { _kind: kind, _ids: next }));
  };

  const openVersion = async (material: MaterialNode, version: VersionNode) => {
    if (material.kind === 'link' && version.url) {
      window.open(version.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (version.storage_path) {
      try {
        await openMaterialFile(version.storage_path);
      } catch (error) {
        console.error('Error opening file:', error);
        toast({ title: tc.openFailed, variant: 'destructive' });
      }
    }
  };

  const materialIds = module.materials.map((m) => m.id);
  const questionIds = module.questions.map((q) => q.id);

  return <div className="space-y-6">
      {/* Module details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{tc.moduleDetails}</h4>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={tc.moveUp}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={tc.moveDown}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <ConfirmAction
              trigger={<Button variant="ghost" size="sm" aria-label={tc.delete}><Trash2 className="h-4 w-4" /></Button>}
              title={tc.deleteModuleTitle}
              description={tc.deleteModuleBody}
              confirmLabel={tc.confirmDelete}
              onConfirm={deleteModule}
            />
          </div>
        </div>
        <LocalizedFields id={`module-title-${module.id}`} label={tc.titleLabel} value={title} onChange={setTitle} disabled={savingDetails} />
        <LocalizedFields id={`module-desc-${module.id}`} label={tc.descriptionLabel} value={description} onChange={setDescription} multiline disabled={savingDetails} />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={saveDetails} disabled={!detailsDirty || savingDetails}>
            {savingDetails ? t.common.saving : tc.saveDetails}
          </Button>
          {detailsDirty && <span className="text-xs text-muted-foreground">{tc.unsaved}</span>}
        </div>
      </div>

      <Separator />

      {/* Materials */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">{tc.materials}</h4>
            <p className="text-xs text-muted-foreground">{tc.materialsHint}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMaterialDialog({ open: true, material: null })}>
            <Plus className="h-4 w-4 mr-2" />
            {tc.addMaterial}
          </Button>
        </div>
        {module.materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tc.noMaterials}</p>
        ) : (
          <ul className="space-y-2">
            {module.materials.map((material, i) => {
              const Icon = KIND_ICONS[material.kind];
              return <li key={material.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pickLocalized(material.title, lang)}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="text-xs text-muted-foreground">{tc.kind[material.kind]}</span>
                        {[...material.versions].sort((a, b) => a.language.localeCompare(b.language)).map((version) => (
                          <button
                            key={version.id}
                            type="button"
                            onClick={() => openVersion(material, version)}
                            title={`${tc.open} (${version.language.toUpperCase()})`}
                          >
                            <Badge variant="outline" className="hover:border-primary hover:text-foreground">
                              {version.language.toUpperCase()}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => reorder('materials', materialIds, i, -1)} disabled={i === 0} aria-label={tc.moveUp}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => reorder('materials', materialIds, i, 1)} disabled={i === materialIds.length - 1} aria-label={tc.moveDown}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setMaterialDialog({ open: true, material })} aria-label={tc.edit}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmAction
                      trigger={<Button variant="ghost" size="sm" aria-label={tc.delete}><Trash2 className="h-4 w-4" /></Button>}
                      title={tc.deleteMaterialTitle}
                      description={tc.deleteMaterialBody}
                      confirmLabel={tc.confirmDelete}
                      onConfirm={() => deleteMaterial(material)}
                    />
                  </div>
                </li>;
            })}
          </ul>
        )}
      </div>

      <Separator />

      {/* Quiz */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">{tc.quiz}</h4>
            <p className="text-xs text-muted-foreground">{tc.quizHint}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setQuestionDialog({ open: true, question: null })}>
            <Plus className="h-4 w-4 mr-2" />
            {tc.addQuestion}
          </Button>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`pass-score-${module.id}`}>{tc.passScore}</Label>
            <Input
              id={`pass-score-${module.id}`}
              type="number"
              min={70}
              max={100}
              step={1}
              value={passScore}
              onChange={(e) => setPassScore(e.target.value)}
              className="w-28 bg-[hsl(var(--field))]"
              aria-describedby={`pass-score-hint-${module.id}`}
            />
          </div>
          <Button size="sm" variant="outline" onClick={savePassScore} disabled={!passScoreDirty}>
            {t.common.save}
          </Button>
          <span id={`pass-score-hint-${module.id}`} className={`text-xs pb-2 ${passScoreValid ? 'text-muted-foreground' : 'text-destructive'}`}>
            {passScoreValid ? tc.passScoreHint : tc.passScoreInvalid}
          </span>
        </div>

        {module.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tc.noQuestions}</p>
        ) : (
          <ol className="space-y-2">
            {module.questions.map((question, i) => (
              <li key={question.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{i + 1}. {pickLocalized(question.prompt, lang)}</p>
                    <Badge variant="outline" className="mt-1">{tc.questionType[question.type]}</Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => reorder('questions', questionIds, i, -1)} disabled={i === 0} aria-label={tc.moveUp}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => reorder('questions', questionIds, i, 1)} disabled={i === questionIds.length - 1} aria-label={tc.moveDown}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setQuestionDialog({ open: true, question })} aria-label={tc.edit}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmAction
                      trigger={<Button variant="ghost" size="sm" aria-label={tc.delete}><Trash2 className="h-4 w-4" /></Button>}
                      title={tc.deleteQuestionTitle}
                      description={tc.deleteQuestionBody}
                      confirmLabel={tc.confirmDelete}
                      onConfirm={() => run(() => supabase.from('quiz_questions').delete().eq('id', question.id), tc.deleted)}
                    />
                  </div>
                </div>
                <ul className="space-y-1 pl-4">
                  {question.options.map((option) => (
                    <li key={option.id} className={`flex items-center gap-2 text-sm ${option.is_correct ? 'font-medium' : 'text-muted-foreground'}`}>
                      {option.is_correct ? <Check className="h-3.5 w-3.5 text-primary" aria-label={tc.correct} /> : <span className="w-3.5" />}
                      {pickLocalized(option.label, lang)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>

      <MaterialDialog
        open={materialDialog.open}
        onOpenChange={(open) => setMaterialDialog((d) => ({ ...d, open }))}
        courseId={courseId}
        moduleId={module.id}
        material={materialDialog.material}
        nextPosition={Math.max(-1, ...module.materials.map((m) => m.position)) + 1}
        onSaved={onChanged}
      />
      <QuestionDialog
        open={questionDialog.open}
        onOpenChange={(open) => setQuestionDialog((d) => ({ ...d, open }))}
        moduleId={module.id}
        question={questionDialog.question}
        onSaved={onChanged}
      />
    </div>;
};
