import type { PlatformProfile, WorkspaceBranding } from '@/types';
import { replacePlaceholders } from '@/lib/branding';

/**
 * Agent 4 — HTML Generator
 * Component-based system: identifies semantic components in the article,
 * then maps them to platform-specific HTML/CSS.
 */

// ── Shared base prompt for all platforms ─────────────────────
const COMPONENT_BASE = `You are an expert at converting structured knowledge base articles into clean, semantic HTML.

## Component Identification
First, identify the semantic components present in the article:
- **Summary/Opening** — The introduction or overview paragraph
- **Key Highlights** — Important points, takeaways, or prerequisites
- **Step-by-Step Instructions** — Numbered procedures or workflows
- **Explanatory Sections** — Detailed descriptions, concepts, or context
- **Callouts/Warnings** — Important notes, tips, warnings, or cautions
- **Related Links** — References to other articles or resources
- **FAQ** — Frequently asked questions and answers
- **Tables** — Structured data in tabular format
- **Code Blocks** — Code snippets or terminal commands
- **Media** — Images, videos, or embedded content

Then generate HTML using the platform-specific format below.`;

// ── Generic Clean HTML ───────────────────────────────────────
const GENERIC_PROMPT = `${COMPONENT_BASE}

## Platform: Generic Clean HTML
Generate portable, semantic HTML that works in any knowledge base or CMS.

### Component Mapping
- **Summary/Opening** → \`<div class="kb-summary">\` with a brief intro paragraph
- **Key Highlights** → \`<div class="kb-highlights">\` with \`<ul>\` list items
- **Step-by-Step** → \`<div class="kb-steps">\` with \`<ol>\` and \`<li>\` for each step
- **Explanatory Sections** → \`<section>\` with \`<h2>\` / \`<h3>\` headings
- **Callouts/Warnings** → \`<div class="kb-callout kb-callout--[type]">\` where type is: info, warning, tip, important
- **Related Links** → \`<div class="kb-related">\` with \`<ul>\` of \`<a>\` links
- **FAQ** → \`<div class="kb-faq">\` with \`<details><summary>Question</summary>Answer</details>\` pattern
- **Tables** → Standard \`<table>\` with \`<thead>\` and \`<tbody>\`
- **Code Blocks** → \`<pre><code class="language-[lang]">\`
- **Media** → \`<figure>\` with \`<img>\` or \`<iframe>\` and optional \`<figcaption>\`

### Styling Rules
- Use CSS custom properties for theming: \`var(--kb-primary)\`, \`var(--kb-secondary)\`, \`var(--kb-accent)\`, \`var(--kb-font)\`
- Include a \`<style>\` block at the top with default values and component styles
- Keep CSS minimal and clean — no framework dependencies
- Use \`border-left\` accents on callouts and summary boxes
- Responsive: use \`max-width: 100%\` on images, flex/grid for card layouts
- Support RTL with \`dir\` attribute when content is in Hebrew/Arabic

### Output
- Output ONLY the HTML — no markdown fences, no explanations
- Start with \`<style>\` block, then the article \`<article class="kb-article">\``;

