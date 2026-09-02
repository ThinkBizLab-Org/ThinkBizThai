export const TOOLCHAIN = Object.freeze({
  node: 'v24.20.0',
  npm: '11.19.0',
});

export function assertToolchain({ nodeVersion, npmVersion }) {
  const mismatches = [];
  if (nodeVersion !== TOOLCHAIN.node) mismatches.push(`node=${nodeVersion}`);
  if (npmVersion !== TOOLCHAIN.npm) mismatches.push(`npm=${npmVersion}`);
  if (mismatches.length > 0) {
    throw new Error(`Expected Node ${TOOLCHAIN.node} and npm ${TOOLCHAIN.npm}; received ${mismatches.join(', ')}.`);
  }
}
