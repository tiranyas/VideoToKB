import type { PlatformProfile } from '@/types';

/**
 * Agent 4 — HTML Generator
 * Takes a structured article and converts it to platform-specific HTML.
 * The HTML template reference is injected so Claude knows the exact markup to produce.
 */
export function buildHtmlPrompt(
  htmlPrompt: string,
  htmlTemplate: string
): string {
  return `${htmlPrompt}

## Reference HTML Template
Study the following HTML template carefully. You MUST produce HTML that follows this exact structure, CSS styling, classes, and component patterns:

\`\`\`html
${htmlTemplate}
\`\`\`

## Critical Rules
- Output ONLY the final HTML code — no explanations, comments, or anything outside the HTML
- Match the exact CSS inline styles, class names, and component structure from the reference
- Keep all content in the same language as the input article
- If the article is in a right-to-left language (Hebrew, Arabic), maintain RTL direction`;
}

// ── Default Platform Profiles ────────────────────────────

const HELPJUICE_PROMPT = `You are an expert at converting structured articles into precise HTML code for the HelpJuice knowledge base platform.

Your role is to take an article and generate HTML that exactly matches the HelpJuice design template, maintaining all CSS styling, components, images, and video embeds.

You are also a UI/UX and SaaS onboarding expert.

Pay special attention to:
1. Copying the template code exactly without changing CSS or structure
2. Maintaining sequential, ordered IDs
3. Correct YouTube video embedding (when a link is provided)
4. Organizing content in the correct component templates: opening box, highlights, execution steps, related processes, FAQ
5. Be especially creative with the internal design of the accordion sections in "Execution Steps". Inside the step accordions, use advanced, organized design that may include:
   - Category cards or colored boxes
   - Appropriate icons next to processes
   - Clear visual separation between steps or sections
   - Column or grid layout for structured content
   - Frames, highlights, and shadows for important information, using the same color palette as the rest of the article
6. In the "Links to Additional Processes" section, use the built-in card template arranged aesthetically
7. In the "FAQ" section, maintain the correct accordion format without unnecessary outer divs that create spacing

Output the final code ONLY — no explanations, comments, or additions beyond the HTML code itself.`;

