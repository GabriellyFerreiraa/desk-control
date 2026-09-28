import { supabase } from '@/integrations/supabase/client';
import type { Lang } from '@/i18n/strings';

// Must match the bucket created in 20260929120000_learning_content.sql.
export const LEARNING_BUCKET = 'learning-materials';
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

type UploadKind = 'file' | 'video';

const MIME_BY_EXT: Record<string, { mime: string; kind: UploadKind }> = {
  pdf: { mime: 'application/pdf', kind: 'file' },
  doc: { mime: 'application/msword', kind: 'file' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'file' },
  ppt: { mime: 'application/vnd.ms-powerpoint', kind: 'file' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'file' },
  xls: { mime: 'application/vnd.ms-excel', kind: 'file' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'file' },
  mp4: { mime: 'video/mp4', kind: 'video' },
  webm: { mime: 'video/webm', kind: 'video' },
};

export const ACCEPT_BY_KIND: Record<UploadKind, string> = {
  file: Object.entries(MIME_BY_EXT).filter(([, v]) => v.kind === 'file').map(([ext]) => `.${ext}`).join(','),
  video: Object.entries(MIME_BY_EXT).filter(([, v]) => v.kind === 'video').map(([ext]) => `.${ext}`).join(','),
};

const extensionOf = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? '';

// Browsers on Windows sometimes report an empty type for Office files, so
// the MIME type comes from the extension instead of File.type.
export const mimeForUpload = (file: File, kind: UploadKind): string | null => {
  const entry = MIME_BY_EXT[extensionOf(file.name)];
  return entry && entry.kind === kind ? entry.mime : null;
};

export const uploadMaterialFile = async (
  courseId: string,
  materialId: string,
  lang: Lang,
  file: File,
  mime: string,
): Promise<string> => {
  const path = `courses/${courseId}/${materialId}/${lang}-${crypto.randomUUID()}.${extensionOf(file.name)}`;
  const { error } = await supabase.storage.from(LEARNING_BUCKET).upload(path, file, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
};

// Best effort: called after the database rows are gone, so a failure here
// leaves an orphaned file, never a broken material.
export const removeMaterialFiles = async (paths: (string | null | undefined)[]) => {
  const valid = paths.filter((p): p is string => !!p);
  if (valid.length === 0) return;
  const { error } = await supabase.storage.from(LEARNING_BUCKET).remove(valid);
  if (error) console.error('Could not remove learning files', error);
};

// The tab is opened before the await: popup blockers only allow window.open
// inside the click handler itself.
export const openMaterialFile = async (path: string) => {
  const tab = window.open('', '_blank');
  try {
    const { data, error } = await supabase.storage.from(LEARNING_BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    if (tab) {
      tab.opener = null;
      tab.location.href = data.signedUrl;
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
};

export const formatBytes = (bytes: number | null | undefined) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
