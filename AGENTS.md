<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->

## Project conventions

Follow the local React Projects and SaaSyLand organization:

- UI, CSS, branding, theme preferences, and email templates belong in `src/presentation/`.
- Feature operations belong in `src/modules/{feature}/use-cases/{verb-noun}.ts`. Export native server functions and their query options directly. Keep shared database logic only when it carries actual behavior or is reused.
- Query keys belong to the owning feature or integration. Preserve their tuple values when moving code; use the same query options in loaders, components, and cache operations.
- Import from the defining file. Do not add global constants/utility barrels or objects that only collect unrelated functions.
- Protected server functions enforce authorization themselves. Route guards do not authorize RPC calls.
- Keep existing checkout, inventory compensation, webhook verification, audit scheduling, and realtime invalidation semantics when refactoring.
- Prefer direct expressions and native library APIs. Avoid forwarding components, one-call wrappers, and aliases for plain zero/one values.
- Comments should explain non-obvious constraints or intent. Omit decorative separators, code narration, and descriptions already expressed by names or types.
- Tests use `vite-plus/test`; mock external providers and use local fixtures. Build and test commands do not require remote database mutations.
- Keep Vite+, formatter, lint, and test configuration in `vite.config.ts`, and script entry points in `package.json`. Use `bun run <script>` or `vp run <script>` to select repository tool versions.
- Preserve the React Projects/SaaSyLand lint baseline: all six configured categories, including nursery, are errors; type-aware linting and type checking stay enabled. Keep the 800-line file, 150-line function, and 20-statement limits. Match SaaSyLand's narrow test, mock, presentation, route, and config overrides; document any additional exception where it applies instead of disabling shared rules. Warnings and unused suppressions must fail checks.
- Use `.env.development`, `.env.preview`, and `.env.production` with matching Wrangler environments and Vite modes. `.env.test` contains dummy values. Browser variables use `VITE_`; declare Worker secrets in `wrangler.jsonc`. Cloudflare management credentials stay in local tooling.
- Build with `bun run build:preview` or `bun run build:production`; verify generated artifacts without deploying. Generate Worker declarations with `bun run typegen` instead of editing or committing them.
- Tests live beside their feature in `__test__/`; database suites use `*.integration.test.ts`. Shared test infrastructure belongs in `src/platform/testing/`. Use `test:unit`, `test:integration`, and `test:coverage` scripts for those scopes.
- Keep shared Tailwind/theme rules in `src/presentation/styles/globals.css`, with admin and storefront rules in their route stylesheets. Preserve critical font inlining, CSS ordering, and visual values when splitting styles.
- Track `skills-lock.json` and `scripts/sync-skills.ts`; treat `.agents/skills` and `.claude/skills` as generated vendor groups. Use `skills:sync` to restore and `skills:update` to update explicitly.
- Git hooks use `.vite-hooks/pre-commit` and `.vite-hooks/prepare-commit-msg`. CI and deployment workflows share `.github/actions/setup`; keep their checks and commands aligned with local scripts.
