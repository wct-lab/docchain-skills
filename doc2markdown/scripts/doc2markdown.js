#!/usr/bin/env node
/**
 * doc2markdown
 * 基于docchain远程服务实现多种格式文件转Markdown
 * 默认输出目录为源文件同级目录
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const POLL_INTERVAL = 3;   // 轮询间隔（秒）
const POLL_TIMEOUT = 60;   // 自动等待上限（秒）

class Doc2Markdown {
    constructor() {
        this.BASE_URL = "http://10.10.185.13:7100/llmdoc/v1";
    }

    /**
     * 发送HTTP请求
     * @param {string} url
     * @param {object} options
     * @returns {Promise<{status: number, data: any}>}
     */
    async request(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const reqOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: options.timeout || 30000
            };

            const req = httpModule.request(reqOptions, (res) => {
                const chunks = [];

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    let data;

                    if (options.responseType === 'arraybuffer') {
                        data = buffer;
                    } else {
                        const text = buffer.toString('utf8');
                        try {
                            data = JSON.parse(text);
                        } catch (e) {
                            data = text;
                        }
                    }

                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    /**
     * 生成multipart/form-data格式的请求体
     * @param {string} filePath
     * @param {string} filename
     * @returns {{body: Buffer, boundary: string}}
     */
    createMultipartFormData(filePath, filename) {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const fileContent = fs.readFileSync(filePath);

        const parts = [];

        // 添加文件字段
        parts.push(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
            `Content-Type: application/octet-stream\r\n\r\n`
        );

        parts.push(fileContent);
        parts.push(`\r\n--${boundary}--\r\n`);

        // 合并所有部分
        const buffers = parts.map(part =>
            Buffer.isBuffer(part) ? part : Buffer.from(part, 'utf8')
        );

        const body = Buffer.concat(buffers);

        return { body, boundary };
    }

    /**
     * 上传文件到docchain服务，返回文档引用ID
     * @param {string} filePath
     * @returns {Promise<string|null>}
     */
    async uploadFile(filePath) {
        if (!fs.existsSync(filePath)) {
            console.log(`错误: 文件不存在 - ${filePath}`);
            return null;
        }

        try {
            let asciiFilename = path.basename(filePath);
            if (!asciiFilename) {
                asciiFilename = 'document.docx';
            }

            const { body, boundary } = this.createMultipartFormData(filePath, asciiFilename);
            const url = `${this.BASE_URL}/skills/doc2markdown/convert`;

            const response = await this.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length
                },
                body: body,
                timeout: 30000
            });

            if (response.status === 200) {
                const responseJson = response.data;
                if (!responseJson.success && responseJson.success !== undefined) {
                    console.log(`API请求失败: ${responseJson.err}`);
                    return null;
                }
                const docId = responseJson.doc_id;
                if (docId) {
                    return docId;
                } else {
                    console.log(`上传成功但未获取到文档引用ID`);
                    return null;
                }
            } else {
                console.log(`上传失败，状态码: ${response.status}`);
                console.log(`错误信息: ${JSON.stringify(response.data)}`);
                return null;
            }

        } catch (error) {
            console.log(`上传文件时发生错误: ${error.message}`);
            return null;
        }
    }

    /**
     * 检查文档处理状态
     * @param {string} docId
     * @returns {Promise<'done'|'failed'|'converting'|null>}
     */
    async checkStatus(docId) {
        try {
            const url = `${this.BASE_URL}/skills/doc2markdown/check?doc_id=${encodeURIComponent(docId)}`;

            const response = await this.request(url, {
                method: 'GET',
                timeout: 30000
            });

            if (response.status === 200) {
                const data = response.data;
                if (!data.success && data.success !== undefined) {
                    console.log(`检查状态失败: ${data.err}`);
                    return null;
                }
                const statusDetail = data.status_detail || {};
                const convertStatus = (statusDetail.convert_md || {}).state;
                if (convertStatus === '1') {
                    return 'done';
                } else if (convertStatus === '3') {
                    return 'failed';
                }
                return 'converting';
            } else {
                console.log(`检查状态失败，状态码: ${response.status}，错误信息: ${JSON.stringify(response.data)}`);
                return null;
            }

        } catch (error) {
            console.log(`检查状态时发生错误: ${error.message}`);
            return null;
        }
    }

    /**
     * 获取转换后的markdown内容（zip包bytes）
     * @param {string} docId
     * @returns {Promise<Buffer|null>}
     */
    async getMarkdown(docId) {
        try {
            const url = `${this.BASE_URL}/skills/doc2markdown/download?doc_id=${encodeURIComponent(docId)}`;

            const response = await this.request(url, {
                method: 'GET',
                timeout: 30000,
                responseType: 'arraybuffer'
            });

            if (response.status === 200) {
                return response.data;
            } else {
                console.log(`获取内容失败，状态码: ${response.status}`);
                return null;
            }

        } catch (error) {
            console.log(`获取内容时发生错误: ${error.message}`);
            return null;
        }
    }

    /**
     * 解压zip到源文件同级目录，返回输出目录路径
     * @param {Buffer} zipBytes
     * @param {string} docId
     * @param {string} filePath
     * @returns {Promise<string|null>}
     */
    async saveMarkdown(zipBytes, docId, filePath) {
        try {
            const parentDir = path.dirname(path.resolve(filePath));
            const [fileId] = docId.split('-');
            const markdownDirName = `${fileId}_` + path.parse(filePath).name;
            const outDir = path.join(parentDir, markdownDirName);

            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }

            const zlib = require('zlib');
            const { pipeline } = require('stream/promises');

            // 临时保存 zip
            const tempZip = path.join(outDir, `temp_${Date.now()}.zip`);
            fs.writeFileSync(tempZip, zipBytes);

            // 原生解析 ZIP 中央目录
            const buffer = fs.readFileSync(tempZip);
            let pos = buffer.length - 22;
            while (pos > 0) {
                if (
                    buffer.readUInt32LE(pos) === 0x06054b50 &&
                    pos + 22 <= buffer.length
                )
                    break;
                pos--;
            }

            const entries = [];
            const diskEntries = buffer.readUInt16LE(pos + 8);
            const dirStart = buffer.readUInt32LE(pos + 16);
            pos = dirStart;

            for (let i = 0; i < diskEntries; i++) {
                if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
                const flags = buffer.readUInt16LE(pos + 8);
                const method = buffer.readUInt16LE(pos + 10);
                const nameLen = buffer.readUInt16LE(pos + 28);
                const extraLen = buffer.readUInt16LE(pos + 30);
                const commentLen = buffer.readUInt16LE(pos + 32);
                const offset = buffer.readUInt32LE(pos + 42);
                const name = buffer.toString('utf8', pos + 46, pos + 46 + nameLen);
                entries.push({ offset, method, name, encrypted: !!(flags & 1) });
                pos += 46 + nameLen + extraLen + commentLen;
            }

            // 解压每个文件
            for (const ent of entries) {
                if (ent.encrypted || ent.name.endsWith('/')) continue;
                const o = ent.offset;
                const sig = buffer.readUInt32LE(o);
                if (sig !== 0x04034b50) continue;
                const nameLen = buffer.readUInt16LE(o + 26);
                const extraLen = buffer.readUInt16LE(o + 28);
                const csize = buffer.readUInt32LE(o + 18);
                const usize = buffer.readUInt32LE(o + 14);
                const dataStart = o + 30 + nameLen + extraLen;
                const data = buffer.slice(dataStart, dataStart + csize);

                const outPath = path.join(outDir, ent.name.replace(/\\/g, '/'));
                const outDirPath = path.dirname(outPath);
                if (!fs.existsSync(outDirPath)) fs.mkdirSync(outDirPath, { recursive: true });

                if (ent.method === 0) {
                    fs.writeFileSync(outPath, data);
                } else if (ent.method === 8) {
                    const decompressed = zlib.inflateSync(data, { chunkSize: usize });
                    fs.writeFileSync(outPath, decompressed);
                }
            }

            fs.unlinkSync(tempZip);
            return outDir;

        } catch (error) {
            console.log(`保存文件时发生错误: ${error.message}`);
            return null;
        }
    }

    /**
     * 轮询等待转换完成（最多POLL_TIMEOUT秒）
     * @param {string} docId
     * @param {string|null} filePath
     * @returns {Promise<[boolean, string]|[null, null]>}
     */
    async pollUntilDone(docId, filePath = null) {
        let elapsed = 0;
        while (elapsed < POLL_TIMEOUT) {
            const status = await this.checkStatus(docId);
            if (status === null) {
                console.log("错误: 无法获取文档状态，请稍后重试");
                process.exit(1);
            }
            if (status === 'done') {
                console.log(`  转换完成，正在下载...`);
                const zipBytes = await this.getMarkdown(docId);
                if (!zipBytes) {
                    return [false, "获取markdown内容失败"];
                }
                const hint = filePath || `doc_${docId}.md`;
                const outDir = await this.saveMarkdown(zipBytes, docId, hint);
                if (!outDir) {
                    return [false, "保存文件失败"];
                }
                return [true, outDir];
            } else if (status === 'failed') {
                return [false, "文档转换失败"];
            } else {
                console.log(`  转换中... 已等待 ${elapsed}s.`);
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL * 1000));
                elapsed += POLL_INTERVAL;
            }
        }

        return [null, null];
    }

    /**
     * 上传文件并自动等待转换，超时则返回doc_id供后续查询
     * @param {string} filePath
     */
    async convertFile(filePath) {
        // 1. 上传文件
        console.log(`[1/3] 正在上传文件: ${filePath}`);
        const docId = await this.uploadFile(filePath);
        if (!docId) {
            console.log(`文件上传失败！`);
            process.exit(1);
        }
        console.log(`  上传成功，文档ID: ${docId}`);

        // 2. 轮询等待（最多60秒）
        console.log(`[2/3] 等待转换（自动检查）...`);
        const [result, detail] = await this.pollUntilDone(docId, filePath);

        if (result === true) {
            console.log(`[3/3] 下载完成，文件已保存: ${detail}`);
        } else if (result === false) {
            console.log(`错误: ${detail}`);
            process.exit(1);
        } else {
            console.log(`  文档ID: ${docId}`);
            console.log(`[!] 文档仍在转换中（已超过 ${POLL_TIMEOUT}s）`);
            console.log(`[!] 大文档通常需要更多时间，如遇系统高峰期需要排队转换，请耐心等待`);
            console.log(`[!] 是否需要继续查询转换状态并下载`);
            process.exit(2);
        }
    }

    /**
     * 通过doc_id检查状态并下载
     * @param {string} docId
     * @param {string} filePath
     */
    async checkAndDownload(docId, filePath) {
        console.log(`[1/2] 检查文档 ${docId} 的转换状态...`);
        const status = await this.checkStatus(docId);
        if (status === null) {
            console.log("错误: 无法获取文档状态，请稍后重试");
            process.exit(1);
        }

        if (status === 'failed') {
            console.log("错误: 文档转换失败");
            process.exit(1);
        } else if (status === 'done') {
            console.log(`  转换已完成，正在下载...`);
            const zipBytes = await this.getMarkdown(docId);
            if (!zipBytes) {
                console.log("获取markdown内容失败");
                process.exit(1);
            }
            const outDir = await this.saveMarkdown(zipBytes, docId, filePath);
            if (!outDir) {
                process.exit(1);
            }
            console.log(`[2/2] 下载完成，文件已保存: ${outDir}`);
        } else {
            console.log("  文档仍在转换中，继续等待...");
            const [result, detail] = await this.pollUntilDone(docId, filePath);
            if (result === true) {
                console.log(`[2/2] 下载完成，文件已保存: ${detail}`);
            } else if (result === false) {
                console.log(`错误: ${detail}`);
                process.exit(1);
            } else {
                console.log(`[!] 文档仍在转换中，请稍后再试`);
                console.log(`  文档ID: ${docId}`);
                process.exit(2);
            }
        }
    }
}

