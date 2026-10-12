import { readFileSync } from 'node:fs';

import typescript from 'typescript';
import { NodeFlags, SyntaxKind } from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

// The parsed reader of scripts/verify-app-boundaries.mjs (RFC-2026-029 §8/4 and §2.1/3; A1-257-1,
// Q0-257-3, C0-257-1; WP-1A-A0-002). It hands the application's source files to the TypeScript
// compiler's own parser, through the API of the `typescript` devDependency (§3.2), and reads from the
// syntax tree what the text reader in scripts/app-boundaries.mjs can only guess at: every import and
// re-export declaration, every `import()` call and `import('...')` type, every `require` and
// `import x = require()`, the `/// <reference>` directives, and every `any` type node. And, for a build
// configuration (A1-257-7, Q0-257r3-1, R0-257-8), its statements in the form readConfigShape gives
// (readShape, below), which the CLI requires to agree with the text reader's before the allowlisted
// shape is applied.
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

// A build configuration's top-level statements, in the form scripts/app-boundaries.mjs's text reader
// (readConfigShape) gives, field for field and in the same order, so that the CLI can require the two
// readings to be equal. Any node outside those forms is refused, as the text reader refuses it.
function readShape(sourceFile) {
  const refuse = (node, what) => { throw Object.assign(new Error(`${what} at offset ${node.pos ?? 0}`), { shape: true }); };
  const nameOf = (node) => (node?.kind === SyntaxKind.Identifier ? node.text : null);
  const typeNameOf = (node) => {
    if (node?.kind !== SyntaxKind.TypeReference || node.typeArguments?.length || nameOf(node.typeName) === null) refuse(node ?? sourceFile, 'expected a type name');
    return nameOf(node.typeName);
  };
  const value = (node) => {
    switch (node.kind) {
      case SyntaxKind.ObjectLiteralExpression:
        return {
          object: [...node.properties].map((property) => {
            if (property.kind !== SyntaxKind.PropertyAssignment || property.postfixToken) refuse(property, 'a key that is not written out (a spread, a computed key or a method)');
            const key = property.name.kind === SyntaxKind.Identifier || property.name.kind === SyntaxKind.StringLiteral ? property.name.text : refuse(property, 'a key that is not written out (a spread, a computed key or a method)');
            return [key, value(property.initializer)];
          }),
        };
      case SyntaxKind.ArrayLiteralExpression:
        return { array: [...node.elements].map(value) };
      case SyntaxKind.StringLiteral:
        return { string: node.text };
      case SyntaxKind.TrueKeyword:
        return { boolean: true };
      case SyntaxKind.FalseKeyword:
        return { boolean: false };
      case SyntaxKind.Identifier:
        return { ref: node.text };
      case SyntaxKind.CallExpression:
        if (nameOf(node.expression) === null || node.questionDotToken || node.typeArguments?.length) refuse(node, 'a value that is not literal data');
        return { call: node.expression.text, args: [...node.arguments].map(value) };
      case SyntaxKind.SatisfiesExpression:
        return { satisfies: typeNameOf(node.type), value: value(node.expression) };
      default:
        return refuse(node, 'a value that is not literal data');
    }
  };
  const statements = [];
  try {
    if ((sourceFile.referencedFiles ?? []).length + (sourceFile.typeReferenceDirectives ?? []).length + (sourceFile.libReferenceDirectives ?? []).length > 0) refuse(sourceFile, 'a triple-slash directive');
    for (const statement of sourceFile.statements) {
      if (statement.modifiers?.length) refuse(statement, 'a statement no allowlisted shape holds');
      switch (statement.kind) {
        case SyntaxKind.ImportDeclaration: {
          const clause = statement.importClause;
          if (!clause || statement.attributes || statement.moduleSpecifier.kind !== SyntaxKind.StringLiteral) refuse(statement, 'expected an import clause (`{ ... }` or one name)');
          if (clause.phaseModifier !== undefined && clause.phaseModifier !== SyntaxKind.TypeKeyword) refuse(statement, 'expected an import clause (`{ ... }` or one name)');
          if (clause.name && clause.namedBindings) refuse(statement, 'expected `from`');
          if (clause.namedBindings && clause.namedBindings.kind !== SyntaxKind.NamedImports) refuse(statement, 'expected an import clause (`{ ... }` or one name)');
          const named = [...(clause.namedBindings?.elements ?? [])].map((spec) => {
            if (spec.propertyName && spec.propertyName.kind !== SyntaxKind.Identifier) refuse(spec, 'expected an imported name');
            return spec.propertyName
              ? { name: spec.propertyName.text, alias: spec.name.text, typeOnly: spec.isTypeOnly === true }
              : { name: spec.name.text, alias: null, typeOnly: spec.isTypeOnly === true };
          });
          statements.push({ kind: 'import', specifier: statement.moduleSpecifier.text, typeOnly: clause.phaseModifier === SyntaxKind.TypeKeyword, defaultName: clause.name ? clause.name.text : null, named });
          break;
        }
        case SyntaxKind.ExportAssignment:
          if (statement.isExportEquals) refuse(statement, 'a statement no allowlisted shape holds');
          statements.push({ kind: 'export-default', value: value(statement.expression) });
          break;
        case SyntaxKind.VariableStatement: {
          const list = statement.declarationList;
          const [declaration, ...more] = list.declarations;
          if ((list.flags & (NodeFlags.Let | NodeFlags.Const | NodeFlags.Using)) !== NodeFlags.Const || more.length > 0 || !declaration || nameOf(declaration.name) === null
            || declaration.exclamationToken || !declaration.initializer) refuse(statement, 'a statement no allowlisted shape holds');
          statements.push({ kind: 'const', name: declaration.name.text, type: declaration.type ? typeNameOf(declaration.type) : null, value: value(declaration.initializer) });
          break;
        }
        case SyntaxKind.ExpressionStatement: {
          const e = statement.expression;
          const target = e.kind === SyntaxKind.BinaryExpression ? e.left : null;
          if (e.kind !== SyntaxKind.BinaryExpression || e.operatorToken.kind !== SyntaxKind.QuestionQuestionEqualsToken || e.right.kind !== SyntaxKind.StringLiteral
            || target.kind !== SyntaxKind.PropertyAccessExpression || target.questionDotToken || nameOf(target.name) === null
            || target.expression.kind !== SyntaxKind.PropertyAccessExpression || target.expression.questionDotToken
            || nameOf(target.expression.expression) !== 'process' || nameOf(target.expression.name) !== 'env') refuse(statement, 'a statement no allowlisted shape holds');
          statements.push({ kind: 'env-default', name: target.name.text, value: e.right.text });
          break;
        }
        case SyntaxKind.EmptyStatement:
          break;
        default:
          refuse(statement, 'a statement no allowlisted shape holds');
      }
    }
  } catch (error) {
    if (!error.shape) throw error;
    return { statements: [], refusals: [error.message] };
  }
  return { statements, refusals: [] };
}

// A parser over one compiler process. `parse(files)` takes a Map of repository path -> source text and
// returns a Map of path -> { found, refusals, anys, shape } for every path PARSED matches; `shape` is
// readShape's reading, which the CLI uses for build configurations only.
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
        results.set(path, { ...readTree(sourceFile, files.get(path)), shape: readShape(sourceFile) });
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
