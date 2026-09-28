# Desk Control: módulo Learning

Especificación funcional y técnica de la nueva pestaña **Learning**, la pantalla de **Admin** y el soporte de idiomas.

Estado: aprobado para desarrollo (2026-09-28). Proyecto inicial: **Merck SD**.

---

## 1. Objetivo

Centralizar los entrenamientos de cada proyecto dentro de Desk Control. Los analistas completan cursos divididos en módulos, en orden, y solo avanzan al siguiente módulo después de aprobar el quiz del módulo actual. Los leads siguen el progreso de su equipo y pueden exportarlo.

## 2. Roles

| Rol | Qué puede hacer |
|---|---|
| **Admin** | Gestiona usuarios (rol, proyecto, estado), proyectos y leads de cada proyecto. Crea y edita cursos, módulos, materiales y quizzes. Ve el progreso de todos. |
| **Lead** | Ve el progreso de los analistas de **sus** proyectos, recibe notificaciones cuando un analista completa un curso, filtra y exporta reportes. |
| **Analista** | Ve los cursos de su proyecto, abre materiales, hace los quizzes y avanza por los módulos. |

### Asignación de roles y accesos

- El **primer admin** se crea una sola vez con SQL en el panel de Supabase (ver `supabase/scripts/bootstrap_admin.sql`).
- A partir de ahí, todo se gestiona desde la pantalla `/admin`.
- **Solo el admin** puede cambiar el rol, el proyecto o el estado de un usuario. Esto lo garantiza la base de datos, no solo la interfaz.
- Todo usuario nuevo que se registra queda en estado **pendiente** y no ve ningún dato hasta que el admin lo activa y le asigna un proyecto.

Estados de usuario: `pending` (recién registrado), `active` (con acceso), `inactive` (acceso retirado).

## 3. Proyectos

- Un proyecto agrupa analistas y cursos (ej.: Merck SD).
- Cada analista pertenece a **un** proyecto.
- Un proyecto puede tener **uno o varios leads**, y un lead puede estar a cargo de **varios proyectos**.
- El "lead de un analista" son los leads del proyecto de ese analista.
- Un curso puede estar disponible para uno o varios proyectos.

## 4. Estructura de un curso

```
Curso
 ├─ Módulo 1
 │   ├─ Materiales (opcionales): archivos, videos subidos, links de SharePoint/Teams
 │   └─ Quiz (nota mínima entre 70% y 100%)
 ├─ Módulo 2  (se desbloquea al aprobar el quiz del Módulo 1)
 └─ ...
```

- Los cursos son **independientes** entre sí: el analista puede empezar cualquiera, y el progreso de cada uno queda guardado.
- Dentro de un curso, los módulos siguen un **orden estricto**.
- Cada módulo **ofrece la opción** de agregar archivo, video y quiz. El archivo y el video pueden quedar vacíos.
- Un curso tiene estado **borrador** o **publicado**. Los analistas solo ven los publicados.

### Materiales

| Tipo | Cómo se agrega | Cuándo cuenta como visto |
|---|---|---|
| Archivo (PDF, PowerPoint, Word, etc.) | Subida desde la computadora | Al abrirlo (no hace falta descargarlo) |
| Video subido | Subida desde la computadora | Al reproducir **al menos el 90%** del video (tiempo realmente reproducido; adelantar la barra no cuenta) |
| Link (SharePoint, grabación de Teams) | Pegar la URL | Al hacer clic en "Abrir" |

- Cada material puede tener **versiones por idioma** (EN/ES/PT), todas opcionales. Se muestra la versión del idioma del usuario; si no existe, la versión en inglés; si tampoco existe, cualquiera disponible. Abrir cualquier versión cuenta como visto.
- El analista necesita tener permiso en SharePoint para abrir los links. La app no puede medir cuánto se reprodujo un video de SharePoint/Teams, solo que se abrió.
- Límite del plan gratuito de Supabase: 50 MB por archivo y 1 GB en total. Para videos largos se recomienda usar links de SharePoint.

### Quiz

- Tipos de pregunta: **opción única**, **opción múltiple** y **verdadero/falso**. No hay preguntas abiertas.
- Nota mínima configurable por el admin en cada quiz: **entre 70% y 100%**.
- Solo se habilita cuando el analista vio **todos** los materiales del módulo.
- Intentos **ilimitados**, sin tiempo límite ni espera entre intentos.
- Preguntas y opciones en **orden aleatorio** en cada intento.
- Al reprobar se muestra **solo la nota**, sin las respuestas correctas.
- La corrección se hace en el servidor: el navegador nunca recibe las respuestas correctas.
- En opción múltiple, la pregunta cuenta como correcta solo si se marcan exactamente todas las opciones correctas.