const GENERIC_TEMPLATE = `<style>
  :root {
    --kb-primary: {{primaryColor}};
    --kb-secondary: {{secondaryColor}};
    --kb-accent: {{accentColor}};
    --kb-font: {{fontFamily}};
    --kb-text: {{textColor}};
    --kb-muted: {{mutedColor}};
    --kb-bg: #ffffff;
    --kb-border: #e5e7eb;
  }
  .kb-article { font-family: var(--kb-font); color: var(--kb-text); line-height: 1.7; max-width: 800px; }
  .kb-article h1, .kb-article h2, .kb-article h3 { color: var(--kb-text); margin-top: 1.5em; margin-bottom: 0.5em; }
  .kb-article h2 { font-size: 1.5em; border-bottom: 2px solid var(--kb-primary); padding-bottom: 0.3em; }
  .kb-summary { background: #f9fafb; border-left: 4px solid var(--kb-primary); padding: 1em 1.25em; border-radius: 0 8px 8px 0; margin-bottom: 1.5em; }
  .kb-highlights { margin: 1.5em 0; }
  .kb-highlights ul { list-style: none; padding: 0; }
  .kb-highlights li { padding: 0.5em 0; padding-left: 1.5em; position: relative; border-bottom: 1px solid var(--kb-border); }
  .kb-highlights li::before { content: "\\2713"; position: absolute; left: 0; color: var(--kb-primary); font-weight: bold; }
  .kb-steps { margin: 1.5em 0; }
  .kb-steps ol { padding-left: 0; counter-reset: step; list-style: none; }
  .kb-steps li { counter-increment: step; padding: 1em; margin-bottom: 0.75em; background: #f9fafb; border-radius: 8px; position: relative; padding-left: 3em; }
  .kb-steps li::before { content: counter(step); position: absolute; left: 0.75em; top: 1em; background: var(--kb-primary); color: white; width: 1.5em; height: 1.5em; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85em; font-weight: 600; }
  .kb-callout { padding: 1em 1.25em; border-radius: 8px; margin: 1em 0; border-left: 4px solid; }
  .kb-callout--info { background: #eff6ff; border-color: #3b82f6; }
  .kb-callout--warning { background: #fffbeb; border-color: #f59e0b; }
  .kb-callout--tip { background: #f0fdf4; border-color: #22c55e; }
  .kb-callout--important { background: #fef2f2; border-color: #ef4444; }
  .kb-faq details { margin-bottom: 0.5em; border: 1px solid var(--kb-border); border-radius: 8px; overflow: hidden; }
  .kb-faq summary { padding: 0.75em 1em; font-weight: 600; cursor: pointer; background: #f9fafb; }
  .kb-faq details[open] summary { border-bottom: 1px solid var(--kb-border); }
  .kb-faq details > div { padding: 1em; }
  .kb-related { margin: 1.5em 0; display: flex; flex-wrap: wrap; gap: 1em; }
  .kb-related a { display: block; padding: 1em; border: 1px solid var(--kb-border); border-radius: 8px; text-decoration: none; color: var(--kb-primary); flex: 1; min-width: 200px; transition: box-shadow 0.2s; }
  .kb-related a:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  th, td { padding: 0.75em; border: 1px solid var(--kb-border); text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
</style>
<article class="kb-article">
  <div class="kb-summary">
    <p><strong>[Opening title]</strong></p>
    <p>[Summary paragraph]</p>
  </div>
  <h2>[Highlights Heading]</h2>
  <div class="kb-highlights">
    <ul>
      <li><strong>[Highlight 1]</strong></li>
      <li><strong>[Highlight 2]</strong></li>
    </ul>
  </div>
  <h2>[Steps Heading]</h2>
  <div class="kb-steps">
    <ol>
      <li><strong>[Step title]</strong><br>[Step description]</li>
    </ol>
  </div>
  <div class="kb-callout kb-callout--tip">
    <strong>Tip:</strong> [Tip content]
  </div>
  <h2>Related Resources</h2>
  <div class="kb-related">
    <a href="#">[Link title]<br><small>[Description]</small></a>
  </div>
  <h2>FAQ</h2>
  <div class="kb-faq">
    <details><summary>[Question]</summary><div>[Answer]</div></details>
  </div>
</article>`;

