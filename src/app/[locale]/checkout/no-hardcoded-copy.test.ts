/**
 * Guard: the basket and checkout pages render no copy outside next-intl keys.
 *
 * The i18n pass (phase 04) extracted Russian text by grepping for Cyrillic;
 * these pages were already English by then, so their copy passed the gate and
 * stayed hardcoded — the TR storefront showed "Your basket is empty", "Place
 * Order", "Postal Code"… (found at launch, 27.09.2026). This test parses the
 * TSX with the TypeScript compiler and fails on any user-visible literal:
 *   - JSX text with a letter;
 *   - string literals in text-bearing JSX attributes (placeholder, alt, title,
 *     aria-label, label, helperText);
 *   - string literals rendered straight from a JSX expression
 *     (`{'Free'}`, `{cond ? 'A' : 'B'}`, `{x || 'Fallback'}`);
 *   - labels handed to the local form helpers (`field('Street', …)`) and
 *     `label: '…'` properties (breadcrumbs, summary rows);
 *   - fallbacks passed to setError(...).
 * Every such string must come from t('…') (messages/*.json, Tolgee #34).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(__dirname, '../../../..');
const FILES = [
  'src/app/[locale]/basket/page.tsx',
  'src/app/[locale]/checkout/page.tsx',
  'src/app/[locale]/checkout/success/page.tsx',
  'src/app/[locale]/account/addresses/page.tsx',
];

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
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    out.push(`${file}:${line + 1}: ${JSON.stringify(text.trim().replace(/\s+/g, ' '))}`);
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

describe('basket / checkout copy goes through next-intl keys', () => {
  for (const file of FILES) {
    it(`${file} has no hardcoded user-visible text`, () => {
      expect(violations(file)).toEqual([]);
    });
  }
});