### Al completar un curso

- El analista ve un mensaje de "curso aprobado con éxito". No se genera certificado.
- Se envía una notificación dentro de la app a los leads de su proyecto.

### Cambios en un curso ya en uso

- Quien ya **completó** el curso lo mantiene como completado.
- Quien todavía no lo completó ve los cambios (módulos nuevos, quizzes editados) a partir de su progreso actual.

## 5. Seguimiento del lead

- **Notificaciones** dentro de la app (campanita en el encabezado) con un aviso breve.
- Sección **Learning Progress** con el detalle: quién no empezó, quién está en curso y quién completó.
- **Filtros**: proyecto, curso, estado (no iniciado / en curso / completado), analista y rango de fechas de finalización.
- **Exportación** a **Excel** y **CSV** de lo que se ve en la tabla (respeta los filtros).
- Una fila por analista y curso, con estas columnas:

| Analista | Proyecto | Curso | Módulo actual | % de avance | Intentos totales | Intentos por módulo | Fecha de finalización |
|---|---|---|---|---|---|---|---|
| Ana | Merck SD | Onboarding | 3 de 5 | 40% | 4 | M1: 1 · M2: 3 | |

## 6. Idiomas

- Selector de idioma en **Settings**: inglés (predeterminado), español y portugués. La preferencia se guarda en el perfil.
- Los textos de los cursos (título, descripción, módulos, preguntas y opciones) se cargan en los 3 idiomas. Si falta una traducción, se muestra la versión en inglés.
- Mejora futura: botón de traducción automática (necesita una API externa con costo).

## 7. Modelo de datos

**Organización**
- `projects`: proyectos.
- `project_leads`: relación lead ↔ proyecto (N:N).
- `profiles`: se agregan `project_id`, `status` y `language`.

**Contenido** (los textos traducibles se guardan como JSON `{ "en": "...", "es": "...", "pt": "..." }`)
- `courses`: título, descripción, publicado/borrador.
- `course_projects`: qué proyectos ven cada curso.
- `modules`: módulos de un curso, con su posición.
- `module_materials`: cada material de un módulo.
- `material_versions`: versión de un material por idioma (archivo en Storage o URL).
- `quizzes`: quiz del módulo con su nota mínima.
- `quiz_questions`: preguntas (tipo y enunciado).
- `quiz_options`: opciones, con cuál es correcta (no legible por analistas).

**Progreso**
- `material_views`: qué materiales abrió/vio cada analista (y % en videos).
- `quiz_attempts`: cada intento con su nota.
- `module_progress`: módulos aprobados.
- `course_enrollments`: inicio y finalización de cada curso.
- `notifications`: avisos de la campanita.

**Reglas en la base de datos** (funciones de Postgres, no solo la interfaz)
- Registrar que un material fue visto.
- Entregar el quiz sin las respuestas correctas y en orden aleatorio.
- Corregir el quiz, desbloquear el siguiente módulo, marcar el curso como completado y notificar a los leads.
- Los materiales se guardan en un bucket **privado**. Solo se generan enlaces temporales para módulos desbloqueados.

## 8. Fases de desarrollo

| Fase | Contenido |
|---|---|
| **1. Base** | Proyectos, leads por proyecto y estados de usuario. Solo el admin cambia roles. Pantalla `/admin` (usuarios y proyectos). Estructura de idiomas y selector en Settings. |
| **2. Constructor** | Tablas de Learning y bucket privado. En `/admin`: cursos, módulos, materiales y quizzes. |
| **3. Analista** | Pestaña Learning: cursos con avance, módulos con candado, visor de materiales, quiz y mensaje de aprobado. |
| **4. Lead** | Notificaciones, sección de seguimiento con filtros y exportación Excel/CSV. |
| **5. Idiomas** | Traducción de toda la interfaz existente. Opcional: traducción automática de contenido. |

## 9. Fuera de alcance por ahora

- Certificados.
- Notificaciones por correo.
- Preguntas abiertas y corrección manual.
- Tiempo límite o espera entre intentos.
- Infraestructura propia de la empresa (por ahora corre en el Supabase y Netlify actuales).
