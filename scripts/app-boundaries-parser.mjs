import { readFileSync } from 'node:fs';

import typescript from 'typescript';
import { SyntaxKind } from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

// The parsed reader of scripts/verify-app-boundaries.mjs (RFC-2026-029 §8/4 and §2.1/3; A1-257-1,
// Q0-257-3, C0-257-1; WP-1A-A0-002). It hands the application's source files to the TypeScript
// compiler's own parser, through the API of the `typescript` devDependency (§3.2), and reads from the
// syntax tree what the text reader in scripts/app-boundaries.mjs can only guess at: every import and
// re-export declaration, every `import()` call and `import('...')` type, every `require` and
// `import x = require()`, the `/// <reference>` directives, and every `any` type node.
//
// WHERE IT RUNS, AND WHY THAT IS NOT THE TOOLING TIER. RFC-2026-029 §2.1/4 keeps the tooling tier on the
// standard library and keeps dependency code out of `npm run check`, so that a compromised install
// cannot disable the guards that would report it. This module is the one file under scripts/ that
// imports a package, and the one file anywhere that RFC-2026-029 §3.2's `typescript` cell admits (its
// Amendment 2026-10-12, by the Product Owner's answer of 2026-10-12: the parser API only, run in CI),
// and it is reached only by `node scripts/verify-app-boundaries.mjs`, which CI runs with
// `--require-parser` in the application job, after the clean install and on a runner of its own,
// next to `tsc` and the other dependency-running steps (.github/workflows/ci.yml, job `application`).
// No test imports it: the test suite's import closure would refuse it (scripts/verify-test-coverage-
// floor.mjs, ALLOWED_DEPENDENCIES = []), and test-kits/app-stack.test.mjs pins that it is the only
// such file. It stands where §2.1/4's lint step stands while ESLint is deferred.
//
// THE API IS TYPESCRIPT 7'S `unstable` ONE: it spawns the compiler's native binary and reads the tree
// it returns. The version is pinned exactly (package.json, §4.2), and this module refuses to run under
// any other, so a version change re-measures it rather than trusting it.
//
// THE FILES NEVER TOUCH THE DISK. They are served to the compiler from memory through a virtual file
// system rooted at /__app_boundaries__/<n>/, with `noResolve` and `noLib`, so it reads nothing else
// and resolves nothing: what an import names is all this reader reports. A file with a syntax error
// is refused, never half-read.

export const PARSED = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

const PINNED = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).devDependencies?.typescript;

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

function messageOf(diagnostic) {
  let message = diagnostic.messageText ?? diagnostic.text ?? diagnostic.message ?? 'a syntax error';
  while (message && typeof message === 'object') message = message.messageText;
  return String(message);
}

function stringOf(node) {
  return node && (node.kind === SyntaxKind.StringLiteral || node.kind === SyntaxKind.NoSubstitutionTemplateLiteral) ? node.text : null;
}