// ── Notion-Optimized HTML ────────────────────────────────────
const NOTION_PROMPT = `${COMPONENT_BASE}

## Platform: Notion
Generate HTML that maps cleanly to Notion's native block types. Notion strips most CSS when pasting HTML, so use only semantic elements that Notion recognizes.

### Component Mapping (Notion blocks)
- **Summary/Opening** → \`<blockquote>\` (renders as Notion quote block — good for intros)
- **Key Highlights** → \`<ul>\` with \`<li>\` (Notion bullet list)
- **Step-by-Step** → \`<ol>\` with \`<li>\` (Notion numbered list)
- **Explanatory Sections** → \`<h2>\` / \`<h3>\` + \`<p>\` paragraphs
- **Callouts/Warnings** → \`<blockquote>\` with emoji prefix: "💡 " for tips, "⚠️ " for warnings, "ℹ️ " for info, "🔴 " for important
- **Related Links** → \`<ul>\` with \`<li><a href="...">\` items
- **FAQ** → \`<details><summary>Question</summary><p>Answer</p></details>\` (Notion toggle block)
- **Tables** → \`<table>\` with \`<tr>\`, \`<th>\`, \`<td>\` (Notion simple table)
- **Code Blocks** → \`<pre><code>\` (Notion code block)
- **Media** → \`<img>\` tags (Notion image block)
- **Dividers** → \`<hr>\` (Notion divider block)
- **Bold/Italic** → \`<strong>\` / \`<em>\` (Notion inline formatting)
- **Checkboxes** → \`<ul>\` with \`<li><input type="checkbox"> text</li>\` (Notion to-do block)

### Critical Rules for Notion Compatibility
1. **NO CSS at all** — Notion strips all styles. Do not include \`<style>\` blocks or inline \`style=\` attributes
2. **NO \`<div>\` wrappers** — Notion ignores divs. Use semantic elements only
3. **NO class attributes** — Notion ignores classes
4. **Use simple nesting** — Notion supports max 3 levels of nesting for lists
5. **Headers: h1, h2, h3 only** — Notion maps these to Heading 1/2/3. No h4-h6
6. **Toggle = details/summary** — This is the ONLY way to create toggles in Notion via HTML
7. **Line breaks** — Use \`<br>\` sparingly, prefer separate \`<p>\` tags
8. **Links** — \`<a href="url">text</a>\` works normally in Notion

### Output
- Output ONLY the HTML — no markdown fences, no explanations
- Start directly with \`<h1>\` for the article title
- Keep it clean and simple — Notion will apply its own styling`;

const NOTION_TEMPLATE = `<h1>[Article Title]</h1>
<blockquote><strong>[Opening summary]</strong> — [Brief description of what this article covers]</blockquote>
<hr>
<h2>[Key Highlights / Prerequisites]</h2>
<ul>
  <li><strong>[Highlight 1]</strong> — [Brief explanation]</li>
  <li><strong>[Highlight 2]</strong> — [Brief explanation]</li>
  <li><strong>[Highlight 3]</strong> — [Brief explanation]</li>
</ul>
<h2>[Steps / Process Heading]</h2>
<ol>
  <li><strong>[Step 1 title]</strong><br>[Step 1 detailed description]</li>
  <li><strong>[Step 2 title]</strong><br>[Step 2 detailed description]</li>
  <li><strong>[Step 3 title]</strong><br>[Step 3 detailed description]</li>
</ol>
<blockquote>💡 [Tip or note about the process]</blockquote>
<h2>[Additional Details Heading]</h2>
<p>[Explanatory paragraph with context]</p>
<table>
  <tr><th>[Column 1]</th><th>[Column 2]</th><th>[Column 3]</th></tr>
  <tr><td>[Data]</td><td>[Data]</td><td>[Data]</td></tr>
</table>
<h2>Related Resources</h2>
<ul>
  <li><a href="#">[Related article 1]</a></li>
  <li><a href="#">[Related article 2]</a></li>
</ul>
<h2>FAQ</h2>
<details><summary>[Question 1]</summary><p>[Answer 1]</p></details>
<details><summary>[Question 2]</summary><p>[Answer 2]</p></details>`;

