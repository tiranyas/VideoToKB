import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
} from 'docx';

function parseMarkdownToDocx(markdown: string): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    // Headings
    if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: trimmed.slice(4), bold: true })],
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.slice(3), bold: true })],
          spacing: { before: 300, after: 120 },
        })
      );
    } else if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: trimmed.slice(2), bold: true })],
          spacing: { before: 360, after: 200 },
        })
      );
    }
    // Blockquotes
    else if (trimmed.startsWith('> ')) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2), italics: true, color: '666666' })],
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        })
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(text),
          indent: { left: 360 },
          spacing: { before: 60, after: 60 },
        })
      );
    }
    // Bullet list
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2);
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `\u2022  ${text}` })],
          indent: { left: 360 },
          spacing: { before: 60, after: 60 },
        })
      );
    }
    // Regular paragraph
    else {
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(trimmed),
          spacing: { before: 120, after: 120 },
        })
      );
    }
  }

  return paragraphs;
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Simple bold/italic parsing: **bold**, *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // **bold**
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3]) {
      // *italic*
      runs.push(new TextRun({ text: match[3], italics: true }));
    } else if (match[4]) {
      // `code`
      runs.push(new TextRun({ text: match[4], font: 'Courier New', shading: { fill: 'f0f0f0' } }));
    } else if (match[5]) {
      runs.push(new TextRun({ text: match[5] }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}

export async function generateWordDoc(markdown: string): Promise<Blob> {
  const paragraphs = parseMarkdownToDocx(markdown);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return Packer.toBlob(doc);
}