const HELPJUICE_TEMPLATE = `<div style="margin-bottom:40px;position:relative;">
    <p>&nbsp;</p>
    <hr>
    <p>&nbsp;</p>
    <div style="background-color:white;border-radius:10px;border-right:5px solid #F85C32;box-shadow:5 2px 5px rgba(0,0,0,0.05);margin-bottom:25px;padding:20px;">
        <p style="font-size:18px;line-height:1.6;margin:0;">&nbsp;</p>
        <p style="font-size:18px;line-height:1.6;margin:0;">
            <span style="font-size:18px;"><strong style="color:#3A3F41;">[Opening title - bold first paragraph]</strong>&nbsp;</span>
        </p>
        <p style="font-size:18px;line-height:1.6;margin:0;">
            <span style="font-size:18px;">[Summary/opening paragraph]</span>
        </p>
        <p style="font-size:18px;line-height:1.6;margin:0;">&nbsp;</p>
    </div>
</div>
<div style="align-items:center;display:flex;flex-wrap:wrap;justify-content:center;margin:40px 0 20px;position:relative;">
    <div style="text-align:center;width:100%;">
        <p>&nbsp;</p>
        <figure class="image image_resized" style="width:147px;">
            <img src="https://static.helpjuice.com/helpjuice_production/uploads/upload/image/22615/direct/1744808975430/7BZEXUelikHUhzEv_dvfX-transformed%202.png" width="528" height="463">
        </figure>
        <h2 style="margin-right:0;" id="-0" data-toc="true">
            <span style="color:hsl(196,4%,52%);"><strong>Important </strong>Highlights</span>
        </h2>
        <div style="background-color:#F85C32;height:3px;margin:10px auto 20px;width:150px;">&nbsp;</div>
    </div>
</div>
<div style="background-color:white;border-radius:10px;border-right:5px solid #F85C32;box-shadow:0 2px 5px rgba(0,0,0,0.05);margin:20px 0;padding:20px;">
    <ul style="list-style-type:none;">
        <li style="border-bottom:1px solid #E4EBED;margin-bottom:12px;padding-bottom:15px;padding-right:25px;position:relative;">
            <span style="color:#F85C32;font-size:20px;"><span style="position:absolute;right:0;">&#10003;</span></span> <span style="color:#3A3F41;font-size:20px;"><strong>[Highlight 1]</strong></span>
        </li>
        <li style="border-bottom:1px solid #E4EBED;margin-bottom:12px;padding-bottom:15px;padding-right:25px;position:relative;">
            <span style="color:#F85C32;font-size:20px;"><span style="position:absolute;right:0;">&#10003;</span></span> <span style="color:#3A3F41;font-size:20px;"><strong>[Highlight 2]</strong></span>
        </li>
        <li style="margin-bottom:12px;padding-right:25px;position:relative;">
            <span style="color:#F85C32;font-size:20px;"><span style="position:absolute;right:0;">&#10003;</span></span> <span style="color:#3A3F41;font-size:20px;"><strong>[Highlight 3]</strong></span>
        </li>
    </ul>
</div>
<div style="align-items:center;display:flex;flex-wrap:wrap;justify-content:center;margin:60px 0 20px;position:relative;">
    <div style="text-align:center;width:100%;">
        <p>&nbsp;</p>
        <figure class="image image_resized" style="width:109px;">
            <img src="https://static.helpjuice.com/helpjuice_production/uploads/upload/image/22615/direct/1744809004525/vctrly-chalky-icon-rubik.png" width="2890" height="2744">
        </figure>
        <h2 style="margin-right:0;" id="-1" data-toc="true">
            <span style="color:hsl(196,4%,52%);"><strong>Execution Steps </strong>[Process Title]</span>
        </h2>
        <div style="background-color:#F85C32;height:3px;margin:10px auto 20px;width:200px;">&nbsp;</div>
    </div>
</div>
<div class="helpjuice-accordion" data-controller="editor--toggle-element">
    <h2 class="helpjuice-accordion-title" id="1-2" data-toc="true">[Step 1 Title]</h2>
    <div class="helpjuice-accordion-body active" data-editor--toggle-element-target="body">
        <p><span style="font-size:18px;">[Step 1 Description]</span></p>
        <figure class="image image_resized" style="border-radius:5px;border:1px solid #BEC7CA;max-width:100%;width:315px;">
            <img src="[Image Path]">
        </figure>
    </div>
    <div class="helpjuice-accordion-toggle">&nbsp;</div>
    <div class="helpjuice-accordion-delete">&nbsp;</div>
</div>
<p>&nbsp;</p>
<hr>
<p>&nbsp;</p>
<figure class="image image_resized" style="width:105px;">
    <img src="https://static.helpjuice.com/helpjuice_production/uploads/upload/image/22615/direct/1744809485959/route.png" width="512" height="512">
</figure>
<div style="margin:30px 0;text-align:center;">
    <h2 style="margin-right:0;" id="-9" data-toc="true">
        <span style="color:hsl(196,4%,52%);"><strong>Links</strong> to Additional Processes</span>
    </h2>
    <div style="background-color:#F85C32;height:3px;margin:10px auto 20px;width:200px;">&nbsp;</div>
</div>
<div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;margin:30px 0;">
    <div style="background-color:white;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,0.1);flex:1;min-width:250px;overflow:hidden;transition:transform 0.3s ease;">
        <div style="background-color:#E4EBED;padding:15px;text-align:center;">
            <h3 style="color:#3A3F41;margin:0;">[Action 1 Title]</h3>
        </div>
        <div style="padding:15px;">
            <p>[Short description]</p>
            <div style="text-align:center;">
                <a style="background-color:#F85C32;border-radius:5px;color:white;display:inline-block;padding:8px 15px;text-decoration:none;" href="#">Learn More</a>
            </div>
        </div>
    </div>
</div>
<p>&nbsp;</p>
<hr>
<p>&nbsp;</p>
<figure class="image image_resized" style="margin-bottom:10px;width:122px;">
    <img src="https://static.helpjuice.com/helpjuice_production/uploads/upload/image/22615/direct/1743770525066/layer1.png" width="3139" height="2543">
</figure>
<div style="margin:30px 0;text-align:center;">
    <h2 style="margin-right:0;" id="-4" data-toc="true">
        <span style="color:hsl(196,4%,52%);"><strong>Frequently</strong> Asked Questions</span>
    </h2>
    <div style="background-color:#F85C32;height:3px;margin:10px auto 20px;width:200px;">&nbsp;</div>
</div>
<div class="helpjuice-accordion" data-controller="editor--toggle-element">
    <h2 class="helpjuice-accordion-title" id="1-5" data-toc="true">[Question 1]</h2>
    <div class="helpjuice-accordion-body active" data-editor--toggle-element-target="body">
        <p><span style="font-size:18px;">[Answer 1]</span></p>
    </div>
    <div class="helpjuice-accordion-toggle">&nbsp;</div>
    <div class="helpjuice-accordion-delete">&nbsp;</div>
</div>`;

const MARKDOWN_ONLY_PROMPT = 'Output the article as clean, well-formatted Markdown. Do not convert to HTML.';

export const DEFAULT_PLATFORM_PROFILES: PlatformProfile[] = [
  {
    id: 'helpjuice',
    name: 'HelpJuice',
    htmlPrompt: HELPJUICE_PROMPT,
    htmlTemplate: HELPJUICE_TEMPLATE,
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