// ── Confluence ───────────────────────────────────────────────
const CONFLUENCE_PROMPT = `${COMPONENT_BASE}

## Platform: Confluence
Generate HTML compatible with Confluence's XHTML storage format. Confluence uses specific macros and CSS classes.

### Component Mapping (Confluence macros/elements)
- **Summary/Opening** → \`<ac:structured-macro ac:name="info"><ac:rich-text-body>\` or simple \`<div class="panel">\` with intro text
- **Key Highlights** → \`<ul>\` bullet list, or \`<ac:structured-macro ac:name="status">\` for status labels
- **Step-by-Step** → \`<ol>\` numbered list with clear step headings
- **Explanatory Sections** → \`<h2>\` / \`<h3>\` + \`<p>\` paragraphs
- **Callouts/Warnings** → Confluence panels:
  - Info: \`<div class="confluence-information-macro"><div class="confluence-information-macro-body">\`
  - Warning: \`<div class="confluence-information-macro confluence-information-macro-warning"><div class="confluence-information-macro-body">\`
  - Note: \`<div class="confluence-information-macro confluence-information-macro-note"><div class="confluence-information-macro-body">\`
  - Tip: \`<div class="confluence-information-macro confluence-information-macro-tip"><div class="confluence-information-macro-body">\`
- **Related Links** → \`<ul>\` list with \`<a>\` links
- **FAQ** → Use \`<h3>\` for each question, \`<p>\` for answer (or Expand macro if available)
- **Tables** → \`<table class="confluenceTable"><tbody>\` with \`<th class="confluenceTh">\` and \`<td class="confluenceTd">\`
- **Code Blocks** → \`<div class="code panel"><div class="codeContent"><pre>\`
- **Media** → \`<img>\` with \`class="confluence-embedded-image"\`

### Styling Rules
- Use Confluence-specific CSS classes (confluenceTable, confluenceTh, confluenceTd)
- Keep inline styles minimal — Confluence has its own theme
- Use \`<div class="panel">\` for bordered content boxes
- Tables should always use Confluence table classes

### Output
- Output ONLY the HTML — no markdown fences, no explanations
- Use Confluence-compatible class names throughout`;

const CONFLUENCE_TEMPLATE = `<h1>[Article Title]</h1>
<div class="confluence-information-macro">
  <div class="confluence-information-macro-body">
    <p><strong>[Opening summary]</strong></p>
    <p>[Brief description of what this article covers]</p>
  </div>
</div>
<h2>[Key Highlights]</h2>
<ul>
  <li><strong>[Highlight 1]</strong> — [Brief explanation]</li>
  <li><strong>[Highlight 2]</strong> — [Brief explanation]</li>
</ul>
<h2>[Steps Heading]</h2>
<ol>
  <li><strong>[Step 1 title]</strong><br>[Step description]</li>
  <li><strong>[Step 2 title]</strong><br>[Step description]</li>
</ol>
<div class="confluence-information-macro confluence-information-macro-tip">
  <div class="confluence-information-macro-body">
    <p>[Tip content]</p>
  </div>
</div>
<h2>[Details Heading]</h2>
<p>[Explanatory paragraph]</p>
<table class="confluenceTable">
  <tbody>
    <tr><th class="confluenceTh">[Column 1]</th><th class="confluenceTh">[Column 2]</th></tr>
    <tr><td class="confluenceTd">[Data]</td><td class="confluenceTd">[Data]</td></tr>
  </tbody>
</table>
<h2>Related Resources</h2>
<ul>
  <li><a href="#">[Related article 1]</a></li>
</ul>
<h2>FAQ</h2>
<h3>[Question 1]</h3>
<p>[Answer 1]</p>
<h3>[Question 2]</h3>
<p>[Answer 2]</p>`;

