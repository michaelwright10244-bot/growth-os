const MAX_FILE_SIZE = 1_000_000;

export const WORK_FILE_ACCEPT = ".txt,.md,.json,text/plain,text/markdown,application/json";

export async function readWorkFile(file: File): Promise<string> {
  if (!/\.(txt|md|json)$/i.test(file.name)) {
    throw new Error("目前只支持 TXT、Markdown 和 JSON 文件。");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("单个工作记录文件不能超过 1MB。");
  }
  const body = (await file.text()).trim();
  if (!body) throw new Error("文件内容为空，无法保存。");
  return body;
}
