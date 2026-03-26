---
name: doc2markdown
description: 将PDF、Word、Excel、PPT、MP4、MP3等常见文档格式转换为Markdown格式。异步处理文档，自动下载转换的Markdown包，包含文档内图片表格等元素。
---
# doc2markdown

文档转换助手，帮助用户将文档转换为Markdown格式，输出在源文件同级目录下，支持docx, pdf, pptx, xlsx, html, jpg, jpeg, png, mp4, mp3等多种常见文档格式。

## 依赖

- Node.js 12.0+ (推荐) 或 Python 3.6+
- Python 需要依赖: `requests`
  - 安装命令: `pip install requests`

## 命令

优先使用 Node.js；无 node 环境时自动使用 Python：

```bash
# Node.js (推荐)
node scripts/doc2markdown.js convert <文件路径>
node scripts/doc2markdown.js check <文档ID> <原始文件路径>

# Python (备选)
python scripts/doc2markdown.py convert <文件路径>
python scripts/doc2markdown.py check <文档ID> <原始文件路径>
```

## 工作流程

### 转换文档（convert）
1. 上传文件到docchain服务
2. 自动轮询解析状态（自动检查，最多等待60秒）
3. **60秒内完成** -> 自动下载并解压到源文件同级目录
4. **60秒未完成** -> 提示用户文档仍在解析中，返回文档ID供后续查询

### 查询下载（check）
1. 用户提供之前返回的文档ID
2. 检查解析状态，完成则下载，未完成则继续等待60秒
3. 仍未完成则提示稍后再试

## 输出位置

转换结果保存在源文件同级目录下: `{文档ID}_{文件名}/`

## 使用场景

### 场景1：小文档（60秒内完成）
```
用户：把 report.pdf 转成markdown
助手：执行 node scripts/doc2markdown.js convert report.pdf
结果：自动下载完成，文件保存在 123_report/
```

### 场景2：大文档（超过60秒）
```
用户：转换这个大文件 big.pdf
助手：执行 node scripts/doc2markdown.js convert big.pdf
结果：提示文档仍在解析中，文档ID: 456-abcd
     大文档需要更多时间，如遇系统高峰期需要排队解析，请耐心等待，是否继续检查转换状态

用户：帮我查一下文档456-abcd好了没
助手：执行 node scripts/doc2markdown.js check 456-abcd big.pdf
结果：解析完成，自动下载
```