# docchain-skills

English | [中文](./README.zh-CN.md)

A collection of agent skills for openclaw, Claude Code, and other AI agents, extending lightweight document processing capabilities. No configuration or authentication required — install and use immediately.

| Skill | Description |
|---|---|
| [doc2markdown](#doc2markdown) | Convert docx, pdf, ppt, and many other formats to Markdown |
| [markdown2doc](#markdown2doc) | Convert Markdown files to PDF |

---

## Installation

```bash
clawhub install doc2markdown
clawhub install markdown2doc
```

Or via npx (installs clawhub automatically on first use):

```bash
npx clawhub@latest install doc2markdown
npx clawhub@latest install markdown2doc
```

**If you encounter a rate limit error, log in first:**

```bash
× Rate limit exceeded (retry in 1s, remaining: 0/30, reset in 1s)
Error: Rate limit exceeded (retry in 1s, remaining: 0/30, reset in 1s)
```

```bash
clawhub login --token xxxxxxxx
```

You can create a token at [clawhub.ai](https://clawhub.ai) — sign in with your GitHub account, then go to Settings to generate one.

---

## doc2markdown

Clawhub: `https://clawhub.ai/haoyt27/doc2markdown`

Converts documents in various formats to Markdown for AI agents to read and process. Since the built-in `read` tool cannot handle non-text formats, use this skill to convert documents first and then proceed with further processing.

**Supported formats:** docx, doc, pdf, ppt, pptx, xls, xlsx, jpg, jpeg, png, ceb, teb, caj, odt, ofd, cebx, odp, ott, wps, ods, et, dps, epub, chm, mobi, and more

### Usage

Works out of the box after installation. Just tell your agent:

- `Convert this document to md`
- `Read xxx.pdf — what does it say?`

Output is saved to the same directory as the source file. Two output modes are supported:

- **Single md file**: A single merged Markdown file, without images or table attachments
- **md package**: An extracted folder containing image files from the document, with tables preserved in HTML format

---

## markdown2doc

Clawhub: `https://clawhub.ai/haoyt27/markdown2doc`

Converts Markdown files to PDF. Useful when an agent needs to export a report or share a document. Preserves heading hierarchy, tables, code blocks, and embedded images. More output formats are planned.

### Usage

Works out of the box after installation. Just tell your agent:

- `Export this md file as PDF`
- `Convert the report to PDF`

The output file is saved in the same directory as the source Markdown file, with the same filename.

> **Note:** Local images referenced in the Markdown must be located in the **same directory as the md file, or a subdirectory** (e.g., `./images/photo.png`). Images outside this path will be skipped.