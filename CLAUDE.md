# GeneSys — Hebrew Letter Cube

Static SPA (no build step). Three.js 0.160.0 via CDN importmap. Entry: `index.html` → `src/main.js`.

## Architecture
- 19 ES modules in `src/` + `index.html` (HTML/CSS shell)
- `src/data/` — pure data (hebrew, digits, amino). No DOM/Three.js
- `src/cube/` — scene, build, rotation, state, highlight, permutation
- `src/pipeline/` — source, transforms, engine, mapping, recipe, chain
- `src/ui/` — bottom-bar, letter-panel, pipeline-bar, output-panel, mapping-dialog, chain-builder
- `src/analysis/` — properties (AA stats), batch (parameter search)

## Key Patterns
- Dependency injection via `init*()` functions — no circular imports
- `state.js` owns mutable `letters` array (single source of truth)
- Transform registry in `transforms.js` — pluggable via `registerTransform()`
- Pipeline engine gets cube deps via `initEngine({...})` — decoupled from Three.js
- Permutation algebra in `cube/permutation.js` enables headless pipeline eval

## Deployment
- Netlify: https://genesys-project.netlify.app
- Deploy: `netlify deploy --prod --dir=.`
- No build step — serves repo root directly

## Testing
- `test/permutation-test.js` — run with `bun test/permutation-test.js`

## Detailed docs
- `.claude/notes/brainstorm.md` — vision, future directions, architecture ideas
- `.claude/notes/protein-api-research.md` — API research for bio integration
