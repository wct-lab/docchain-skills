---
name: markdown2doc
description: Lightweight document utility designed to convert Markdown (MD) files to PDF format. Preserves document structure, heading hierarchy, embedded images. Requires no external dependencies.
homepage: https://lab.hjcloud.com/llmdoc
metadata: {"openclaw":{"emoji":"📑","requires":{"bins":["node"]}}}
---
# markdown2doc

Document conversion assistant that automatically converts Markdown (MD) files to PDF format, saving output to the same directory as the source file.

## Quick Start

```bash
# Convert markdown to PDF
node scripts/markdown2doc.js convert <file_path> pdf        # Output: same_name.pdf
```

## Capabilities

- Supported output formats: PDF
- Preserves markdown structure, headings, lists, tables, and code blocks
- Generates a navigable table of contents with heading hierarchy
- Embeds images referenced in the markdown into the output PDF, including both local images and URL images
- No API Key or account required, minimal external dependencies
- Output file is saved to the same directory as the source markdown file

## When to Use

- User requests to "export", "convert", "generate PDF" from markdown
- User provides a markdown file path and asks to convert it to PDF
- User needs a printable or shareable version of a markdown document

## Workflow

### convert — Convert Markdown File

1. Read markdown file content from specified path
2. Scan markdown for local image references and collect image files
3. Send markdown content to conversion service
4. Receive converted file stream (PDF)
5. Save output file to source file's parent directory

## Data & Privacy

- `convert` sends markdown content to the docchain cloud service (`lab.hjcloud.com`) for processing. The markdown content is transmitted to generate the output document.
- All transfers use HTTPS encryption.
- Users should ensure that markdown content does not contain sensitive or confidential information unless they have verified the service's data handling practices.
- Service endpoint: https://lab.hjcloud.com/llmdoc

## Feedback & Support

For conversion errors, format issues, or other problems, please submit an issue on GitHub:
https://github.com/wct-lab/docchain-skills

> More output formats are planned for future releases.