// Builds the ZOEF demo course: 9 PDFs (3 modules x EN/ES/PT) and the seed SQL.
// Usage: node build.mjs <pdfOutDir> <sqlOutFile>
import { existsSync, mkdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { course, labels, modules } from './content.mjs';

const [pdfDir, sqlFile] = process.argv.slice(2);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const LANGS = ['en', 'es', 'pt'];

// ---------------------------------------------------------------- PDFs
const esc = (s) => s; // content is trusted, authored above (contains <b>/<i>)

const html = (m, index, lang) => {
  const l = labels[lang];
  const sections = m.sections[lang].map(([title, items]) => `
    <section>
      <h2>${title}</h2>
      ${items.length === 1 ? `<p>${esc(items[0])}</p>` : `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`}
    </section>`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm 18mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, 'Segoe UI', sans-serif; color: #1a1f2b; font-size: 10.5pt; line-height: 1.55; margin: 0; }
  .band { border-left: 4px solid #047857; padding: 2mm 0 2mm 5mm; margin-bottom: 8mm; }
  .eyebrow { font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; color: #047857; font-weight: 600; }
  h1 { font-size: 20pt; margin: 1.5mm 0 1mm; line-height: 1.2; }
  .lead { color: #4b5563; margin: 0; }
  h2 { font-size: 12pt; margin: 6mm 0 1.5mm; color: #111827; }
  section p, section ul { margin: 0; }
  ul { padding-left: 5mm; }
  li { margin: 1mm 0; }
  i { color: #4b5563; }
  .key { margin-top: 8mm; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 3mm; padding: 4mm 5mm; }
  .key h2 { margin-top: 0; color: #065f46; }
  .note { margin-top: 10mm; padding-top: 3mm; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #6b7280; }
</style></head><body>
  <div class="band">
    <div class="eyebrow">DeskControl · ZOEF · ${l.module} ${index + 1}</div>
    <h1>${m.title[lang]}</h1>
    <p class="lead">${m.description[lang]}</p>
  </div>
  ${sections}
  <div class="key"><h2>${l.keyPoints}</h2><ul>${m.keyPoints[lang].map((k) => `<li>${k}</li>`).join('')}</ul></div>
  <p class="note">${l.note}</p>
</body></html>`;
};

mkdirSync(pdfDir, { recursive: true });
const work = join(tmpdir(), `zoef-${Date.now()}`);
mkdirSync(work, { recursive: true });
const ONLY = process.env.ONLY;
for (const [index, m] of modules.entries()) {
  for (const lang of LANGS) {
    const name = `ZOEF-M${index + 1}-${lang.toUpperCase()}`;
    if (ONLY && !ONLY.split(',').includes(name)) continue;
    const htmlPath = join(work, `${name}.html`);
    writeFileSync(htmlPath, html(m, index, lang), 'utf8');
    const pdfPath = join(pdfDir, `${name}.pdf`);
    rmSync(pdfPath, { force: true });
    execFileSync(EDGE, [
      '--headless', '--disable-gpu', '--no-pdf-header-footer',
      // Own profile per file: never attach to an Edge window that is already open.
      `--user-data-dir=${join(work, `profile-${name}`)}`,
      '--virtual-time-budget=5000',
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ], { stdio: 'ignore' });
    // Edge can return before the file is fully written.
    const deadline = Date.now() + 20000;
    while (!(existsSync(pdfPath) && statSync(pdfPath).size > 1000) && Date.now() < deadline) {
      execFileSync(process.execPath, ['-e', 'setTimeout(() => {}, 300)']);
    }
    if (!existsSync(pdfPath)) throw new Error(`PDF not written: ${name}`);
    console.log('pdf', name, statSync(pdfPath).size);
  }
}
try { rmSync(work, { recursive: true, force: true }); } catch { // Edge may still hold its profile; the OS temp folder is cleaned later.
}

// ---------------------------------------------------------------- SQL
const j = (value) => `$j$${JSON.stringify(value)}$j$::jsonb`;
const lines = [];
lines.push(`-- ZOEF demo course (generated). Run once in the Supabase SQL Editor.
-- Creates the course as a DRAFT for the project "Merck SD" with 3 modules
-- and their quizzes (80% to pass). Then, in Admin panel > Courses > ZOEF:
-- add one material per module (the PDFs in EN/ES/PT) and click Publish.

DO $$
DECLARE
  v_project UUID;
  v_course UUID;
  v_module UUID;
  v_question UUID;
BEGIN
  SELECT id INTO v_project FROM public.projects WHERE name = 'Merck SD';
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Project "Merck SD" not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.courses WHERE title ->> 'en' = ${`'${course.title.en.replace(/'/g, "''")}'`}) THEN
    RAISE EXCEPTION 'The ZOEF course already exists';
  END IF;

  INSERT INTO public.courses (title, description, published, created_by)
  VALUES (
    ${j(course.title)},
    ${j(course.description)},
    false,
    (SELECT user_id FROM public.profiles WHERE role = 'admin' AND status = 'active' ORDER BY created_at LIMIT 1)
  )
  RETURNING id INTO v_course;

  INSERT INTO public.course_projects (course_id, project_id) VALUES (v_course, v_project);
`);
for (const [mi, m] of modules.entries()) {
  lines.push(`
  -- Module ${mi + 1}: ${m.title.en}
  INSERT INTO public.modules (course_id, position, title, description)
  VALUES (v_course, ${mi}, ${j(m.title)}, ${j(m.description)})
  RETURNING id INTO v_module;
  -- The quiz row is created by a trigger on modules.
  UPDATE public.quizzes SET pass_score = 80 WHERE module_id = v_module;
`);
  for (const [qi, q] of m.questions.entries()) {
    lines.push(`
  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, ${qi}, '${q.type}', ${j(q.prompt)})
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
${q.options.map(([label, correct], oi) => `    (v_question, ${oi}, ${j(label)}, ${correct})`).join(',\n')};
`);
  }
}
lines.push(`
  RAISE NOTICE 'ZOEF course created as draft: %', v_course;
END $$;

-- Check: 1 course, 3 modules, 10 questions
SELECT c.title ->> 'es' AS curso, c.published,
       (SELECT count(*) FROM public.modules m WHERE m.course_id = c.id) AS modulos,
       (SELECT count(*) FROM public.quiz_questions q JOIN public.modules m ON m.id = q.module_id WHERE m.course_id = c.id) AS preguntas
FROM public.courses c
WHERE c.title ->> 'en' LIKE 'ZOEF%';
`);
writeFileSync(sqlFile, lines.join(''), 'utf8');
console.log('sql', sqlFile);
