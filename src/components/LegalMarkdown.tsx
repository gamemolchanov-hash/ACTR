import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { palette } from '@/lib/palette';

/**
 * Minimal, dependency-free Markdown renderer for legal documents (FBG-394).
 *
 * Renders the constrained GitHub-flavoured subset used by our legal texts:
 *   - ATX headings (`#`..`######`)
 *   - GFM pipe tables (with `:---`/`---` separator rows), incl. header-only callouts
 *   - unordered lists (`* ` / `- `)
 *   - paragraphs
 *   - inline `**bold**`, `*italic*` and backslash escapes (`\.`, `\+`, …)
 *   - hard line breaks (`<br>`) — used to un-glue multi-field table cells (FBG-396)
 *   - inline links `[text](href)` — only site-relative (`/…`) or `https://`
 *     targets become an <a>; any other scheme (javascript:, data:, …) is left
 *     as literal text, so no unsafe URL ever reaches an href (FBG-399)
 *
 * We keep our own parser instead of pulling react-markdown + remark-gfm into the
 * storefront bundle: the input is a small, fixed set of static documents, the
 * page is a Server Component, and the grammar we need is tiny. The only HTML
 * token recognised is `<br>` (a void element, no attributes); everything else is
 * plain text or a scheme-filtered link, so there is no XSS surface.
 */

const FONT = 'LiraFix, "Futura PT", "Futura PT Fallback", Helvetica';

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; rows: string[][] };

/** Split a `| a | b |` row into trimmed cells, dropping the outer pipes. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

/** A GFM separator row: every cell is `---`, `:---`, `---:` or `:---:`. */
function isSeparatorRow(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^[*-]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === '') {
      i += 1;
      continue;
    }

    // Table: a pipe row immediately followed by a separator row.
    if (
      line.startsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      isSeparatorRow(lines[i + 1])
    ) {
      const rows: string[][] = [splitRow(line)];
      i += 2; // skip header + separator
      while (i < lines.length && lines[i].trim().startsWith('|') && !isSeparatorRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: 'table', rows });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (BULLET_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = BULLET_RE.exec(lines[i].trim());
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ kind: 'list', items });
      continue;
    }

    // Paragraph: consume consecutive plain lines until a blank/special line.
    const para: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const l = lines[i].trim();
      if (l === '' || l.startsWith('|') || HEADING_RE.test(l) || BULLET_RE.test(l)) break;
      para.push(l);
      i += 1;
    }
    blocks.push({ kind: 'paragraph', text: para.join(' ') });
  }

  return blocks;
}

// `\x` (escape) | `**bold**` | `*italic*` | `<br>` (hard line break) | `[text](href)` (link)
const INLINE_SOURCE =
  '\\\\([^A-Za-z0-9\\s])|\\*\\*([\\s\\S]+?)\\*\\*|\\*([\\s\\S]+?)\\*|(<br\\s*/?>)|\\[([^\\]]+)\\]\\(([^)]+)\\)';

/**
 * A link href is safe only if it is an `https://` URL or a site-relative path.
 * A site-relative path must start with a single `/`: `//host` (protocol-relative)
 * and `/\host` (browsers normalise `\` to `/`) both resolve to an external
 * origin, so they are rejected along with every non-`https:` scheme.
 */
function isSafeHref(href: string): boolean {
  if (/^https:\/\//i.test(href)) return true;
  return href.startsWith('/') && !/^\/[/\\]/.test(href);
}

/**
 * Render inline `**bold**`, `*italic*`, `[text](href)` links and backslash
 * escapes to React nodes. A fresh RegExp is created per call: the function
 * recurses into bold/italic/link content, so a shared stateful (global) regex
 * would corrupt `lastIndex`.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const re = new RegExp(INLINE_SOURCE, 'g');
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(m[1]); // escaped punctuation → literal char
    } else if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${k}`}>{renderInline(m[2], `${keyPrefix}-b${k}`)}</strong>,
      );
    } else if (m[3] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i${k}`}>{renderInline(m[3], `${keyPrefix}-i${k}`)}</em>);
    } else if (m[4] !== undefined) {
      nodes.push(<br key={`${keyPrefix}-br${k}`} />);
    } else if (m[5] !== undefined) {
      const label = m[5];
      const href = m[6];
      if (isSafeHref(href)) {
        // External URLs and downloadable files (e.g. PDFs) open in a new tab.
        const external = /^https:\/\//i.test(href) || /\.pdf(?:[?#]|$)/i.test(href);
        nodes.push(
          <a
            key={`${keyPrefix}-a${k}`}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener' } : {})}
            style={{ color: palette.primary, textDecoration: 'underline' }}
          >
            {renderInline(label, `${keyPrefix}-a${k}`)}
          </a>,
        );
      } else {
        // Unsafe scheme (javascript:, data:, …) → keep the literal markdown text.
        nodes.push(m[0]);
      }
    }
    last = re.lastIndex;
    k += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const tableWrapperSx = {
  overflowX: 'auto',
  mb: 3,
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    minWidth: 480,
    fontFamily: FONT,
    fontSize: 14,
  },
  '& th, & td': {
    border: `1px solid ${palette.primaryLight}`,
    p: '8px 12px',
    textAlign: 'left',
    verticalAlign: 'top',
    color: palette.primary,
    lineHeight: '20px',
  },
  '& th': { bgcolor: palette.white, fontWeight: 600 },
} as const;

function renderBlock(block: Block, idx: number): React.ReactNode {
  const key = `b${idx}`;
  switch (block.kind) {
    case 'heading': {
      const level = block.level;
      return (
        <Typography
          key={key}
          component={`h${Math.min(level + 1, 6)}` as 'h2'}
          sx={{
            fontFamily: FONT,
            color: palette.primary,
            fontWeight: 600,
            fontSize: level <= 1 ? 20 : level === 2 ? 17 : 16,
            lineHeight: 1.35,
            mt: level <= 1 ? 4 : 3,
            mb: 1.5,
          }}
        >
          {renderInline(block.text, key)}
        </Typography>
      );
    }
    case 'paragraph':
      return (
        <Typography
          key={key}
          sx={{
            fontFamily: FONT,
            fontSize: 15,
            fontWeight: 400,
            lineHeight: '22px',
            color: palette.primary,
            mb: 2,
          }}
        >
          {renderInline(block.text, key)}
        </Typography>
      );
    case 'list':
      return (
        <Box key={key} component="ul" sx={{ pl: 3, mb: 2, mt: 0 }}>
          {block.items.map((item, li) => (
            <Typography
              key={`${key}-${li}`}
              component="li"
              sx={{
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 400,
                lineHeight: '22px',
                color: palette.primary,
                mb: 0.5,
              }}
            >
              {renderInline(item, `${key}-${li}`)}
            </Typography>
          ))}
        </Box>
      );
    case 'table': {
      const [header, ...body] = block.rows;
      return (
        <Box key={key} sx={tableWrapperSx}>
          <table>
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th key={ci}>{renderInline(cell, `${key}-h${ci}`)}</th>
                ))}
              </tr>
            </thead>
            {body.length > 0 && (
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{renderInline(cell, `${key}-${ri}-${ci}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </Box>
      );
    }
  }
}

export default function LegalMarkdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  return <Box>{blocks.map((block, idx) => renderBlock(block, idx))}</Box>;
}
