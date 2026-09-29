// ZOEF demo course: single source for the PDFs and the seed SQL.
// Facts come only from the summary provided by the user. Service Desk
// examples are marked as illustrative in every language.

export const course = {
  title: {
    en: 'ZOEF: Zero Operational Error Framework',
    es: 'ZOEF: Zero Operational Error Framework',
    pt: 'ZOEF: Zero Operational Error Framework',
  },
  description: {
    en: 'Introduction to Cognizant\'s operational excellence and quality assurance framework: its goal, the three categories of failures it prevents and its pillars, applied to Service Desk work.',
    es: 'Introducción al framework de excelencia operativa y garantía de calidad de Cognizant: su objetivo, las tres categorías de fallas que previene y sus pilares, aplicados al trabajo del Service Desk.',
    pt: 'Introdução ao framework de excelência operacional e garantia de qualidade da Cognizant: seu objetivo, as três categorias de falhas que ele previne e seus pilares, aplicados ao trabalho do Service Desk.',
  },
};

export const labels = {
  en: { module: 'Module', keyPoints: 'Key points', example: 'Illustrative Service Desk example', note: 'Demo material prepared for DeskControl from a summary of the ZOEF training. The official course is available on the Cognizant Learning and Development Center.' },
  es: { module: 'Módulo', keyPoints: 'Ideas clave', example: 'Ejemplo ilustrativo de Service Desk', note: 'Material de demostración preparado para DeskControl a partir de un resumen de la formación ZOEF. El curso oficial está disponible en el Cognizant Learning and Development Center.' },
  pt: { module: 'Módulo', keyPoints: 'Pontos-chave', example: 'Exemplo ilustrativo de Service Desk', note: 'Material de demonstração preparado para o DeskControl a partir de um resumo da formação ZOEF. O curso oficial está disponível no Cognizant Learning and Development Center.' },
};

const TRUE = { en: 'True', es: 'Verdadero', pt: 'Verdadeiro' };
const FALSE = { en: 'False', es: 'Falso', pt: 'Falso' };