// ── HelpJuice (generic — no customer-specific assets) ────────
const HELPJUICE_PROMPT = `${COMPONENT_BASE}

## Platform: HelpJuice
Generate HTML for the HelpJuice knowledge base platform using their specific component patterns and CSS classes.

### Component Mapping (HelpJuice components)
- **Summary/Opening** → Bordered box with accent color stripe: \`<div style="background-color:white;border-radius:10px;border-right:5px solid var(--accent);box-shadow:0 2px 5px rgba(0,0,0,0.05);padding:20px;">\`
- **Key Highlights** → Checkmark list inside bordered box: \`<ul style="list-style-type:none;">\` with &#10003; checkmark spans
- **Step-by-Step** → HelpJuice accordion: \`<div class="helpjuice-accordion" data-controller="editor--toggle-element">\` with \`.helpjuice-accordion-title\` and \`.helpjuice-accordion-body\`
- **Explanatory Sections** → \`<h2>\` with decorative underline bar and section icon placeholder
- **Callouts/Warnings** → Bordered box with colored left/right border matching type
- **Related Links** → Card grid: \`<div style="display:flex;flex-wrap:wrap;gap:20px;">\` with card boxes
- **FAQ** → HelpJuice accordion format (same as steps)
- **Tables** → Standard \`<table>\` with inline styles for borders
- **Code Blocks** → \`<pre><code>\` with background styling
- **Media** → \`<figure class="image image_resized">\` with \`<img>\`

### Section Headers Pattern
Each major section uses this centered header pattern:
\`\`\`
<div style="text-align:center;width:100%;">
  <h2 id="[id]" data-toc="true">
    <span style="color:hsl(196,4%,52%);"><strong>[Bold part] </strong>[Rest of title]</span>
  </h2>
  <div style="background-color:var(--accent);height:3px;margin:10px auto 20px;width:150px;">&nbsp;</div>
</div>
\`\`\`

### HelpJuice Accordion Pattern
\`\`\`
<div class="helpjuice-accordion" data-controller="editor--toggle-element">
  <h2 class="helpjuice-accordion-title" id="[id]" data-toc="true">[Title]</h2>
  <div class="helpjuice-accordion-body active" data-editor--toggle-element-target="body">
    [Content — be creative with layout: use cards, grids, icons, colored boxes]
  </div>
  <div class="helpjuice-accordion-toggle">&nbsp;</div>
  <div class="helpjuice-accordion-delete">&nbsp;</div>
</div>
\`\`\`

### Styling Rules
- Use an accent color for borders, underlines, and checkmarks (default: {{primaryColor}} — will be overridden by workspace branding)
- Use \`data-toc="true"\` on h2 elements for table of contents
- Maintain sequential IDs on headings
- Be creative inside accordion bodies: use grid layouts, colored boxes, icon placement
- Card layouts for related links section
- Inline styles throughout (HelpJuice uses inline CSS)

### Output
- Output ONLY the HTML code — no explanations
- No external image URLs — use placeholder comments like [Icon] where section icons would go
- Colors default to accent ({{primaryColor}}) — workspace branding will override`;