// One source file's tree, read into the shape the rules take: `found` (specifier and how it was
// found), `refusals`, and `anys` (the lines of `any` type nodes).
function readTree(sourceFile, text) {
  const found = [];
  const refusals = [];
  const anys = [];
  for (const reference of sourceFile.typeReferenceDirectives ?? []) found.push({ specifier: reference.fileName, kind: 'reference-types' });
  for (const reference of sourceFile.referencedFiles ?? []) {
    found.push({ specifier: reference.fileName.startsWith('.') ? reference.fileName : `./${reference.fileName}`, kind: 'reference-path' });
  }
  const at = (node) => lineOf(text, node.end);
  const visit = (node) => {
    switch (node.kind) {
      case SyntaxKind.ImportDeclaration:
      case SyntaxKind.ExportDeclaration: {
        if (node.moduleSpecifier === undefined) break; // a local export loads nothing
        const specifier = stringOf(node.moduleSpecifier);
        if (specifier === null) refusals.push(`line ${at(node)}: an import or export whose specifier is not one string literal`);
        else found.push({ specifier, kind: node.kind === SyntaxKind.ImportDeclaration ? 'import' : 'export-from' });
        break;
      }
      case SyntaxKind.ImportEqualsDeclaration:
        if (node.moduleReference?.kind === SyntaxKind.ExternalModuleReference) {
          refusals.push(`line ${at(node)}: \`import ... = require()\` is CommonJS loading, a module this guard cannot name`);
        }
        break;
      case SyntaxKind.CallExpression:
        if (node.expression?.kind === SyntaxKind.ImportKeyword) {
          const [first, ...rest] = node.arguments ?? [];
          const specifier = stringOf(first);
          if (specifier === null || rest.length > 1) refusals.push(`line ${at(node)}: dynamic import() whose argument is not one string literal`);
          else found.push({ specifier, kind: 'dynamic-import' });
        }
        break;
      case SyntaxKind.ImportType: {
        const specifier = node.argument?.kind === SyntaxKind.LiteralType ? stringOf(node.argument.literal) : null;
        if (specifier === null) refusals.push(`line ${at(node)}: an import('...') type whose argument is not one string literal`);
        else found.push({ specifier, kind: 'import-type' });
        break;
      }
      case SyntaxKind.Identifier:
        if (node.text === 'require' || node.text === 'createRequire') {
          refusals.push(`line ${at(node)}: \`${node.text}\` is CommonJS loading, a module this guard cannot name`);
        }
        break;
      case SyntaxKind.AnyKeyword:
        anys.push(at(node));
        break;
      default:
        break;
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);
  // The compiler keeps its own list of the module names a file imports. One this walk did not report
  // is a form it does not know, and is refused rather than missed.
  const seen = new Set(found.map((f) => f.specifier));
  for (const name of sourceFile.imports ?? []) {
    if (typeof name?.text === 'string' && !seen.has(name.text) && !refusals.length) {
      refusals.push(`the compiler reads an import of ${JSON.stringify(name.text)} that this reader did not; refused rather than missed`);
    }
  }
  return { found, refusals, anys };
}

// A parser over one compiler process. `parse(files)` takes a Map of repository path -> source text and
// returns a Map of path -> { found, refusals, anys } for every path PARSED matches.
export function createParser() {
  if (typeof typescript.version !== 'string' || typescript.version !== PINNED) {
    throw new Error(`the parsed boundary reader is measured on typescript ${PINNED}, and ${typescript.version} is installed; re-measure it before trusting it`);
  }
  const served = new Map();
  const under = (directory) => (directory.endsWith('/') ? directory : `${directory}/`);
  const fs = {
    readFile: (path) => (served.has(path) ? served.get(path) : null),
    fileExists: (path) => served.has(path),
    directoryExists: (path) => [...served.keys()].some((key) => key.startsWith(under(path))),
    getAccessibleEntries: (directory) => {
      const prefix = under(directory);
      const files = new Set();
      const directories = new Set();
      for (const key of served.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const slash = rest.indexOf('/');
        if (slash === -1) files.add(rest); else directories.add(rest.slice(0, slash));
      }
      return { files: [...files], directories: [...directories] };
    },
    realpath: (path) => path,
  };
  const api = new API({ cwd: '/__app_boundaries__', fs });
  let round = 0;
  return {
    parse(files) {
      round += 1;
      const base = `/__app_boundaries__/${round}`;
      const paths = [...files.keys()].filter((path) => PARSED.test(path) && files.get(path) !== null);
      served.clear();
      for (const path of paths) served.set(`${base}/${path}`, files.get(path));
      served.set(`${base}/tsconfig.json`, JSON.stringify({
        compilerOptions: { allowJs: true, checkJs: false, jsx: 'preserve', noEmit: true, noResolve: true, noLib: true, types: [], target: 'esnext', module: 'esnext' },
        files: paths,
      }));
      const results = new Map();
      if (paths.length === 0) return results;
      const snapshot = api.updateSnapshot({ openProjects: [`${base}/tsconfig.json`] });
      const project = snapshot.getProject(`${base}/tsconfig.json`) ?? snapshot.getProjects()[0];
      if (!project) throw new Error('the compiler opened no project for the files it was given');
      for (const path of paths) {
        const file = `${base}/${path}`;
        const sourceFile = project.program.getSourceFile(file);
        if (!sourceFile) { results.set(path, { found: [], refusals: ['the compiler did not read this file'], anys: [] }); continue; }
        const syntax = project.program.getSyntacticDiagnostics(file) ?? [];
        if (syntax.length > 0) {
          results.set(path, { found: [], refusals: [`does not parse (${syntax.map(messageOf).join('; ')}); a file the compiler cannot read is not read by halves`], anys: [] });
          continue;
        }
        results.set(path, readTree(sourceFile, files.get(path)));
      }
      snapshot.dispose();
      api.updateSnapshot({ closeProjects: [`${base}/tsconfig.json`] }).dispose();
      return results;
    },
    close() {
      api.close();
    },
  };
}
