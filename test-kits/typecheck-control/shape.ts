// A type the control below re-exports the wrong way (RFC-2026-029 §2.1/2, isolatedModules).
export interface Shape {
  readonly sides: number;
}
