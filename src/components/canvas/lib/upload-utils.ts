import type { Node } from '@xyflow/react';

export const ACCEPTED_FILE_TYPES =
  '.pdf,.md,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.m4a,.ogg,.aac';

export function getNodeTypeForFile(
  type: string,
  name: string
): 'image' | 'pdf' | 'audio' | 'fileMarkdown' {
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'text/markdown' || name.endsWith('.md')) return 'fileMarkdown';
  return 'image';
}

interface UploadContext {
  apiBasePath: string;
  addNode: (node: Node) => void;
  queueEvent: (type: string, detail: string) => void;
  sessionUser: string;
}

export async function uploadFiles(
  files: FileList | File[],
  ctx: UploadContext,
  getPosition: (index: number) => { x: number; y: number }
): Promise<number> {
  let uploadCount = 0;

  for (const file of Array.from(files)) {
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${ctx.apiBasePath}/upload`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) continue;

      const data = await res.json();
      const nodeType = getNodeTypeForFile(file.type, file.name);

      const nodeData: Record<string, unknown> = {
        url: data.url,
        filename: file.name,
      };

      if (nodeType === 'image') {
        nodeData.width = 400;
        nodeData.height = 300;
      }

      if (nodeType === 'fileMarkdown') {
        const text = await fetch(data.url).then((r) => r.text());
        nodeData.content = text;
      }

      const pos = getPosition(uploadCount);

      ctx.addNode({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: nodeType,
        position: pos,
        data: nodeData,
        style:
          nodeType === 'image'
            ? { width: 400, height: 300 }
            : nodeType === 'pdf'
              ? { width: 500, height: 600 }
              : undefined,
      });
      uploadCount++;
    } catch {
      continue;
    }
  }

  if (uploadCount > 0) {
    ctx.queueEvent(
      'upload',
      uploadCount === 1
        ? `${ctx.sessionUser} uploaded a file`
        : `${ctx.sessionUser} uploaded ${uploadCount} files`
    );
  }

  return uploadCount;
}
