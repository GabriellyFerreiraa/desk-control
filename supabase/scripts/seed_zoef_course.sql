-- ZOEF demo course (generated). Run once in the Supabase SQL Editor.
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
  IF EXISTS (SELECT 1 FROM public.courses WHERE title ->> 'en' = 'ZOEF: Zero Operational Error Framework') THEN
    RAISE EXCEPTION 'The ZOEF course already exists';
  END IF;

  INSERT INTO public.courses (title, description, published, created_by)
  VALUES (
    $j${"en":"ZOEF: Zero Operational Error Framework","es":"ZOEF: Zero Operational Error Framework","pt":"ZOEF: Zero Operational Error Framework"}$j$::jsonb,
    $j${"en":"Introduction to Cognizant's operational excellence and quality assurance framework: its goal, the three categories of failures it prevents and its pillars, applied to Service Desk work.","es":"Introducción al framework de excelencia operativa y garantía de calidad de Cognizant: su objetivo, las tres categorías de fallas que previene y sus pilares, aplicados al trabajo del Service Desk.","pt":"Introdução ao framework de excelência operacional e garantia de qualidade da Cognizant: seu objetivo, as três categorias de falhas que ele previne e seus pilares, aplicados ao trabalho do Service Desk."}$j$::jsonb,
    false,
    (SELECT user_id FROM public.profiles WHERE role = 'admin' AND status = 'active' ORDER BY created_at LIMIT 1)
  )
  RETURNING id INTO v_course;

  INSERT INTO public.course_projects (course_id, project_id) VALUES (v_course, v_project);

  -- Module 1: What is ZOEF?
  INSERT INTO public.modules (course_id, position, title, description)
  VALUES (v_course, 0, $j${"en":"What is ZOEF?","es":"¿Qué es ZOEF?","pt":"O que é o ZOEF?"}$j$::jsonb, $j${"en":"The goal of the framework and how the official training is organized.","es":"El objetivo del framework y cómo se organiza la formación oficial.","pt":"O objetivo do framework e como a formação oficial é organizada."}$j$::jsonb)
  RETURNING id INTO v_module;
  -- The quiz row is created by a trigger on modules.
  UPDATE public.quizzes SET pass_score = 80 WHERE module_id = v_module;

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 0, 'single', $j${"en":"What is the main goal of ZOEF?","es":"¿Cuál es el objetivo principal de ZOEF?","pt":"Qual é o objetivo principal do ZOEF?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Eliminate avoidable incidents and make service delivery predictable","es":"Eliminar incidentes evitables y dar previsibilidad a la entrega del servicio","pt":"Eliminar incidentes evitáveis e garantir previsibilidade na entrega do serviço"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"Reduce software license costs","es":"Reducir el costo de las licencias de software","pt":"Reduzir o custo das licenças de software"}$j$::jsonb, false),
    (v_question, 2, $j${"en":"Rank analysts by individual productivity","es":"Hacer un ranking de productividad individual de los analistas","pt":"Fazer um ranking de produtividade individual dos analistas"}$j$::jsonb, false),
    (v_question, 3, $j${"en":"Replace the procedures agreed with the client","es":"Reemplazar los procedimientos acordados con el cliente","pt":"Substituir os procedimentos acordados com o cliente"}$j$::jsonb, false);

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 1, 'true_false', $j${"en":"ZOEF stands for Zero Operational Error Framework.","es":"ZOEF significa Zero Operational Error Framework.","pt":"ZOEF significa Zero Operational Error Framework."}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"True","es":"Verdadero","pt":"Verdadeiro"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"False","es":"Falso","pt":"Falso"}$j$::jsonb, false);

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 2, 'single', $j${"en":"Where is the official ZOEF training available?","es":"¿Dónde está disponible la formación oficial de ZOEF?","pt":"Onde está disponível a formação oficial do ZOEF?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Cognizant Learning and Development Center","es":"Cognizant Learning and Development Center","pt":"Cognizant Learning and Development Center"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"In the client's ticketing tool","es":"En la herramienta de tickets del cliente","pt":"Na ferramenta de tickets do cliente"}$j$::jsonb, false),
    (v_question, 2, $j${"en":"On public video platforms","es":"En plataformas públicas de video","pt":"Em plataformas públicas de vídeo"}$j$::jsonb, false);

  -- Module 2: The three categories of failures
  INSERT INTO public.modules (course_id, position, title, description)
  VALUES (v_course, 1, $j${"en":"The three categories of failures","es":"Las tres categorías de fallas","pt":"As três categorias de falhas"}$j$::jsonb, $j${"en":"Process deviations, human error and security violations: how to recognize and prevent them.","es":"Desvíos de proceso, error humano y violaciones de seguridad: cómo reconocerlos y prevenirlos.","pt":"Desvios de processo, erro humano e violações de segurança: como reconhecê-los e preveni-los."}$j$::jsonb)
  RETURNING id INTO v_module;
  -- The quiz row is created by a trigger on modules.
  UPDATE public.quizzes SET pass_score = 80 WHERE module_id = v_module;

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 0, 'multiple', $j${"en":"Which are the three categories of failures that ZOEF monitors?","es":"¿Cuáles son las tres categorías de fallas que monitorea ZOEF?","pt":"Quais são as três categorias de falhas que o ZOEF monitora?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Process deviations","es":"Desvíos de proceso","pt":"Desvios de processo"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"Human error","es":"Error humano","pt":"Erro humano"}$j$::jsonb, true),
    (v_question, 2, $j${"en":"Security violations","es":"Violaciones de seguridad","pt":"Violações de segurança"}$j$::jsonb, true),
    (v_question, 3, $j${"en":"Budget overruns","es":"Desvíos de presupuesto","pt":"Estouros de orçamento"}$j$::jsonb, false);

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 1, 'single', $j${"en":"An analyst closes a ticket without following the flow agreed with the client. What category is it?","es":"Un analista cierra un ticket sin seguir el flujo acordado con el cliente. ¿Qué categoría es?","pt":"Um analista fecha um ticket sem seguir o fluxo acordado com o cliente. Qual é a categoria?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Process deviation","es":"Desvío de proceso","pt":"Desvio de processo"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"Security violation","es":"Violación de seguridad","pt":"Violação de segurança"}$j$::jsonb, false),
    (v_question, 2, $j${"en":"It is not a failure","es":"No es una falla","pt":"Não é uma falha"}$j$::jsonb, false);

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 2, 'single', $j${"en":"A file with client data is shared by mistake with an unauthorized person. Which property of the data is affected?","es":"Se comparte por error un archivo con datos del cliente con una persona no autorizada. ¿Qué propiedad de los datos se ve afectada?","pt":"Um arquivo com dados do cliente é compartilhado por engano com uma pessoa não autorizada. Qual propriedade dos dados é afetada?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Confidentiality","es":"Confidencialidad","pt":"Confidencialidade"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"Availability","es":"Disponibilidad","pt":"Disponibilidade"}$j$::jsonb, false),
    (v_question, 2, $j${"en":"Predictability","es":"Previsibilidad","pt":"Previsibilidade"}$j$::jsonb, false);

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 3, 'true_false', $j${"en":"In ZOEF, a human error is always intentional.","es":"En ZOEF, un error humano es siempre intencional.","pt":"No ZOEF, um erro humano é sempre intencional."}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"True","es":"Verdadero","pt":"Verdadeiro"}$j$::jsonb, false),
    (v_question, 1, $j${"en":"False","es":"Falso","pt":"Falso"}$j$::jsonb, true);

  -- Module 3: The pillars of ZOEF
  INSERT INTO public.modules (course_id, position, title, description)
  VALUES (v_course, 2, $j${"en":"The pillars of ZOEF","es":"Los pilares de ZOEF","pt":"Os pilares do ZOEF"}$j$::jsonb, $j${"en":"The six pillars that detect vulnerabilities early, with a focus on knowledge management, automation and competency development.","es":"Los seis pilares que detectan vulnerabilidades temprano, con foco en gestión del conocimiento, automatización y desarrollo de competencias.","pt":"Os seis pilares que identificam vulnerabilidades cedo, com foco em gestão do conhecimento, automação e desenvolvimento de competências."}$j$::jsonb)
  RETURNING id INTO v_module;
  -- The quiz row is created by a trigger on modules.
  UPDATE public.quizzes SET pass_score = 80 WHERE module_id = v_module;

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 0, 'single', $j${"en":"How many pillars does ZOEF use to identify vulnerabilities early?","es":"¿Cuántos pilares usa ZOEF para identificar vulnerabilidades de forma temprana?","pt":"Quantos pilares o ZOEF usa para identificar vulnerabilidades de forma precoce?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Six","es":"Seis","pt":"Seis"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"Three","es":"Tres","pt":"Três"}$j$::jsonb, false),
    (v_question, 2, $j${"en":"Four","es":"Cuatro","pt":"Quatro"}$j$::jsonb, false),
    (v_question, 3, $j${"en":"Ten","es":"Diez","pt":"Dez"}$j$::jsonb, false);

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 1, 'multiple', $j${"en":"What is part of the Knowledge Management and Automation pillar?","es":"¿Qué forma parte del pilar de Gestión del Conocimiento y Automatización?","pt":"O que faz parte do pilar de Gestão do Conhecimento e Automação?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Audits of SOPs","es":"Auditoría de los SOPs","pt":"Auditoria dos SOPs"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"Sharing best practices","es":"Compartir buenas prácticas","pt":"Partilhar boas práticas"}$j$::jsonb, true),
    (v_question, 2, $j${"en":"Self-help / self-heal automated workflows","es":"Flujos automatizados de self-help / self-heal","pt":"Fluxos automatizados de self-help / self-heal"}$j$::jsonb, true),
    (v_question, 3, $j${"en":"Penalties for each error","es":"Sanciones por cada error","pt":"Punições por cada erro"}$j$::jsonb, false);

  INSERT INTO public.quiz_questions (module_id, position, type, prompt)
  VALUES (v_module, 2, 'single', $j${"en":"What does the Delivery Process and Competency Development pillar ensure?","es":"¿Qué garantiza el pilar de Desarrollo de Competencias y Procesos de Entrega?","pt":"O que o pilar de Desenvolvimento de Competências e Processos de Entrega garante?"}$j$::jsonb)
  RETURNING id INTO v_question;
  INSERT INTO public.quiz_options (question_id, position, label, is_correct) VALUES
    (v_question, 0, $j${"en":"Qualified teams and standardized processes","es":"Equipos calificados y procesos estandarizados","pt":"Equipes qualificadas e processos padronizados"}$j$::jsonb, true),
    (v_question, 1, $j${"en":"Fewer tickets per analyst","es":"Menos tickets por analista","pt":"Menos tickets por analista"}$j$::jsonb, false),
    (v_question, 2, $j${"en":"That each analyst defines their own process","es":"Que cada analista defina su propio proceso","pt":"Que cada analista defina o seu próprio processo"}$j$::jsonb, false);

  RAISE NOTICE 'ZOEF course created as draft: %', v_course;
END $$;

-- Check: 1 course, 3 modules, 10 questions
SELECT c.title ->> 'es' AS curso, c.published,
       (SELECT count(*) FROM public.modules m WHERE m.course_id = c.id) AS modulos,
       (SELECT count(*) FROM public.quiz_questions q JOIN public.modules m ON m.id = q.module_id WHERE m.course_id = c.id) AS preguntas
FROM public.courses c
WHERE c.title ->> 'en' LIKE 'ZOEF%';
