// Independent review found `ctr-pag-001/schema.json` declaring `sort.minItems: 1` while the
// test predicate required 2, so the fixture named `invalid-unstable-sort-without-tiebreaker`
// was VALID against the shipped contract. Independent testing generalised it: every
// `additionalProperties`, `pattern` and `type` in every schema was decorative, because
// nothing in the repository executed a schema. Extra keys carrying secrets passed at
// envelope, tenant_context, accepted, error and scope level.
//
// This is a deliberately small JSON Schema subset -- the repository declares zero
// dependencies -- covering only the keywords the shared-kernel catalog actually uses. An
// unknown keyword is an ERROR, not a silent pass: a schema must never appear to constrain
// something this validator ignores.
const SUPPORTED = new Set([
  '$schema', '$id', 'title', 'description', 'type', 'enum', 'const', 'required',
  'properties', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems',
  'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'maxProperties', 'minProperties',
  'format', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else', '$ref',
]);

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value === 'number' ? 'number' : typeof value;
};

const matchesType = (value, expected) => {
  const actual = typeOf(value);
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((t) => (t === 'number' ? actual === 'number' || actual === 'integer' : actual === t));
};

export function assertSchemaSupported(schema, path = '#') {
  if (!schema || typeof schema !== 'object') return;
  for (const key of Object.keys(schema)) {
    // `x-` keywords are annotations by convention: they constrain nothing, so ignoring
    // them cannot make a schema appear stricter than it is.
    if (key.startsWith('x-')) continue;
    if (!SUPPORTED.has(key)) {
      throw new Error(`${path}: unsupported schema keyword '${key}'. A schema must not appear to constrain something this validator ignores.`);
    }
  }
  for (const key of ['properties']) {
    for (const [name, sub] of Object.entries(schema[key] ?? {})) assertSchemaSupported(sub, `${path}.${key}.${name}`);
  }
  for (const key of ['items', 'not', 'if', 'then', 'else', 'additionalProperties']) {
    if (typeof schema[key] === 'object') assertSchemaSupported(schema[key], `${path}.${key}`);
  }
  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    (schema[key] ?? []).forEach((sub, i) => assertSchemaSupported(sub, `${path}.${key}[${i}]`));
  }
}

export function validate(schema, value, { resolve = () => null, path = '$' } = {}) {
  const errors = [];
  const fail = (message) => errors.push(`${path}: ${message}`);
  if (!schema || typeof schema !== 'object') return errors;

  if ('$ref' in schema) {
    const target = resolve(schema.$ref);
    if (!target) return [`${path}: unresolvable $ref '${schema.$ref}'`];
    return validate(target, value, { resolve, path });
  }
  if ('type' in schema && !matchesType(value, schema.type)) {
    fail(`expected type ${JSON.stringify(schema.type)}, got ${typeOf(value)}`);
    return errors;
  }
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) fail(`expected const ${JSON.stringify(schema.const)}`);
  if ('enum' in schema && !schema.enum.some((option) => JSON.stringify(option) === JSON.stringify(value))) fail(`value not in enum ${JSON.stringify(schema.enum)}`);

  if (typeof value === 'string') {
    if ('minLength' in schema && value.length < schema.minLength) fail(`shorter than minLength ${schema.minLength}`);
    if ('maxLength' in schema && value.length > schema.maxLength) fail(`longer than maxLength ${schema.maxLength}`);
    if ('pattern' in schema && !new RegExp(schema.pattern, 'u').test(value)) fail(`does not match pattern ${schema.pattern}`);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) fail('is not a valid date-time');
  }
  if (typeOf(value) === 'number' || typeOf(value) === 'integer') {
    if ('minimum' in schema && value < schema.minimum) fail(`below minimum ${schema.minimum}`);
    if ('maximum' in schema && value > schema.maximum) fail(`above maximum ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if ('minItems' in schema && value.length < schema.minItems) fail(`fewer than minItems ${schema.minItems}`);
    if ('maxItems' in schema && value.length > schema.maxItems) fail(`more than maxItems ${schema.maxItems}`);
    if (schema.uniqueItems === true) {
      const seen = value.map((item) => JSON.stringify(item));
      if (new Set(seen).size !== seen.length) fail('array items are not unique');
    }
    if (schema.items) value.forEach((item, i) => errors.push(...validate(schema.items, item, { resolve, path: `${path}[${i}]` })));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if ('maxProperties' in schema && keys.length > schema.maxProperties) fail(`has ${keys.length} properties, more than maxProperties ${schema.maxProperties}`);
    if ('minProperties' in schema && keys.length < schema.minProperties) fail(`has ${keys.length} properties, fewer than minProperties ${schema.minProperties}`);
    for (const name of schema.required ?? []) {
      if (!(name in value)) fail(`missing required property '${name}'`);
    }
    for (const [name, sub] of Object.entries(schema.properties ?? {})) {
      if (name in value) errors.push(...validate(sub, value[name], { resolve, path: `${path}.${name}` }));
    }
    if (schema.additionalProperties === false) {
      const declared = new Set(Object.keys(schema.properties ?? {}));
      for (const name of keys) {
        if (!declared.has(name)) fail(`additional property '${name}' is not permitted`);
      }
    }
  }

  for (const sub of schema.allOf ?? []) errors.push(...validate(sub, value, { resolve, path }));
  if (schema.anyOf && !schema.anyOf.some((sub) => validate(sub, value, { resolve, path }).length === 0)) fail('matches no branch of anyOf');
  if (schema.oneOf) {
    const matched = schema.oneOf.filter((sub) => validate(sub, value, { resolve, path }).length === 0).length;
    if (matched !== 1) fail(`matches ${matched} branches of oneOf, expected exactly 1`);
  }
  if (schema.not && validate(schema.not, value, { resolve, path }).length === 0) fail('matches a schema it must not match');
  if (schema.if) {
    const branch = validate(schema.if, value, { resolve, path }).length === 0 ? schema.then : schema.else;
    if (branch) errors.push(...validate(branch, value, { resolve, path }));
  }
  return errors;
}

export const isValid = (schema, value, options) => validate(schema, value, options).length === 0;
