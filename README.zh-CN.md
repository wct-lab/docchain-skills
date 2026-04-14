# docchain-skills

[English](./README.md) | 中文

基于 docchain 的智能体技能合集，为 openclaw、Claude Code 等智能体扩展轻量级文档处理能力，安装即可用，无需额外配置或鉴权。

| 技能 | 功能 |
|---|---|
| [doc2markdown](#doc2markdown) | 将 docx、pdf、ppt 等多种格式文档转换为 Markdown |
| [markdown2doc](#markdown2doc) | 将 Markdown 文件转换为 PDF |

---

## 安装

```bash
clawhub install doc2markdown
clawhub install markdown2doc
```

或使用 npx（首次使用时自动安装 clawhub）：

```bash
npx clawhub@latest install doc2markdown
npx clawhub@latest install markdown2doc
```

**如遇限流错误，先登录再安装：**

```bash
× Rate limit exceeded (retry in 1s, remaining: 0/30, reset in 1s)
Error: Rate limit exceeded (retry in 1s, remaining: 0/30, reset in 1s)
```

```bash
clawhub login --token xxxxxxxx
```

token 可在 [clawhub.ai](https://clawhub.ai) 右上角登录（支持 GitHub 账号）后，在设置里创建。

---

## doc2markdown

Clawhub: `https://clawhub.ai/haoyt27/doc2markdown`

将 docx、pdf、ppt 等多种格式文档转换为 Markdown，供 openclaw、Claude Code 等智能体读取和处理。系统工具的 read 无法读取非文本格式文档，可先用此技能转换后再进行后续处理。

**支持格式：** docx, doc, pdf, ppt, pptx, xls, xlsx, jpg, jpeg, png, ceb, teb, caj, odt, ofd, cebx, odp, ott, wps, ods, et, dps, epub, chm, mobi 等

### 使用

安装完成后开箱即用，无需配置，直接在智能体中说：

- `将这个文档转成 md`
- `读取 xxx.pdf，它讲了什么`

转换结果保存在文档同级目录下，支持两种输出方式：

- **单 md 文件**：一个 md 文件，不包含额外的图片和表格附件
- **md 包**：解压后的文件夹，附带文档内的图片文件，表格以 HTML 格式保留

---

## markdown2doc

Clawhub: `https://clawhub.ai/haoyt27/markdown2doc`

将 Markdown 文件转换为 PDF（将来计划增加更多转换格式），可在 openclaw、Claude Code 等智能体生成报告、导出文档时使用，保留标题层级、表格、代码块及嵌入图片。

### 使用

安装完成后开箱即用，无需配置，直接在智能体中说：

- `将这个 md 文件导出为 PDF`
- `把报告转成 PDF`

输出文件保存在 Markdown 文件的同级目录下，文件名与源文件相同。

> **注意：** Markdown 中引用的本地图片需位于 **md 文件所在目录或其子目录**（如 `./images/photo.png`），否则图片将被跳过。