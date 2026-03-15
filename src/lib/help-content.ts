export interface HelpArticle {
  title: string;
  sections: {
    heading: string;
    content: string;
  }[];
}

export const helpArticles: Record<string, HelpArticle> = {
  '/': {
    title: 'Creating Articles',
    sections: [
      {
        heading: 'How to create an article',
        content:
          'Paste a video URL (YouTube, Loom, or Google Drive) or switch to "Paste Content" mode to enter any text — user stories, specs, meeting notes, or transcripts. Select an article type and output platform, then click "Create Article".',
      },
      {
        heading: 'Supported video sources',
        content:
          'KBify supports YouTube videos, Loom recordings, and Google Drive shared videos. Just paste the URL and the system will automatically detect the source and transcribe it.',
      },
      {
        heading: 'Paste Content mode',
        content:
          'You can paste any text content directly — not just video transcripts. User stories, feature specifications, process descriptions, meeting notes, or any raw content will be transformed into a structured KB article.',
      },
      {
        heading: 'Article types',
        content:
          'Choose the type of article you want to generate. Each type uses a different AI prompt to structure the output. You can create custom article types in Settings with your own prompts.',
      },
      {
        heading: 'Review & edit',
        content:
          'After generation, you can review and edit the markdown before generating the final HTML. The article is automatically saved to your workspace.',
      },
    ],
  },
  '/dashboard': {
    title: 'Dashboard',
    sections: [
      {
        heading: 'Overview',
        content:
          'The dashboard shows your workspace stats — total articles, articles created this week, and this month. Use it to track your content creation progress.',
      },
      {
        heading: 'Company context',
        content:
          'If you see a yellow banner, it means you haven\'t set up your company context yet. Adding company info helps the AI generate more relevant and on-brand articles. Go to Settings → Company Context to set it up.',
      },
      {
        heading: 'Recent articles',
        content:
          'Your latest articles are shown here for quick access. Click any article to view, edit, or export it.',
      },
    ],
  },
  '/articles': {
    title: 'Articles Library',
    sections: [
      {
        heading: 'Browse your articles',
        content:
          'All articles in your current workspace are listed here. Use the search bar to find specific articles by title.',
      },
      {
        heading: 'Source icons',
        content:
          'Each article shows an icon indicating its source — YouTube, Loom, Google Drive, or pasted content. This helps you track where your content came from.',
      },
      {
        heading: 'Managing articles',
        content:
          'Click on any article to view and edit it. You can also delete articles using the trash icon. Deleted articles cannot be recovered.',
      },
    ],
  },
  '/settings': {
    title: 'Settings',
    sections: [
      {
        heading: 'Company Context',
        content:
          'Set your company name, description, industry, and target audience. This information is injected into every AI prompt so articles match your brand voice and terminology. You can enter it manually or auto-scrape from your website.',
      },
      {
        heading: 'Article Types',
        content:
          'Define custom article types with two prompts: a Draft Prompt (how the AI should write the initial draft) and a Structure Prompt (how the draft should be organized). Default types include Screen Overview and Process/How-to.',
      },
      {
        heading: 'Platform Profiles',
        content:
          'Configure output platforms that determine how your article\'s HTML is formatted. Each platform profile has an HTML Prompt and an HTML Template. The default HelpJuice profile generates styled HTML with accordions and icons.',
      },
      {
        heading: 'API Keys',
        content:
          'Generate API keys to use KBify programmatically. API keys are scoped to your workspace and can be used with the /api/v1/generate endpoint to create articles from any automation tool.',
      },
      {
        heading: 'Account',
        content:
          'Manage your account settings and sign out from here.',
      },
    ],
  },
};

// Match article detail pages
export function getHelpArticle(pathname: string): HelpArticle | null {
  // Exact match first
  if (helpArticles[pathname]) return helpArticles[pathname];

  // Article detail pages
  if (pathname.startsWith('/articles/')) {
    return {
      title: 'Article Editor',
      sections: [
        {
          heading: 'Editing your article',
          content:
            'You can edit both the title and markdown content of your article. Changes are saved when you click the Save button.',
        },
        {
          heading: 'Tabs: Markdown, HTML, Preview',
          content:
            'Switch between Markdown (raw content), HTML (platform-formatted code), and Preview (visual rendering) tabs to see your article in different formats.',
        },
        {
          heading: 'Regenerating HTML',
          content:
            'If you edited the markdown, you can regenerate the HTML for any platform profile. Select a platform from the dropdown and click "Generate HTML".',
        },
        {
          heading: 'Exporting',
          content:
            'Copy the article to your clipboard or download it as a Word document (.docx). The HTML can be directly pasted into your knowledge base platform.',
        },
      ],
    };
  }

  return null;
}