const HELPJUICE_TEMPLATE = `<div style="margin-bottom:40px;position:relative;">
    <hr>
    <div style="background-color:white;border-radius:10px;border-right:5px solid var(--accent, {{primaryColor}});box-shadow:0 2px 5px rgba(0,0,0,0.05);margin-bottom:25px;padding:20px;">
        <p style="font-size:18px;line-height:1.6;margin:0;">
            <strong style="color:#3A3F41;">[Opening title]</strong>
        </p>
        <p style="font-size:18px;line-height:1.6;margin:0;">[Summary paragraph]</p>
    </div>
</div>
<div style="text-align:center;width:100%;">
    <h2 id="-0" data-toc="true">
        <span style="color:hsl(196,4%,52%);"><strong>Important </strong>Highlights</span>
    </h2>
    <div style="background-color:var(--accent, {{primaryColor}});height:3px;margin:10px auto 20px;width:150px;">&nbsp;</div>
</div>
<div style="background-color:white;border-radius:10px;border-right:5px solid var(--accent, {{primaryColor}});box-shadow:0 2px 5px rgba(0,0,0,0.05);margin:20px 0;padding:20px;">
    <ul style="list-style-type:none;">
        <li style="border-bottom:1px solid #E4EBED;margin-bottom:12px;padding-bottom:15px;padding-left:25px;position:relative;">
            <span style="color:var(--accent, {{primaryColor}});font-size:20px;position:absolute;left:0;">&#10003;</span>
            <span style="color:#3A3F41;font-size:18px;"><strong>[Highlight 1]</strong></span>
        </li>
        <li style="margin-bottom:12px;padding-left:25px;position:relative;">
            <span style="color:var(--accent, {{primaryColor}});font-size:20px;position:absolute;left:0;">&#10003;</span>
            <span style="color:#3A3F41;font-size:18px;"><strong>[Highlight 2]</strong></span>
        </li>
    </ul>
</div>
<div style="text-align:center;width:100%;">
    <h2 id="-1" data-toc="true">
        <span style="color:hsl(196,4%,52%);"><strong>Execution Steps </strong>[Process Title]</span>
    </h2>
    <div style="background-color:var(--accent, {{primaryColor}});height:3px;margin:10px auto 20px;width:200px;">&nbsp;</div>
</div>
<div class="helpjuice-accordion" data-controller="editor--toggle-element">
    <h2 class="helpjuice-accordion-title" id="1-2" data-toc="true">[Step 1 Title]</h2>
    <div class="helpjuice-accordion-body active" data-editor--toggle-element-target="body">
        <p style="font-size:18px;">[Step 1 description with creative layout]</p>
    </div>
    <div class="helpjuice-accordion-toggle">&nbsp;</div>
    <div class="helpjuice-accordion-delete">&nbsp;</div>
</div>
<hr>
<div style="margin:30px 0;text-align:center;">
    <h2 id="-9" data-toc="true">
        <span style="color:hsl(196,4%,52%);"><strong>Links</strong> to Additional Processes</span>
    </h2>
    <div style="background-color:var(--accent, {{primaryColor}});height:3px;margin:10px auto 20px;width:200px;">&nbsp;</div>
</div>
<div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;margin:30px 0;">
    <div style="background-color:white;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,0.1);flex:1;min-width:250px;overflow:hidden;">
        <div style="background-color:#E4EBED;padding:15px;text-align:center;">
            <h3 style="color:#3A3F41;margin:0;">[Link Title]</h3>
        </div>
        <div style="padding:15px;">
            <p>[Short description]</p>
            <div style="text-align:center;">
                <a style="background-color:var(--accent, {{primaryColor}});border-radius:5px;color:white;display:inline-block;padding:8px 15px;text-decoration:none;" href="#">Learn More</a>
            </div>
        </div>
    </div>
</div>
<hr>
<div style="margin:30px 0;text-align:center;">
    <h2 id="-4" data-toc="true">
        <span style="color:hsl(196,4%,52%);"><strong>Frequently</strong> Asked Questions</span>
    </h2>
    <div style="background-color:var(--accent, {{primaryColor}});height:3px;margin:10px auto 20px;width:200px;">&nbsp;</div>
</div>
<div class="helpjuice-accordion" data-controller="editor--toggle-element">
    <h2 class="helpjuice-accordion-title" id="1-5" data-toc="true">[Question 1]</h2>
    <div class="helpjuice-accordion-body active" data-editor--toggle-element-target="body">
        <p style="font-size:18px;">[Answer 1]</p>
    </div>
    <div class="helpjuice-accordion-toggle">&nbsp;</div>
    <div class="helpjuice-accordion-delete">&nbsp;</div>
</div>`;

// ── Zendesk Help Center ──────────────────────────────────────
const ZENDESK_PROMPT = `${COMPONENT_BASE}

## Platform: Zendesk Help Center
Generate HTML for Zendesk Help Center articles. Use semantic HTML with CSS classes
that map to Zendesk Guide theme conventions.

### Component Mapping
- **Summary/Opening** -> \`<div class="article-intro">\` with intro paragraph
- **Key Highlights** -> \`<ul>\` with \`<li>\` items
- **Step-by-Step** -> \`<ol>\` with \`<li>\` for each step
- **Explanatory Sections** -> \`<h2>\` / \`<h3>\` + \`<p>\` paragraphs
- **Callouts** -> \`<div class="c-callout c-callout--[type]">\` where type is: info, warning, tip, note
- **Tables** -> \`<table>\` (Zendesk wraps in \`<figure class="wysiwyg-table">\` automatically in new editor)
- **Code Blocks** -> \`<pre><code>\`
- **FAQ** -> \`<details><summary>Question</summary><p>Answer</p></details>\`

### Styling Rules
- Prefer CSS classes over inline styles (Zendesk themes control appearance)
- Use semantic HTML5 elements (article, section, details/summary)
- Keep markup clean -- Zendesk theme CSS handles most visual styling
- No \`<style>\` block needed -- Zendesk themes provide global styles

### Output
- Output ONLY the HTML -- no markdown fences, no explanations
- Start with \`<h1>\` for the article title`;