export const modules = [
  {
    title: { en: 'What is ZOEF?', es: '¿Qué es ZOEF?', pt: 'O que é o ZOEF?' },
    description: {
      en: 'The goal of the framework and how the official training is organized.',
      es: 'El objetivo del framework y cómo se organiza la formación oficial.',
      pt: 'O objetivo do framework e como a formação oficial é organizada.',
    },
    material: { en: 'Module 1 guide: What is ZOEF', es: 'Guía del módulo 1: Qué es ZOEF', pt: 'Guia do módulo 1: O que é o ZOEF' },
    sections: {
      en: [
        ['The name', ['ZOEF stands for <b>Zero Operational Error Framework</b>.', 'It is Cognizant\'s operational excellence and quality assurance model, mandatory or highly recommended for employees.']],
        ['The goal', ['<b>Eliminate avoidable incidents.</b>', '<b>Make service delivery predictable.</b>', '<b>Mitigate risks</b> that could interrupt the business of the client or of Cognizant.']],
        ['Why it matters on the Service Desk', ['Every ticket is a point where an avoidable error can reach the client. ZOEF gives a common way to spot and prevent those errors before they become incidents.']],
        ['The official training', ['It is organized by proficiency levels, for example <b>ZOEF - V2 [201-INTERMEDIATE]</b>.', 'It is available only on the <b>Cognizant Learning and Development Center</b>, the company\'s internal learning platform.']],
      ],
      es: [
        ['El nombre', ['ZOEF significa <b>Zero Operational Error Framework</b> (Marco de Cero Errores Operativos).', 'Es el modelo de excelencia operativa y garantía de calidad de Cognizant, obligatorio o muy recomendado para sus colaboradores.']],
        ['El objetivo', ['<b>Eliminar los incidentes evitables.</b>', '<b>Dar previsibilidad a la entrega del servicio.</b>', '<b>Mitigar los riesgos</b> que puedan interrumpir el negocio del cliente o de Cognizant.']],
        ['Por qué importa en el Service Desk', ['Cada ticket es un punto donde un error evitable puede llegar al cliente. ZOEF da una forma común de detectar y prevenir esos errores antes de que se conviertan en incidentes.']],
        ['La formación oficial', ['Está organizada por niveles de proficiencia, por ejemplo <b>ZOEF - V2 [201-INTERMEDIATE]</b>.', 'Se ofrece solo en el <b>Cognizant Learning and Development Center</b>, la plataforma interna de aprendizaje de la empresa.']],
      ],
      pt: [
        ['O nome', ['ZOEF significa <b>Zero Operational Error Framework</b> (Estrutura de Erro Operacional Zero).', 'É o modelo de excelência operacional e garantia de qualidade da Cognizant, obrigatório ou altamente recomendado para os colaboradores.']],
        ['O objetivo', ['<b>Eliminar incidentes evitáveis.</b>', '<b>Garantir previsibilidade na entrega de serviços.</b>', '<b>Mitigar riscos</b> que possam interromper os negócios do cliente ou da Cognizant.']],
        ['Por que importa no Service Desk', ['Cada ticket é um ponto onde um erro evitável pode chegar ao cliente. O ZOEF dá uma forma comum de identificar e prevenir esses erros antes que virem incidentes.']],
        ['A formação oficial', ['É dividida por níveis de proficiência, por exemplo <b>ZOEF - V2 [201-INTERMEDIATE]</b>.', 'Está disponível apenas no <b>Cognizant Learning and Development Center</b>, a plataforma interna de aprendizagem da empresa.']],
      ],
    },
    keyPoints: {
      en: ['ZOEF = Zero Operational Error Framework.', 'Goal: no avoidable incidents, predictable delivery, lower risk.', 'Official course: Cognizant Learning and Development Center.'],
      es: ['ZOEF = Zero Operational Error Framework.', 'Objetivo: cero incidentes evitables, entrega previsible, menos riesgo.', 'Curso oficial: Cognizant Learning and Development Center.'],
      pt: ['ZOEF = Zero Operational Error Framework.', 'Objetivo: zero incidentes evitáveis, entrega previsível, menos risco.', 'Curso oficial: Cognizant Learning and Development Center.'],
    },
    questions: [
      {
        type: 'single',
        prompt: { en: 'What is the main goal of ZOEF?', es: '¿Cuál es el objetivo principal de ZOEF?', pt: 'Qual é o objetivo principal do ZOEF?' },
        options: [
          [{ en: 'Eliminate avoidable incidents and make service delivery predictable', es: 'Eliminar incidentes evitables y dar previsibilidad a la entrega del servicio', pt: 'Eliminar incidentes evitáveis e garantir previsibilidade na entrega do serviço' }, true],
          [{ en: 'Reduce software license costs', es: 'Reducir el costo de las licencias de software', pt: 'Reduzir o custo das licenças de software' }, false],
          [{ en: 'Rank analysts by individual productivity', es: 'Hacer un ranking de productividad individual de los analistas', pt: 'Fazer um ranking de produtividade individual dos analistas' }, false],
          [{ en: 'Replace the procedures agreed with the client', es: 'Reemplazar los procedimientos acordados con el cliente', pt: 'Substituir os procedimentos acordados com o cliente' }, false],
        ],
      },
      {
        type: 'true_false',
        prompt: { en: 'ZOEF stands for Zero Operational Error Framework.', es: 'ZOEF significa Zero Operational Error Framework.', pt: 'ZOEF significa Zero Operational Error Framework.' },
        options: [[TRUE, true], [FALSE, false]],
      },
      {
        type: 'single',
        prompt: { en: 'Where is the official ZOEF training available?', es: '¿Dónde está disponible la formación oficial de ZOEF?', pt: 'Onde está disponível a formação oficial do ZOEF?' },
        options: [
          [{ en: 'Cognizant Learning and Development Center', es: 'Cognizant Learning and Development Center', pt: 'Cognizant Learning and Development Center' }, true],
          [{ en: 'In the client\'s ticketing tool', es: 'En la herramienta de tickets del cliente', pt: 'Na ferramenta de tickets do cliente' }, false],
          [{ en: 'On public video platforms', es: 'En plataformas públicas de video', pt: 'Em plataformas públicas de vídeo' }, false],
        ],
      },
    ],
  },
  {
    title: { en: 'The three categories of failures', es: 'Las tres categorías de fallas', pt: 'As três categorias de falhas' },
    description: {
      en: 'Process deviations, human error and security violations: how to recognize and prevent them.',
      es: 'Desvíos de proceso, error humano y violaciones de seguridad: cómo reconocerlos y prevenirlos.',
      pt: 'Desvios de processo, erro humano e violações de segurança: como reconhecê-los e preveni-los.',
    },
    material: { en: 'Module 2 guide: Categories of failures', es: 'Guía del módulo 2: Categorías de fallas', pt: 'Guia do módulo 2: Categorias de falhas' },
    sections: {
      en: [
        ['What ZOEF watches', ['The framework monitors and mitigates <b>three large categories of failures</b>.']],
        ['1. Process deviations', ['Not following the flows and guidelines previously agreed with the client.', '<i>Illustrative example:</i> closing a ticket without the user confirmation that the procedure requires.']],
        ['2. Human error', ['Inadvertent mistakes made by professionals during the operation. They are not intentional.', '<i>Illustrative example:</i> assigning a ticket to the wrong resolver group because of a typo.']],
        ['3. Security violations', ['Failures that affect the <b>confidentiality, integrity or availability</b> of data.', '<i>Illustrative example:</i> sending a user\'s personal data to a recipient who is not authorized.']],
        ['Everyday prevention', ['Follow the current procedure, even for routine cases.', 'Review before sending or closing.', 'Validate the user\'s identity before sharing any data.', 'Report near misses: they show where the next error could happen.']],
      ],
      es: [
        ['Qué vigila ZOEF', ['El framework monitorea y mitiga <b>tres grandes categorías de fallas</b>.']],
        ['1. Desvíos de proceso', ['No respetar los flujos y lineamientos acordados previamente con el cliente.', '<i>Ejemplo ilustrativo:</i> cerrar un ticket sin la confirmación del usuario que exige el procedimiento.']],
        ['2. Error humano', ['Equivocaciones inadvertidas que cometen los profesionales durante la operación. No son intencionales.', '<i>Ejemplo ilustrativo:</i> asignar un ticket al grupo resolutor equivocado por un error de tipeo.']],
        ['3. Violaciones de seguridad', ['Fallas que afectan la <b>confidencialidad, integridad o disponibilidad</b> de los datos.', '<i>Ejemplo ilustrativo:</i> enviar datos personales de un usuario a un destinatario no autorizado.']],
        ['Prevención en el día a día', ['Seguir el procedimiento vigente, incluso en los casos de rutina.', 'Revisar antes de enviar o de cerrar.', 'Validar la identidad del usuario antes de compartir cualquier dato.', 'Reportar los casi-errores: muestran dónde podría ocurrir el próximo error.']],
      ],
      pt: [
        ['O que o ZOEF monitora', ['O framework monitora e mitiga <b>três grandes categorias de falhas</b>.']],
        ['1. Desvios de processo', ['Desrespeito aos fluxos e diretrizes previamente acordados com o cliente.', '<i>Exemplo ilustrativo:</i> fechar um ticket sem a confirmação do usuário exigida pelo procedimento.']],
        ['2. Erro humano', ['Equívocos inadvertidos cometidos pelos profissionais durante a operação. Não são intencionais.', '<i>Exemplo ilustrativo:</i> atribuir um ticket ao grupo resolvedor errado por um erro de digitação.']],
        ['3. Violações de segurança', ['Falhas que afetam a <b>confidencialidade, integridade ou disponibilidade</b> dos dados.', '<i>Exemplo ilustrativo:</i> enviar dados pessoais de um usuário para um destinatário não autorizado.']],
        ['Prevenção no dia a dia', ['Seguir o procedimento vigente, mesmo nos casos de rotina.', 'Revisar antes de enviar ou fechar.', 'Validar a identidade do usuário antes de compartilhar qualquer dado.', 'Reportar os quase-erros: eles mostram onde o próximo erro pode acontecer.']],
      ],
    },
    keyPoints: {
      en: ['Three categories: process deviations, human error, security violations.', 'Human error is inadvertent, not intentional.', 'Security violations affect confidentiality, integrity or availability.'],
      es: ['Tres categorías: desvíos de proceso, error humano, violaciones de seguridad.', 'El error humano es inadvertido, no intencional.', 'Las violaciones de seguridad afectan confidencialidad, integridad o disponibilidad.'],
      pt: ['Três categorias: desvios de processo, erro humano, violações de segurança.', 'O erro humano é inadvertido, não intencional.', 'As violações de segurança afetam confidencialidade, integridade ou disponibilidade.'],
    },
    questions: [
      {
        type: 'multiple',
        prompt: { en: 'Which are the three categories of failures that ZOEF monitors?', es: '¿Cuáles son las tres categorías de fallas que monitorea ZOEF?', pt: 'Quais são as três categorias de falhas que o ZOEF monitora?' },
        options: [
          [{ en: 'Process deviations', es: 'Desvíos de proceso', pt: 'Desvios de processo' }, true],
          [{ en: 'Human error', es: 'Error humano', pt: 'Erro humano' }, true],
          [{ en: 'Security violations', es: 'Violaciones de seguridad', pt: 'Violações de segurança' }, true],
          [{ en: 'Budget overruns', es: 'Desvíos de presupuesto', pt: 'Estouros de orçamento' }, false],
        ],
      },
      {
        type: 'single',
        prompt: { en: 'An analyst closes a ticket without following the flow agreed with the client. What category is it?', es: 'Un analista cierra un ticket sin seguir el flujo acordado con el cliente. ¿Qué categoría es?', pt: 'Um analista fecha um ticket sem seguir o fluxo acordado com o cliente. Qual é a categoria?' },
        options: [
          [{ en: 'Process deviation', es: 'Desvío de proceso', pt: 'Desvio de processo' }, true],
          [{ en: 'Security violation', es: 'Violación de seguridad', pt: 'Violação de segurança' }, false],
          [{ en: 'It is not a failure', es: 'No es una falla', pt: 'Não é uma falha' }, false],
        ],
      },
      {
        type: 'single',
        prompt: { en: 'A file with client data is shared by mistake with an unauthorized person. Which property of the data is affected?', es: 'Se comparte por error un archivo con datos del cliente con una persona no autorizada. ¿Qué propiedad de los datos se ve afectada?', pt: 'Um arquivo com dados do cliente é compartilhado por engano com uma pessoa não autorizada. Qual propriedade dos dados é afetada?' },
        options: [
          [{ en: 'Confidentiality', es: 'Confidencialidad', pt: 'Confidencialidade' }, true],
          [{ en: 'Availability', es: 'Disponibilidad', pt: 'Disponibilidade' }, false],
          [{ en: 'Predictability', es: 'Previsibilidad', pt: 'Previsibilidade' }, false],
        ],
      },
      {
        type: 'true_false',
        prompt: { en: 'In ZOEF, a human error is always intentional.', es: 'En ZOEF, un error humano es siempre intencional.', pt: 'No ZOEF, um erro humano é sempre intencional.' },
        options: [[TRUE, false], [FALSE, true]],
      },
    ],
  },
  {
    title: { en: 'The pillars of ZOEF', es: 'Los pilares de ZOEF', pt: 'Os pilares do ZOEF' },
    description: {
      en: 'The six pillars that detect vulnerabilities early, with a focus on knowledge management, automation and competency development.',
      es: 'Los seis pilares que detectan vulnerabilidades temprano, con foco en gestión del conocimiento, automatización y desarrollo de competencias.',
      pt: 'Os seis pilares que identificam vulnerabilidades cedo, com foco em gestão do conhecimento, automação e desenvolvimento de competências.',
    },
    material: { en: 'Module 3 guide: The pillars', es: 'Guía del módulo 3: Los pilares', pt: 'Guia do módulo 3: Os pilares' },
    sections: {
      en: [
        ['Six pillars', ['ZOEF uses <b>six pillars</b> to identify vulnerabilities early. This module covers two of them; the official course covers all six.']],
        ['Knowledge Management and Automation', ['Audit practices for <b>Standard Operating Procedures (SOPs)</b>.', 'Sharing of <b>best practices</b> across the team.', 'Automated <b>self-help / self-heal</b> workflows that raise productivity and remove manual steps where errors happen.']],
        ['Delivery Process and Competency Development', ['Makes sure teams are <b>properly qualified</b>.', 'Keeps <b>processes standardized</b>, so the same case is handled the same way by anyone on the team.']],
        ['Applying it on the Service Desk', ['Keep the knowledge base up to date and report outdated SOPs.', 'Suggest automations for repetitive tasks.', 'Complete the trainings assigned to you (like this one) to keep your skills current.']],
      ],
      es: [
        ['Seis pilares', ['ZOEF usa <b>seis pilares</b> para identificar vulnerabilidades de forma temprana. Este módulo desarrolla dos de ellos; el curso oficial cubre los seis.']],
        ['Gestión del Conocimiento y Automatización', ['Prácticas de auditoría de los <b>Procedimientos Operativos Estándar (SOPs)</b>.', 'Intercambio de <b>buenas prácticas</b> dentro del equipo.', 'Flujos automatizados de <b>self-help / self-heal</b> que aumentan la productividad y eliminan pasos manuales donde ocurren errores.']],
        ['Desarrollo de Competencias y Procesos de Entrega', ['Garantiza que los equipos estén <b>debidamente calificados</b>.', 'Mantiene los <b>procesos estandarizados</b>, para que el mismo caso se resuelva igual sin importar quién lo atienda.']],
        ['Cómo se aplica en el Service Desk', ['Mantener la base de conocimiento actualizada y reportar los SOPs desactualizados.', 'Proponer automatizaciones para las tareas repetitivas.', 'Completar las capacitaciones asignadas (como esta) para mantener las competencias al día.']],
      ],
      pt: [
        ['Seis pilares', ['O ZOEF usa <b>seis pilares</b> para identificar vulnerabilidades de forma precoce. Este módulo aborda dois deles; o curso oficial cobre os seis.']],
        ['Gestão do Conhecimento e Automação', ['Práticas de auditoria para os <b>Procedimentos Operacionais Padrão (SOPs)</b>.', 'Partilha de <b>boas práticas</b> dentro da equipe.', 'Fluxos automatizados de <b>self-help / self-heal</b> que aumentam a produtividade e eliminam passos manuais onde os erros acontecem.']],
        ['Desenvolvimento de Competências e Processos de Entrega', ['Garante que as equipes estejam <b>devidamente qualificadas</b>.', 'Mantém os <b>processos padronizados</b>, para que o mesmo caso seja resolvido da mesma forma por qualquer pessoa da equipe.']],
        ['Como aplicar no Service Desk', ['Manter a base de conhecimento atualizada e reportar SOPs desatualizados.', 'Propor automações para tarefas repetitivas.', 'Concluir as formações atribuídas (como esta) para manter as competências em dia.']],
      ],
    },
    keyPoints: {
      en: ['ZOEF has six pillars.', 'Knowledge Management and Automation: SOP audits, best practices, self-help / self-heal.', 'Competency Development: qualified teams and standardized processes.'],
      es: ['ZOEF tiene seis pilares.', 'Gestión del Conocimiento y Automatización: auditoría de SOPs, buenas prácticas, self-help / self-heal.', 'Desarrollo de Competencias: equipos calificados y procesos estandarizados.'],
      pt: ['O ZOEF tem seis pilares.', 'Gestão do Conhecimento e Automação: auditoria de SOPs, boas práticas, self-help / self-heal.', 'Desenvolvimento de Competências: equipes qualificadas e processos padronizados.'],
    },
    questions: [
      {
        type: 'single',
        prompt: { en: 'How many pillars does ZOEF use to identify vulnerabilities early?', es: '¿Cuántos pilares usa ZOEF para identificar vulnerabilidades de forma temprana?', pt: 'Quantos pilares o ZOEF usa para identificar vulnerabilidades de forma precoce?' },
        options: [
          [{ en: 'Six', es: 'Seis', pt: 'Seis' }, true],
          [{ en: 'Three', es: 'Tres', pt: 'Três' }, false],
          [{ en: 'Four', es: 'Cuatro', pt: 'Quatro' }, false],
          [{ en: 'Ten', es: 'Diez', pt: 'Dez' }, false],
        ],
      },
      {
        type: 'multiple',
        prompt: { en: 'What is part of the Knowledge Management and Automation pillar?', es: '¿Qué forma parte del pilar de Gestión del Conocimiento y Automatización?', pt: 'O que faz parte do pilar de Gestão do Conhecimento e Automação?' },
        options: [
          [{ en: 'Audits of SOPs', es: 'Auditoría de los SOPs', pt: 'Auditoria dos SOPs' }, true],
          [{ en: 'Sharing best practices', es: 'Compartir buenas prácticas', pt: 'Partilhar boas práticas' }, true],
          [{ en: 'Self-help / self-heal automated workflows', es: 'Flujos automatizados de self-help / self-heal', pt: 'Fluxos automatizados de self-help / self-heal' }, true],
          [{ en: 'Penalties for each error', es: 'Sanciones por cada error', pt: 'Punições por cada erro' }, false],
        ],
      },
      {
        type: 'single',
        prompt: { en: 'What does the Delivery Process and Competency Development pillar ensure?', es: '¿Qué garantiza el pilar de Desarrollo de Competencias y Procesos de Entrega?', pt: 'O que o pilar de Desenvolvimento de Competências e Processos de Entrega garante?' },
        options: [
          [{ en: 'Qualified teams and standardized processes', es: 'Equipos calificados y procesos estandarizados', pt: 'Equipes qualificadas e processos padronizados' }, true],
          [{ en: 'Fewer tickets per analyst', es: 'Menos tickets por analista', pt: 'Menos tickets por analista' }, false],
          [{ en: 'That each analyst defines their own process', es: 'Que cada analista defina su propio proceso', pt: 'Que cada analista defina o seu próprio processo' }, false],
        ],
      },
    ],
  },
];