const USAGE = `用法:
  node doc2markdown-native.js convert <文件路径>          上传并转换文档
  node doc2markdown-native.js check  <文档ID> <文件路径>   查询状态并下载

示例:
  node doc2markdown-native.js convert report.pdf
  node doc2markdown-native.js check 123-f3ce07 report.pdf`;


async function main() {
    if (process.argv.length < 3) {
        console.log(USAGE);
        process.exit(1);
    }

    const converter = new Doc2Markdown();
    const cmd = process.argv[2];

    if (cmd === "convert") {
        if (process.argv.length !== 4) {
            console.log("用法: node doc2markdown-native.js convert <文件路径>");
            process.exit(1);
        }
        await converter.convertFile(process.argv[3]);

    } else if (cmd === "check") {
        if (process.argv.length !== 5) {
            console.log("用法: node doc2markdown-native.js check <文档ID> <文件路径>");
            process.exit(1);
        }
        const docId = process.argv[3];
        const filePath = process.argv[4];
        await converter.checkAndDownload(docId, filePath);

    } else {
        // 兼容：直接传文件路径视为 convert
        if (fs.existsSync(cmd) && fs.statSync(cmd).isFile()) {
            await converter.convertFile(cmd);
        } else {
            console.log(`未知命令: ${cmd}`);
            console.log(USAGE);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(`程序执行错误: ${error.message}`);
        process.exit(1);
    });
}

module.exports = Doc2Markdown;