const ZENDESK_TEMPLATE = `<h1>[Article Title]</h1>
<div class="article-intro">
  <p>[Summary paragraph describing what this article covers]</p>
</div>
<h2>[Key Points]</h2>
<ul>
  <li><strong>[Point 1]</strong> -- [explanation]</li>
  <li><strong>[Point 2]</strong> -- [explanation]</li>
</ul>
<h2>[Steps Heading]</h2>
<ol>
  <li><strong>[Step 1]</strong><br>[Description]</li>
  <li><strong>[Step 2]</strong><br>[Description]</li>
</ol>
<div class="c-callout c-callout--tip">
  <p><strong>Tip:</strong> [Tip content]</p>
</div>
<h2>[Details Heading]</h2>
<p>[Explanatory content]</p>
<table>
  <thead><tr><th>[Col 1]</th><th>[Col 2]</th></tr></thead>
  <tbody><tr><td>[Data]</td><td>[Data]</td></tr></tbody>
</table>
<h2>FAQ</h2>
<details><summary>[Question 1]</summary><p>[Answer 1]</p></details>
<details><summary>[Question 2]</summary><p>[Answer 2]</p></details>`;

// ── Intercom ─────────────────────────────────────────────────
const INTERCOM_PROMPT = `${COMPONENT_BASE}

## Platform: Intercom Articles
Generate HTML for Intercom Help Center articles. Intercom's API has a strict HTML allowlist
-- only use elements that Intercom supports. Any disallowed elements will be silently stripped.

### Allowed Elements ONLY
p, br, h1, h2, b, strong, i, em, ul, ol, li, img, a, iframe, pre, code,
table, tr, td, hr

### Special Classes (the ONLY classes Intercom supports)
- \`intercom-align-center\` -- center-aligns content (on a div)
- \`intercom-h2b-button\` -- styles an anchor as a button

### Important Restrictions
- h3-h6 are converted to h1/h2 by Intercom -- use h1 and h2 only
- <strong> is converted to <b> and <em> to <i> by Intercom's API -- use <b> and <i> directly for consistency
- NO <div> tags except \`<div class="intercom-align-center">\`
- NO <span>, <section>, <article>, <style>, <script>
- NO inline styles -- they will be stripped
- NO custom classes -- they will be stripped
- Callouts/accordions are NOT supported via API

### NEVER USE These Tags (Intercom silently strips them)
- NO <thead>, <th>, <tbody> -- tables must use only <tr> and <td>
- NO <details>, <summary> -- Intercom has no accordion/toggle support
- NO <h3>, <h4>, <h5>, <h6> -- only h1 and h2 are supported
- NO <div> (except with class="intercom-align-center")
- NO <span>, <section>, <article>, <figure>, <figcaption>
- NO <style>, <script>, <form>, <input>, <textarea>
- NO inline style="" attributes on any element
- NO custom class="" attributes (only intercom-align-center and intercom-h2b-button)

### Component Mapping
- **Summary/Opening** -> \`<p><strong>[intro]</strong></p>\` (bold paragraph)
- **Key Highlights** -> \`<ul>\` with \`<li>\` items
- **Step-by-Step** -> \`<ol>\` with \`<li>\` steps
- **Explanatory Sections** -> \`<h2>\` + \`<p>\` paragraphs
- **Callouts** -> \`<p><b>Tip:</b> [content]</p>\` (bold prefix only -- no visual box)
- **Tables** -> \`<table><tr><td>\` (NO thead, NO th -- Intercom strips them)
- **Code Blocks** -> \`<pre><code>\`
- **Links as buttons** -> \`<a href="#" class="intercom-h2b-button">Button Text</a>\`

### Output
- Output ONLY the HTML -- no markdown fences
- Start with \`<h1>\` for the article title
- Keep it clean and simple`;

