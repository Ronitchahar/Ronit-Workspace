function parseMarkdown(text) {
  if (!text) return "";

  // We do NOT escape HTML here because the editor natively outputs HTML tags for formatting
  const html = text
    .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`)
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, "<del>$1</del>")
    .replace(/==(.*?)==/g, "<span class='highlight'>$1</span>")
    .replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank'>$1</a>")
    .replace(/^\- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/gm, "<ul>$1</ul>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return `<p>${html}</p>`;
}

export function downloadNoteAsPDF(note, filename) {
  if (!note) return;

  const formattedContent = parseMarkdown(note.content);
  const fileName = (filename || note.title || "Untitled Note").trim();

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${fileName}</title>
        <style>
          @page { 
            margin: 2.54cm;
            size: A4;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1f2937;
            line-height: 1.8;
            background: #ffffff;
          }
          .note-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .note-header {
            margin-bottom: 40px;
            padding-bottom: 24px;
            border-bottom: 2px solid #e5e7eb;
          }
          h1.note-title { 
            font-size: 36px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0;
            line-height: 1.2;
            letter-spacing: -0.5px;
          }
          .note-content {
            font-size: 15px;
            line-height: 1.8;
            color: #374151;
          }
          .note-content p {
            margin-bottom: 18px;
          }
          .note-content h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin-top: 36px;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e5e7eb;
          }
          .note-content h2 {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            margin-top: 32px;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f3f4f6;
          }
          .note-content h3 {
            font-size: 20px;
            font-weight: 600;
            color: #374151;
            margin-top: 28px;
            margin-bottom: 14px;
          }
          .note-content h4,
          .note-content h5,
          .note-content h6 {
            font-size: 16px;
            font-weight: 600;
            color: #4b5563;
            margin-top: 20px;
            margin-bottom: 12px;
          }
          .note-content ul {
            margin-left: 28px;
            margin-bottom: 18px;
            list-style-type: disc;
          }
          .note-content li {
            margin-bottom: 10px;
            color: #374151;
          }
          .note-content pre {
            background: #f9fafb;
            border-left: 4px solid #6366f1;
            padding: 18px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            line-height: 1.6;
            color: #1f2937;
          }
          .note-content code {
            background: #f3f4f6;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
          }
          .note-content a {
            color: #6366f1;
            text-decoration: none;
            border-bottom: 1px solid #e0e7ff;
          }
          .note-content strong {
            font-weight: 700;
            color: #111827;
          }
          .note-content em {
            font-style: italic;
            color: #4b5563;
          }
          .note-content del {
            text-decoration: line-through;
            color: #9ca3af;
          }
          .highlight {
            background-color: #fef08a;
            padding: 2px 4px;
            border-radius: 3px;
          }
          @media print {
            body { background: white; }
            .note-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="note-container">
          <div class="note-header">
            <h1 class="note-title">${fileName}</h1>
          </div>
          <div class="note-content">${formattedContent}</div>
        </div>
      </body>
    </html>
  `;

  // Create blob from HTML
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  // Create temporary link and trigger download
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${fileName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(blobUrl);
}
