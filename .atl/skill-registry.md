# Skill Registry — split-pay (SplitBill)

**Generado por:** `sdd-init` v3.0 · **Fecha:** 2026-10-27 · **Modo SDD:** `openspec`

Infraestructura, no artefacto SDD. Se regenera con la skill `skill-registry`.

## Skills disponibles

Escaneadas en `~/.claude/skills/` y `~/.config/opencode/skills/` (set espejado, deduplicado).
Excluidas por convención: `sdd-*` (fases SDD), `_shared`, `skill-registry`.
No hay skills a nivel de proyecto (`.claude/skills/` no existe).

| Skill | Cuándo se dispara | ¿Aplica a split-pay? |
|---|---|---|
| `skill-creator` | Crear una skill nueva, documentar patrones para IA | Sí, si se extraen patrones del proyecto |
| `judgment-day` | "judgment day", "dual review", "review adversarial", "juzgar" | **Sí** — encaja con el pipeline de auditoría en dos etapas de `CLAUDE.md` |
| `branch-pr` | Crear un PR, preparar cambios para revisión | Sí — repo con remoto en `github.com:jcbuitrago/split-pay` |
| `issue-creation` | Crear un issue de GitHub, reportar bug o pedir feature | Sí |
| `go-testing` | Tests en Go, Bubbletea/teatest | **No** — proyecto TypeScript, no Go |

## Convenciones del proyecto (de lectura obligatoria antes de escribir código)

| Archivo | Contenido |
|---|---|
| `CLAUDE.md` | Fuente autoritativa: stack, estructura de carpetas, tipos de `bill.ts`, flujo de los 6 pasos, lógica de cálculo, formato COP, sistema de temas, sección de seguridad, pipeline de auditoría en dos etapas |
| `docs/LOGIC_SPEC.md` | Especificación de la lógica de división e impuestos |
| `docs/CODE_STYLE_SPEC.md` | Estilo de código |
| `docs/DESIGN_SPEC.md` | Paleta, tipografía, componentes visuales |
| `docs/UX_SPEC.md` | Flujo de usuario paso a paso |
| `docs/ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md` | Arquitectura y estructura |
| `docs/APP_STORE_READINESS.md` | Diagnóstico para publicar en tiendas |
| `.planning/codebase/*.md` | 8 documentos de `gsd-map-codebase` (2026-08-25): STACK, ARCHITECTURE, CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS, CONCERNS, CONCERNS-VERIFIED |

Nota: los `docs/*_SPEC.md` son **especificaciones artesanales previas a SDD**, no artefactos
de `openspec/`. Cuando una delta spec de SDD entre en conflicto con ellos, el proceso de
`sdd-archive` debe reconciliarlos explícitamente.

## Reglas duras heredadas de CLAUDE.md

- Nunca usar `any` en TypeScript.
- Nunca escribir colores hex en componentes — la paleta vive **solo** en `src/theme.css`.
- Nunca tocar la lógica de OCR ni de división de cuenta cuando el cambio es de UI.
- Preguntar antes de eliminar o renombrar archivos.
- Sin `localStorage` ni cookies: el estado vive en memoria, por diseño.
- Todos los textos de la UI en español colombiano.
- Nunca construir después de los cambios (`npm run build` no se ejecuta automáticamente).
- Commits convencionales, sin atribución de IA añadida por el agente.
- Ningún hallazgo de una herramienta de IA se convierte en trabajo sin verificarse
  (pipeline de dos etapas: buscador barato → juez con acceso a `git log`).

## Frameworks de planeación coexistentes

| Ruta | Dueño | Estado |
|---|---|---|
| `openspec/` | **SDD** (este framework) | Inicializado 2026-10-27, modo `openspec` |
| `.planning/` | **GSD Core 1.11.0** (scope local) | Solo `codebase/`; sin ROADMAP.md, PROJECT.md ni STATE.md |

GSD tiene 7 hooks `PreToolUse` activos en `.claude/settings.local.json`. Verificado el
2026-10-27: no bloquean escrituras a `openspec/`.
