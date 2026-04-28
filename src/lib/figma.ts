export type ParsedFigmaUrl =
  | {
      kind: "design";
      fileKey: string;
      nodeId?: string;
    }
  | {
      kind: "board";
      fileKey: string;
      nodeId?: string;
    }
  | {
      kind: "make";
      fileKey: string;
    };

/**
 * Supports URLs like:
 * - https://www.figma.com/design/:fileKey/:name?node-id=123-456
 * - https://www.figma.com/board/:fileKey/:name?node-id=123-456
 * - https://www.figma.com/make/:fileKey/:name
 */
export function parseFigmaUrl(input: string): ParsedFigmaUrl | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (!/figma\.com$/i.test(url.hostname) && !/\.figma\.com$/i.test(url.hostname)) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const kind = parts[0];
  const nodeIdParam = url.searchParams.get("node-id") ?? undefined;
  const nodeId = nodeIdParam?.replaceAll("-", ":");

  // Branch URLs: /design/:fileKey/branch/:branchKey/:name
  if (kind === "design" && parts[2] === "branch" && parts[3]) {
    return { kind: "design", fileKey: parts[3], nodeId };
  }

  const fileKey = parts[1];

  if (kind === "design") return { kind: "design", fileKey, nodeId };
  if (kind === "board") return { kind: "board", fileKey, nodeId };
  if (kind === "make") return { kind: "make", fileKey };

  return null;
}

export type FigmaNodeSummary = {
  name?: string;
  description?: string;
  type?: string;
};

export async function fetchFigmaNodeSummary(params: {
  figmaToken: string;
  fileKey: string;
  nodeId: string;
}): Promise<FigmaNodeSummary> {
  const { figmaToken, fileKey, nodeId } = params;
  const res = await fetch(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(
      nodeId
    )}`,
    { headers: { "X-Figma-Token": figmaToken } }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Figma nodes API failed: ${res.status} ${text}`.trim());
  }

  const data = (await res.json().catch(() => null)) as
    | {
        nodes?: Record<string, { document?: { name?: unknown; description?: unknown; type?: unknown } }>;
      }
    | null;
  const node = data?.nodes?.[nodeId]?.document;
  return {
    name: typeof node?.name === "string" ? node.name : undefined,
    description: typeof node?.description === "string" ? node.description : undefined,
    type: typeof node?.type === "string" ? node.type : undefined,
  };
}

export async function fetchFigmaNodeImageUrl(params: {
  figmaToken: string;
  fileKey: string;
  nodeId: string;
  scale?: number;
}): Promise<string | null> {
  const { figmaToken, fileKey, nodeId, scale = 2 } = params;
  const res = await fetch(
    `https://api.figma.com/v1/images/${encodeURIComponent(
      fileKey
    )}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${encodeURIComponent(String(scale))}`,
    { headers: { "X-Figma-Token": figmaToken } }
  );

  if (!res.ok) {
    return null;
  }

  const data = (await res.json().catch(() => null)) as
    | {
        images?: Record<string, unknown>;
      }
    | null;
  const url = data?.images?.[nodeId];
  return typeof url === "string" && url.length > 0 ? url : null;
}

