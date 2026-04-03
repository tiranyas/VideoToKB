/**
 * KBPipe support documentation content.
 * These docs are seeded into the DB and used by the support chat RAG.
 * Update these when features change — they auto-sync on deploy via /api/support/seed.
 */

export interface SupportDoc {
  slug: string;
  title: string;
  category: string;
  chunks: string[];
}

export const SUPPORT_DOCS: SupportDoc[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started with KBPipe',
    category: 'basics',
    chunks: [
      `KBPipe converts video recordings into structured knowledge base articles. To create your first article: 1) Go to the Dashboard and click "New Article" or use the main input on the home page. 2) Paste a video URL from Loom, YouTube, or Google Drive. 3) Select an Article Type (determines the writing style and structure). 4) Select a Platform Profile (determines the HTML output format). 5) Click "Generate" and wait for the pipeline to process (usually 1-3 minutes). The pipeline will: resolve the video URL, transcribe the audio, generate a draft article, structure it, and optionally convert to platform-specific HTML.`,
      `After generation completes, you can: view and inline-edit the article text, generate HTML for your target platform, copy the article as Markdown or HTML, export as a Word document (.docx), or publish directly to connected integrations like HelpJuice. Your articles are saved automatically and accessible from the Dashboard.`,
    ],
  },
  {
    slug: 'video-sources',
    title: 'Supported Video Sources',
    category: 'basics',
    chunks: [
      `KBPipe supports three video sources: Loom — paste any Loom share URL (e.g., https://www.loom.com/share/abc123). KBPipe extracts the video and transcribes it via AssemblyAI. YouTube — paste any YouTube video URL. KBPipe first tries the free InnerTube API for the transcript. If that fails (e.g., for auto-generated captions), it falls back to the Supadata API. Google Drive — paste a Google Drive share URL. The video must have "Anyone with the link" sharing enabled. KBPipe downloads it and transcribes via AssemblyAI.`,
      `Troubleshooting video issues: If a Loom video fails, make sure the share link is public (not restricted to workspace). If a YouTube video fails, it may have no captions available — try a different video. If a Google Drive video fails, verify the sharing permissions are set to "Anyone with the link can view". Videos should ideally be under 15 minutes for best results. Longer videos may take more time to process and may hit quality limits.`,
    ],
  },
  {
    slug: 'article-types',
    title: 'Article Types',
    category: 'customization',
    chunks: [
      `Article Types control how your KB article is written — the tone, structure, and focus. Each Article Type has a custom prompt that guides the AI agents during generation. KBPipe comes with default article types, and you can create your own. To manage Article Types: go to Settings > AI Agents tab. Here you can create new types, edit existing ones, or delete them. Each Article Type has: a name, a description, and a system prompt that tells the AI how to write.`,
      `When creating a custom Article Type, write the prompt as instructions to the AI: "Write a step-by-step tutorial with numbered steps. Use a professional but friendly tone. Include a summary at the top." The AI will follow these instructions when generating the draft and structuring the article. You can have multiple Article Types for different use cases — for example, one for how-to guides, one for troubleshooting articles, and one for release notes.`,
    ],
  },
  {
    slug: 'platform-profiles',
    title: 'Platform Profiles',
    category: 'customization',
    chunks: [
      `Platform Profiles control the HTML output format. When you generate HTML from an article, KBPipe uses the Platform Profile to format it according to your KB platform's requirements. Each Profile has: a name, an HTML prompt (instructions for the AI), and optionally a reference HTML template. To manage Platform Profiles: go to Settings > AI Agents tab, scroll down to the Platform Profiles section.`,
      `You can create a Platform Profile in two ways: 1) Manual — write the HTML formatting instructions and paste a reference template. 2) Smart Import — paste a URL of an existing article from your KB platform. KBPipe will analyze the page's CSS and HTML structure and automatically create a profile that matches your platform's styling. This is the recommended approach as it ensures your generated articles look native to your KB. Smart Import works with most KB platforms including HelpJuice, Zendesk, Intercom, Freshdesk, Notion, and custom platforms.`,
    ],
  },
  {
    slug: 'workspace-settings',
    title: 'Workspace & Brand Settings',
    category: 'customization',
    chunks: [
      `Each workspace in KBPipe has its own settings, articles, and team members. To configure your workspace: go to Settings > Brand & Context tab. Here you can set: Workspace Name — displayed in the sidebar and dashboard. Company Context — background information about your company that helps the AI write more relevant articles. Include your product name, industry, target audience, and any terminology the AI should know. Logo — upload your company logo for branding.`,
      `You can create multiple workspaces for different products or teams. Switch between workspaces using the dropdown in the sidebar. Each workspace has its own Article Types, Platform Profiles, and articles. Workspace preferences (selected article type and platform) are saved per workspace.`,
    ],
  },
  {
    slug: 'team-collaboration',
    title: 'Team Collaboration',
    category: 'teams',
    chunks: [
      `Team collaboration is available on Team and Enterprise plans. To invite team members: go to Settings > Team tab. Enter their email address and select a role (Member or Admin). They will receive an invite link. Roles: Owner — full access, can manage billing and delete workspace. Admin — can manage settings, article types, platform profiles, and invite/remove members. Member — can create and edit articles but cannot change settings or manage team.`,
      `Each team member works within the shared workspace. All articles, Article Types, and Platform Profiles are shared across the team. The article generation quota is shared at the workspace level — all members contribute to the same usage count. If you are on a Free or Starter plan, the invite section will show an upgrade prompt — you need a Team or Enterprise plan to invite members.`,
    ],
  },
  {
    slug: 'helpjuice-integration',
    title: 'HelpJuice Integration',
    category: 'integrations',
    chunks: [
      `KBPipe integrates with HelpJuice for direct article publishing. To connect: go to Settings > Integrations tab. Click "Connect HelpJuice" and follow the OAuth flow — you will be redirected to HelpJuice to authorize KBPipe. Once connected, you can publish articles directly from KBPipe to your HelpJuice knowledge base. After generating an article and its HTML, click the "Publish to HelpJuice" button. The article will be created in your HelpJuice account.`,
      `Troubleshooting HelpJuice: if the connection fails, make sure you have admin access to your HelpJuice account. If publishing fails, check that your HelpJuice plan supports API access. You can disconnect and reconnect at any time from the Integrations settings.`,
    ],
  },
  {
    slug: 'api-access',
    title: 'API & MCP Server',
    category: 'developer',
    chunks: [
      `KBPipe provides a REST API for programmatic article generation. API keys are managed in Settings > Integrations tab, under the API Keys section. Click "Create API Key" to generate a new key. Keys are prefixed with "vtk_" and are shown only once — save them securely. The API endpoint is POST /api/v1/generate. Send a JSON body with: url (video URL), articleTypeId (optional), platformProfileId (optional), and workspaceId (optional). Authenticate with the header: Authorization: Bearer vtk_your_key_here.`,
      `KBPipe also provides an MCP (Model Context Protocol) server that lets AI assistants like Claude generate KB articles. The MCP server exposes two tools: generate_article (create a new article from a URL) and list_articles (list existing articles). To use it, install the mcp-server package and configure it with your KBPipe API key. The MCP server communicates via stdio transport and calls KBPipe's REST API under the hood.`,
    ],
  },
  {
    slug: 'billing-plans',
    title: 'Billing & Plans',
    category: 'billing',
    chunks: [
      `KBPipe offers four plans: Free — 3 articles per month, 1 workspace, basic features. Starter ($19/month or $190/year) — 30 articles per month, unlimited workspaces, all article types and platform profiles, API access. Team ($49/month or $490/year) — 100 articles per month, team collaboration, invite members, shared workspace quota. Enterprise ($99/month or $990/year) — 300 articles per month, priority support, advanced integrations, dedicated onboarding.`,
      `To manage your subscription: go to the Billing page from the sidebar. Here you can: view your current plan and usage, upgrade or downgrade your plan, update your payment method, view and download invoices, cancel or resume your subscription. Plan changes take effect immediately with prorated billing. When you cancel, you keep access until the end of your current billing period. You can resume a canceled subscription before it expires.`,
    ],
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting Common Issues',
    category: 'troubleshooting',
    chunks: [
      `Article generation fails or takes too long: the pipeline typically takes 1-3 minutes. If it fails, check: is the video URL accessible? (try opening it in an incognito browser). Is the video too long? (keep under 15 minutes for best results). Is the video in a supported language? (English works best, but other languages are supported). Try again — temporary API issues can cause one-off failures.`,
      `HTML generation issues: if the HTML does not match your platform's style, try using Smart Import to create a new Platform Profile from an existing article URL. If Smart Import does not capture your styling correctly, you can manually edit the Profile's HTML prompt and reference template. Make sure your reference template includes the CSS classes and structure you want.`,
      `Login issues: KBPipe supports magic link login (email) and Google OAuth. If the magic link does not arrive, check your spam folder. The link expires after 1 hour. If Google login fails, make sure you are using the correct Google account. Contact support if you continue to have issues.`,
      `Usage and quota: your article count resets at the beginning of each billing period. You can check your current usage on the Billing page or Dashboard. If you hit your limit, you can upgrade your plan or wait for the next period. Bonus credits (if any) are added to your monthly quota and do not roll over.`,
    ],
  },
  {
    slug: 'export-options',
    title: 'Export & Copy Options',
    category: 'basics',
    chunks: [
      `After generating an article, you have several export options: Copy as Markdown — copies the article text in Markdown format to your clipboard. Copy as HTML — copies the generated HTML to your clipboard (generate HTML first). Export as Word (.docx) — downloads the article as a Word document, preserving formatting and structure. Publish to HelpJuice — if connected, publishes directly to your HelpJuice KB. You can also manually copy-paste the article text or HTML into any KB platform or CMS.`,
    ],
  },
  {
    slug: 'text-input',
    title: 'Text Input (Non-Video)',
    category: 'basics',
    chunks: [
      `KBPipe is not limited to video URLs. You can also paste plain text as input — such as meeting notes, user stories, product specs, support tickets, or any text content. The AI pipeline will skip the transcription step and go directly to article generation. This is useful for: converting meeting notes into documentation, turning user stories or specs into KB articles, creating articles from support ticket summaries, or any text-to-article workflow. Just paste your text in the input field instead of a URL.`,
    ],
  },
];
