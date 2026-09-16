import fs from 'node:fs';
import path from 'node:path';
import { parseSync } from 'rolldown/utils';
import postcss from 'postcss';

// Read-only source validation. Uses dependencies already installed by Vite.
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
const files = walk('src').filter(file => /\.(js|jsx|css)$/.test(file));
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const edges = [];
const errors = [];
const exports = new Map();
const imports = [];
const cssRules = {};
function resolve(from, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
  const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : path.posix.join(path.posix.dirname(from), spec);
  return [base, `${base}.js`, `${base}.jsx`, `${base}/index.js`].find(file => sources.has(file)) || base;
}
function visit(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (node.type) fn(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) value.forEach(item => visit(item, fn));
    else if (value && typeof value === 'object') visit(value, fn);
  }
}
for (const [file, source] of sources) {
  if (file.endsWith('.css')) {
    const root = postcss.parse(source, { from: file });
    root.walkAtRules('import', rule => {
      const spec = rule.params.match(/["']([^"']+)["']/)?.[1];
      const to = spec && resolve(file, spec);
      if (to) edges.push({ from: file, to });
    });
    if (file.startsWith('src/tenant/')) {
      cssRules[file] = [];
      root.walkRules(rule => cssRules[file].push({ selector: rule.selector, line: rule.source.start.line }));
    }
    continue;
  }
  const parsed = parseSync(file, source);
  if (parsed.errors.length) errors.push({ file, errors: parsed.errors });
  const names = new Set();
  for (const node of parsed.program.body) {
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration?.id) names.add(node.declaration.id.name);
      for (const decl of node.declaration?.declarations || []) if (decl.id.name) names.add(decl.id.name);
      for (const spec of node.specifiers || []) names.add(spec.exported.name);
    }
  }
  exports.set(file, names);
  visit(parsed.program, node => {
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type) && node.source) {
      if (typeof node.source.value !== 'string') { errors.push({ file, message: 'Nonliteral module path needs manual review' }); return; }
      const to = resolve(file, node.source.value);
      if (to) {
        edges.push({ from: file, to });
        if (node.type === 'ImportDeclaration') for (const spec of node.specifiers) {
          if (spec.type !== 'ImportNamespaceSpecifier') imports.push({ from: file, to, name: spec.imported?.name || 'default' });
        }
      }
    }
  });
}
const reachable = new Set();
function mark(file) { if (reachable.has(file)) return; reachable.add(file); edges.filter(edge => edge.from === file).forEach(edge => mark(edge.to)); }
mark('src/main.jsx');
const unresolved = edges.filter(edge => !sources.has(edge.to));
const missingExports = imports.filter(item => sources.has(item.to) && exports.has(item.to) && !exports.get(item.to).has(item.name));
const unreachableTenant = files.filter(file => file.startsWith('src/tenant/') && !reachable.has(file));
const report = { files: files.length, errors, unresolved, missingExports, unreachableTenant, edges, cssRules };
if (process.argv.includes('--json')) console.log(JSON.stringify(report));
else console.log(JSON.stringify({ files: files.length, errors, unresolved, missingExports, unreachableTenant }, null, 2));
if (errors.length || unresolved.some(edge => reachable.has(edge.from)) || missingExports.length) process.exitCode = 1;
