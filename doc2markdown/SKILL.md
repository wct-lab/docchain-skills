---
name: doc2markdown
description: Lightweight document utility designed to convert files to Markdown (MD), built specifically for intelligent agents (e.g., OpenClaw, ClaudeCode) to read and process content. Requires no external dependencies and accurately preserves document structure and formatting. Supported formats include docx, doc, pdf, ppt, pptx, xls, xlsx, jpg, jpeg, png, ceb, teb, caj, odt, ofd, cebx, odp, ott, wps, ods, et, dps, epub, chm, sdc, sdd, sdw, mobi
homepage: https://lab.hjcloud.com/llmdoc
---
# doc2markdown

文档转换助手，自动将文档转换为 Markdown（MD）格式，输出至源文件同级目录，帮助智能体读取和处理各种格式的文档内容。

## 快速开始

```bash
# 解析（自动等待60s，完成则下载，超时返回文档ID）
node scripts/doc2markdown.js convert <文件路径>
# 查询状态并下载（用于超时未完成的文档）
node scripts/doc2markdown.js check <文档ID> <原始文件路径>
```

## 支持能力

- 支持格式：docx, doc, pdf, ppt, pptx, xls, xlsx, jpg, jpeg, png, ceb, teb, caj, odt, ofd, cebx, odp, ott, wps, ods, et, dps, epub, chm, sdc, sdd, sdw, mobi 等
- 保留文档结构、表格、图片
- 无需 API Key 或账号，无需任何依赖
- 输出目录：源文件同级目录下的 `{文档ID}_{文件名}/`

## 使用时机

- 用户要求"读取"、"提取"、"转换"、"查看"某个文档
- 用户提供了文档路径并询问其内容
- 用户需要对文档进行摘要或分析
- 用户需要将文档内容转为 Markdown 格式

## 工作流程

### convert — 转换文档
1. 调用文件解析服务
2. 自动轮询解析状态（最多等待 60 秒）
3. **60 秒内完成** → 自动下载并解压到源文件同级目录
4. **60 秒未完成** → 返回文档 ID，供后续用 `check` 查询

### check — 查询下载
1. 提供之前返回的文档 ID
2. 完成则下载，未完成则继续等待 60 秒
3. 仍未完成则提示稍后再试

## 数据与隐私

- `convert` 会将文件上传至 docchain 云端服务（`lab.hjcloud.com`）进行解析，结果以 ZIP 包返回并解压到本地。
- 传输全程使用 HTTPS 加密。
- 在转换包含敏感内容的文档前，请确认该服务的数据留存政策符合你的安全要求。
- 详情参见 https://lab.hjcloud.com/llmdoc

## 反馈与支持

遇到解析、格式错误或其他问题，可以在 GitHub 提交 Issue：
https://github.com/wct-lab/docchain-skills