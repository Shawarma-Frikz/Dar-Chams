/**
 * Configuration problems, in the shape every layer reports them.
 *
 * A message is only useful if the reader can act on it, so an issue always
 * carries the path it was found at, what was found and what would be accepted.
 * Formatting lives here rather than at each call site so a bad scenario reads
 * the same in the build log, in the terminal and in phase 09's editor.
 */

export type IssueLayer = 'defaults' | 'scenario' | 'settings' | 'runtime';

export interface ConfigIssue {
  readonly layer: IssueLayer;
  /** Dotted path inside the offending document, e.g. `battery.min_soc`. */
  readonly path: string;
  /** Stable identifier, so a check can assert the rule and not the wording. */
  readonly code: string;
  /** One sentence: what is wrong with the value at `path`. */
  readonly message: string;
  /** The offending value, rendered for reading, when there is one. */
  readonly received?: string;
  /** What the contract accepts instead. */
  readonly expected?: string;
  /** The concrete edit that resolves it, when there is an obvious one. */
  readonly hint?: string;
}

export class ConfigError extends Error {
  readonly source: string;
  readonly issues: readonly ConfigIssue[];

  constructor(source: string, issues: readonly ConfigIssue[]) {
    super(formatIssues(source, issues));
    this.name = 'ConfigError';
    this.source = source;
    this.issues = issues;
  }
}

const LAYER_NAMES: Record<IssueLayer, string> = {
  defaults: 'defaults',
  scenario: 'scenario configuration',
  settings: 'user settings',
  runtime: 'runtime state',
};

export function formatIssues(source: string, issues: readonly ConfigIssue[]): string {
  if (issues.length === 0) return `${source}: valid`;
  const layers = [...new Set(issues.map((issue) => issue.layer))];
  const layer = layers.length === 1 ? ` in the ${LAYER_NAMES[layers[0] ?? 'scenario']} layer` : '';
  const count = issues.length === 1 ? '1 problem' : `${issues.length} problems`;
  const lines = [`${source}: ${count}${layer}`, ''];
  issues.forEach((issue, index) => {
    lines.push(`${index + 1}. ${issue.path}  ·  ${issue.code}`);
    lines.push(`   ${issue.message}`);
    if (issue.received !== undefined) lines.push(`   received  ${issue.received}`);
    if (issue.expected !== undefined) lines.push(`   expected  ${issue.expected}`);
    if (issue.hint !== undefined) lines.push(`   fix       ${issue.hint}`);
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

/** Renders a value the way a reader would write it back into a scenario file. */
export function describeValue(value: unknown): string {
  if (value === undefined) return 'nothing';
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  const text = JSON.stringify(value);
  if (text === undefined) return String(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

/** Resolves a JSON Pointer instance path against the document that failed. */
export function readPath(document: unknown, pointer: string): unknown {
  if (pointer === '') return document;
  return pointer
    .split('/')
    .slice(1)
    .reduce<unknown>((node, raw) => {
      if (node === null || typeof node !== 'object') return undefined;
      const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
      return (node as Record<string, unknown>)[key];
    }, document);
}

export function sortIssues(issues: readonly ConfigIssue[]): ConfigIssue[] {
  return [...issues].sort(
    (a, b) => a.path.localeCompare(b.path, 'en') || a.code.localeCompare(b.code, 'en'),
  );
}
