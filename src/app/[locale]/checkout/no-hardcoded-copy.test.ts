/**
 * Guard: the storefront renders no copy outside next-intl keys.
 *
 * The i18n pass (phase 04) extracted Russian text by grepping for Cyrillic;
 * copy that was already English by then passed the gate and stayed hardcoded —
 * the TR storefront showed "Your basket is empty", "Place Order", "Postal
 * Code"… (found at launch, 27.09.2026), then "Track shipment", "Data &
 * Privacy", "Delivery & Payment"… (29.09.2026). This test parses every
 * non-test TSX file under src/ with the TypeScript compiler and fails on any
 * user-visible literal:
 *   - JSX text with a letter;
 *   - string literals in text-bearing JSX attributes (placeholder, alt, title,
 *     aria-label, label, helperText);
 *   - string literals rendered straight from a JSX expression
 *     (`{'Free'}`, `{cond ? 'A' : 'B'}`, `{x || 'Fallback'}`);
 *   - labels handed to the local form helpers (`field('Street', …)`) and
 *     `label: '…'` properties (breadcrumbs, summary rows, nav links);
 *   - fallbacks passed to setError(...).
 * Every such string must come from t('…') (messages/*.json, Tolgee #34),
 * except the few entries in ALLOWED below, which are the same in every locale.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(__dirname, '../../../..');

/** Every non-test .tsx under src/, as repo-relative paths. */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) return tsxFiles(full);
    return e.name.endsWith('.tsx') && !/\.test\.tsx$/.test(e.name) ? [relative(ROOT, full)] : [];
  });
}
const FILES = tsxFiles(resolve(ROOT, 'src')).sort();

/**
 * Literals that are legitimately the same in every locale. Keep this short:
 * anything a Turkish or English reader would expect translated goes to t().
 */
const ALLOWED_EXACT = new Set([
  'American Creator', // brand name (logo alt, footer)
  '© American Creator', // copyright line: brand name only
  '&copy; American Creator', // same, as raw JSX text with the HTML entity
  'WhatsApp', // product name (social link label)
  'Instagram', // product name (social link label)
  'Troy', // Turkish card network name (payment logo alt)
  'XP', // Creator Club points unit, shown as-is in both locales
]);
const isAllowed = (text: string): boolean =>
  ALLOWED_EXACT.has(text) ||
  // e-mail addresses (contact address, input examples) are not words to translate
  text.includes('@') ||
  // ETBİS registry line: the official Turkish label stays Turkish in both locales
  text.startsWith('ETBİS Site Kayıt No');

const TEXT_ATTRS = new Set(['placeholder', 'alt', 'title', 'aria-label', 'label', 'helperText']);
const LABEL_HELPERS = new Set(['field', 'optField']);
const HAS_LETTER = /\p{L}/u;

function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
  }
  return null;
}

/** True when the literal's value is what the JSX expression renders. */
function renderedFromJsxExpression(node: ts.Node): boolean {
  let cur: ts.Node = node;
  for (;;) {
    const parent = cur.parent;
    if (!parent) return false;
    if (ts.isJsxExpression(parent)) return !ts.isJsxAttribute(parent.parent);
    // `{['Choose delivery', 'Payment'].map((label) => …)}` renders its elements.
    if (ts.isArrayLiteralExpression(parent)) {
      cur = parent;
      continue;
    }
    if (ts.isPropertyAccessExpression(parent) && parent.expression === cur && ts.isArrayLiteralExpression(cur)) {
      cur = parent.parent && ts.isCallExpression(parent.parent) ? parent.parent : parent;
      continue;
    }
    if (ts.isParenthesizedExpression(parent)) {
      cur = parent;
      continue;
    }
    if (ts.isConditionalExpression(parent) && parent.condition !== cur) {
      cur = parent;
      continue;
    }
    if (
      ts.isBinaryExpression(parent) &&
      [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(
        parent.operatorToken.kind,
      ) &&
      parent.right === cur
    ) {
      cur = parent;
      continue;
    }
    return false;
  }
}

function violations(file: string): string[] {
  const src = readFileSync(resolve(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const report = (node: ts.Node, text: string) => {
    const shown = text.trim().replace(/\s+/g, ' ');
    if (isAllowed(shown)) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    out.push(`${file}:${line + 1}: ${JSON.stringify(shown)}`);
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      if (HAS_LETTER.test(node.text)) report(node, node.text);
    } else {
      const text = literalText(node);
      if (text !== null && HAS_LETTER.test(text)) {
        const parent = node.parent;
        const attrName =
          parent && ts.isJsxAttribute(parent)
            ? parent.name.getText(sf)
            : parent && ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)
              ? parent.parent.name.getText(sf)
              : null;
        const isTextAttr = attrName !== null && TEXT_ATTRS.has(attrName);
        const isLabelProp =
          parent &&
          ts.isPropertyAssignment(parent) &&
          parent.initializer === node &&
          ['label', 'aria-label', 'placeholder', 'title', 'message'].includes(parent.name.getText(sf).replace(/['"]/g, ''));
        const isHelperLabel =
          parent &&
          ts.isCallExpression(parent) &&
          ts.isIdentifier(parent.expression) &&
          LABEL_HELPERS.has(parent.expression.text) &&
          parent.arguments[0] === node;
        const inHelperTernary =
          parent &&
          ts.isConditionalExpression(parent) &&
          parent.condition !== node &&
          ts.isCallExpression(parent.parent) &&
          ts.isIdentifier(parent.parent.expression) &&
          LABEL_HELPERS.has(parent.parent.expression.text);
        const isErrorFallback = (() => {
          let cur: ts.Node = node;
          while (cur.parent && (ts.isBinaryExpression(cur.parent) || ts.isParenthesizedExpression(cur.parent) || ts.isConditionalExpression(cur.parent))) {
            cur = cur.parent;
          }
          const call = cur.parent;
          return !!call && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && call.expression.text === 'setError';
        })();
        if (isTextAttr || isLabelProp || isHelperLabel || inHelperTernary || isErrorFallback || renderedFromJsxExpression(node)) {
          report(node, text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

describe('storefront copy goes through next-intl keys', () => {
  it('scans the whole app', () => {
    expect(FILES.length).toBeGreaterThan(50);
  });
  for (const file of FILES) {
    it(`${file} has no hardcoded user-visible text`, () => {
      expect(violations(file)).toEqual([]);
    });
  }
});
