// THE NEGATIVE CONTROL FOR `npm run typecheck` (RFC-2026-029 §8/3, WP-1A-A0-002).
//
// Every line that ends in an `expect:` marker is a deliberate type error that exactly one of
// RFC-2026-029 §2.1/2's flags produces. `scripts/verify-typecheck-control.mjs` runs `tsc --noEmit`
// on this directory and requires each marked error, at its line, with its code. A flag turned off
// in tsconfig.base.json removes its error and fails the control; a fixture that no longer fails
// fails it too. This file is data for that script: it is never imported, built or run.
import { Shape } from './shape';

export function implicitAny(value) { return value; } // expect: TS7006 strict (noImplicitAny)
export const nothing: string = null; // expect: TS2322 strict (strictNullChecks)

const names: string[] = [];
export const first: string = names[0]; // expect: TS2322 noUncheckedIndexedAccess

class Base {
  greet(): string { return 'base'; }
}
export class Derived extends Base {
  greet(): string { return 'derived'; } // expect: TS4114 noImplicitOverride
}

export function fallthrough(n: number): number {
  let total = 0;
  switch (n) {
    case 1: // expect: TS7029 noFallthroughCasesInSwitch
      total += 1;
    case 2:
      total += 2;
      break;
    default:
      break;
  }
  return total;
}

export { Shape }; // expect: TS1205 isolatedModules
