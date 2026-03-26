#!/usr/bin/env python3
"""
doc2markdown
基于docchain远程服务实现多种格式文件转Markdown
默认输出目录为源文件同级目录
"""
import io
import os
import sys
import time
import json
import zipfile

import requests
from typing import Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

POLL_INTERVAL = 3   # 轮询间隔（秒）
POLL_TIMEOUT = 60   # 自动等待上限（秒）


class Doc2Markdown:

    BASE_URL = "https://lab.hjcloud.com/llmdoc/v1"

    def upload_file(self, file_path: str) -> Optional[str]:
        """上传文件到docchain服务，返回文档引用ID"""
        if not os.path.exists(file_path):
            print(f"错误: 文件不存在 - {file_path}")
            return None

        try:
            ascii_filename = os.path.basename(file_path)
            if not ascii_filename:
                ascii_filename = 'document.docx'

            with open(file_path, 'rb') as f:
                files = {'file': (ascii_filename, f)}
                url = f"{self.BASE_URL}/skills/doc2markdown/convert"

                response = requests.post(url, files=files, timeout=30)

                if response.status_code == 200:
                    try:
                        response_json = response.json()
                        if not response_json.get("success", True):
                            print(f"API请求失败: {response_json.get('err')}")
                            return None
                        doc_id = response_json.get('doc_id')
                        if doc_id:
                            return doc_id
                        else:
                            print(f"上传成功但未获取到文档引用ID")
                            return None
                    except json.JSONDecodeError:
                        print(f"响应转换失败，响应内容: {response.text}")
                        return None
                else:
                    print(f"上传失败，状态码: {response.status_code}")
                    print(f"错误信息: {response.text}")
                    return None

        except Exception as e:
            print(f"上传文件时发生错误: {str(e)}")
            return None

    def check_status(self, doc_id: str) -> Optional[str]:
        """
        检查文档处理状态

        Returns:
            'done' | 'failed' | 'converting' | None(请求失败)
        """
        try:
            url = f"{self.BASE_URL}/skills/doc2markdown/check"
            params = {'doc_id': doc_id}

            response = requests.get(url, params=params, timeout=30)

            if response.status_code == 200:
                data = response.json()
                if not data.get("success", True):
                    print(f"检查状态失败: {data.get('err')}")
                    return None
                status_detail = data.get('status_detail', {})
                convert_status = status_detail.get('convert_md', {}).get('state')
                if convert_status == '1':
                    return 'done'
                elif convert_status == '3':
                    return 'failed'
                return 'converting'
            else:
                print(f"检查状态失败，状态码: {response.status_code}，错误信息: {response.text}")
                return None

        except Exception as e:
            print(f"检查状态时发生错误: {str(e)}")
            return None

    def get_markdown(self, doc_id: str):
        """获取转换后的markdown内容（zip包bytes）"""
        try:
            url = f"{self.BASE_URL}/skills/doc2markdown/download"
            params = {'doc_id': doc_id}

            response = requests.get(url, params=params, timeout=30)

            if response.status_code == 200:
                return response.content
            else:
                print(f"获取内容失败，状态码: {response.status_code}")
                return None

        except Exception as e:
            print(f"获取内容时发生错误: {str(e)}")
            return None

    def save_markdown(self, zip_bytes, doc_id: str, file_path: str) -> Optional[str]:
        """解压zip到源文件同级目录，返回输出目录路径"""
        try:
            parent_dir = os.path.dirname(os.path.abspath(file_path))
            file_id, _ = doc_id.split('-')
            markdown_dir_name = f"{file_id}_" + os.path.splitext(os.path.basename(file_path))[0]
            out_dir = os.path.join(parent_dir, markdown_dir_name)
            os.makedirs(out_dir, exist_ok=True)
            safe_out_dir = os.path.realpath(out_dir) + os.sep
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                for member in z.infolist():
                    member_path = os.path.realpath(os.path.join(out_dir, member.filename))
                    if not member_path.startswith(safe_out_dir):
                        raise Exception(f"不安全的ZIP条目路径（路径穿越）: {member.filename}")
                    z.extract(member, out_dir)
            return out_dir
        except Exception as e:
            print(f"保存文件时发生错误: {str(e)}")
            return None

    def poll_until_done(self, doc_id: str, file_path: str = None):
        """
        轮询等待转换完成（最多POLL_TIMEOUT秒）

        Returns:
            (True, out_dir)  - 转换完成并已下载
            (False, msg)     - 转换失败
            (None, None)     - 超时未完成
        """
        elapsed = 0
        while elapsed < POLL_TIMEOUT:
            status = self.check_status(doc_id)
            if status is None:
                print("错误: 无法获取文档状态，请稍后重试")
                sys.exit(1)
            if status == 'done':
                print(f"  转换完成，正在下载...")
                zip_bytes = self.get_markdown(doc_id)
                if not zip_bytes:
                    return False, "获取markdown内容失败"
                hint = file_path or f"doc_{doc_id}.md"
                out_dir = self.save_markdown(zip_bytes, doc_id, hint)
                if not out_dir:
                    return False, "保存文件失败"
                return True, out_dir
            elif status == 'failed':
                return False, "文档转换失败"
            else:
                print(f"  转换中... 已等待 {elapsed}s.")
                time.sleep(POLL_INTERVAL)
                elapsed += POLL_INTERVAL

        return None, None

    def convert_file(self, file_path: str):
        """上传文件并自动等待转换，超时则返回doc_id供后续查询"""
        # 1. 上传文件
        print(f"[1/3] 正在上传文件: {file_path}")
        doc_id = self.upload_file(file_path)
        if not doc_id:
            print(f"文件上传失败！")
            sys.exit(1)
        print(f"  上传成功，文档ID: {doc_id}")

        # 2. 轮询等待（最多60秒）
        print(f"[2/3] 等待转换（自动检查）...")
        result, detail = self.poll_until_done(doc_id, file_path)

        if result is True:
            print(f"[3/3] 下载完成，文件已保存: {detail}")
        elif result is False:
            print(f"错误: {detail}")
            sys.exit(1)
        else:
            print(f"  文档ID: {doc_id}")
            print(f"[!] 文档仍在转换中（已超过 {POLL_TIMEOUT}s）")
            print("[!] 大文档通常需要更多时间，如遇系统高峰期需要排队转换，请耐心等待")
            print("[!] 是否需要继续查询转换状态并下载")
            sys.exit(2)

    def check_and_download(self, doc_id: str, file_path: str):
        """通过doc_id检查状态并下载"""
        print(f"[1/2] 检查文档 {doc_id} 的转换状态...")
        status = self.check_status(doc_id)
        if status is None:
            print("错误: 无法获取文档状态，请稍后重试")
            sys.exit(1)

        if status == 'failed':
            print("错误: 文档转换失败")
            sys.exit(1)
        elif status == 'done':
            print(f"  转换已完成，正在下载...")
            zip_bytes = self.get_markdown(doc_id)
            if not zip_bytes:
                print("获取markdown内容失败")
                sys.exit(1)
            out_dir = self.save_markdown(zip_bytes, doc_id, file_path)
            if not out_dir:
                sys.exit(1)
            print(f"[2/2] 下载完成，文件已保存: {out_dir}")
        else:
            print("  文档仍在转换中，继续等待...")
            result, detail = self.poll_until_done(doc_id, file_path)
            if result is True:
                print(f"[2/2] 下载完成，文件已保存: {detail}")
            elif result is False:
                print(f"错误: {detail}")
                sys.exit(1)
            else:
                print(f"[!] 文档仍在转换中，请稍后再试")
                print(f"  文档ID: {doc_id}")
                sys.exit(2)


USAGE = """用法:
  python doc2markdown.py convert <文件路径>          上传并转换文档
  python doc2markdown.py check  <文档ID> <文件路径>   查询状态并下载

示例:
  python doc2markdown.py convert report.pdf
  python doc2markdown.py check 123-f3ce07 report.pdf"""


def main():
    if len(sys.argv) < 2:
        print(USAGE)
        sys.exit(1)

    converter = Doc2Markdown()
    cmd = sys.argv[1]

    if cmd == "convert":
        if len(sys.argv) != 3:
            print("用法: python doc2markdown.py convert <文件路径>")
            sys.exit(1)
        converter.convert_file(sys.argv[2])

    elif cmd == "check":
        if len(sys.argv) != 4:
            print("用法: python doc2markdown.py check <文档ID> <文件路径>")
            sys.exit(1)
        doc_id = sys.argv[2]
        file_path = sys.argv[3]
        converter.check_and_download(doc_id, file_path)

    else:
        # 兼容：直接传文件路径视为 convert
        if os.path.isfile(cmd):
            converter.convert_file(cmd)
        else:
            print(f"未知命令: {cmd}")
            print(USAGE)
            sys.exit(1)


if __name__ == '__main__':
    main()