const INTERCOM_TEMPLATE = `<h1>[Article Title]</h1>
<p><strong>[Opening summary -- what this article covers]</strong></p>
<hr>
<h2>[Key Highlights]</h2>
<ul>
  <li><strong>[Highlight 1]</strong> -- [explanation]</li>
  <li><strong>[Highlight 2]</strong> -- [explanation]</li>
</ul>
<h2>[Steps Heading]</h2>
<ol>
  <li><strong>[Step 1]</strong><br>[Description]</li>
  <li><strong>[Step 2]</strong><br>[Description]</li>
</ol>
<p><b>Tip:</b> [Important tip or note]</p>
<h2>[Details Heading]</h2>
<p>[Explanatory paragraph]</p>
<table>
  <tr><td><b>[Col 1]</b></td><td><b>[Col 2]</b></td></tr>
  <tr><td>[Data]</td><td>[Data]</td></tr>
</table>
<h2>[Related Resources]</h2>
<ul>
  <li><a href="#">[Resource 1]</a></li>
  <li><a href="#">[Resource 2]</a></li>
</ul>`;

// ── Markdown Only ────────────────────────────────────────────
const MARKDOWN_ONLY_PROMPT = 'Output the article as clean, well-formatted Markdown. Do not convert to HTML. Use proper Markdown syntax: # for headings, - for bullets, 1. for numbered lists, > for callouts, ```lang for code blocks.';

// ── Build final prompt (called by pipeline) ──────────────────

export function buildHtmlPrompt(
  htmlPrompt: string,
  htmlTemplate: string,
  branding?: WorkspaceBranding
): string {
  // Replace {{placeholder}} variables in prompt and template with branding values
  const resolvedPrompt = replacePlaceholders(htmlPrompt, branding);
  const resolvedTemplate = replacePlaceholders(htmlTemplate, branding);

  // If no template, just use the prompt
  if (!resolvedTemplate) {
    return `${resolvedPrompt}

## Critical Rules
- Output ONLY the final content — no explanations, comments, or anything outside the output
- Keep all content in the same language as the input article
- If the article is in a right-to-left language (Hebrew, Arabic), maintain RTL direction`;
  }

  return `${resolvedPrompt}

## Reference HTML Template
Study the following HTML template carefully. You MUST produce HTML that follows this exact structure, CSS styling, classes, and component patterns:

\`\`\`html
${resolvedTemplate}
\`\`\`

## Critical Rules
- Output ONLY the final HTML code — no explanations, comments, or anything outside the HTML
- Match the exact CSS inline styles, class names, and component structure from the reference
- Keep all content in the same language as the input article
- If the article is in a right-to-left language (Hebrew, Arabic), maintain RTL direction`;
}

// ── Default Platform Profiles ────────────────────────────────

export const DEFAULT_PLATFORM_PROFILES: PlatformProfile[] = [
  {
    id: 'generic-html',
    name: 'Generic Clean HTML',
    htmlPrompt: GENERIC_PROMPT,
    htmlTemplate: GENERIC_TEMPLATE,
    isDefault: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    htmlPrompt: NOTION_PROMPT,
    htmlTemplate: NOTION_TEMPLATE,
    isDefault: true,
  },
  {
    id: 'confluence',
    name: 'Confluence',
    htmlPrompt: CONFLUENCE_PROMPT,
    htmlTemplate: CONFLUENCE_TEMPLATE,
    isDefault: true,
  },
  {
    id: 'helpjuice',
    name: 'HelpJuice',
    htmlPrompt: HELPJUICE_PROMPT,
    htmlTemplate: HELPJUICE_TEMPLATE,
    isDefault: true,
  },
  {
    id: 'zendesk',
    name: 'Zendesk Help Center',
    htmlPrompt: ZENDESK_PROMPT,
    htmlTemplate: ZENDESK_TEMPLATE,
    isDefault: true,
  },
  {
    id: 'intercom',
    name: 'Intercom',
    htmlPrompt: INTERCOM_PROMPT,
    htmlTemplate: INTERCOM_TEMPLATE,
    isDefault: true,
  },
  {
    id: 'markdown-only',
    name: 'Markdown Only',
    htmlPrompt: MARKDOWN_ONLY_PROMPT,
    htmlTemplate: '',
    isDefault: true,
  },
];
