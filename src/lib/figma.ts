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

type AnyNode = {
  id?: string;
  name?: string;
  type?: string;
  characters?: string;
  visible?: boolean;
  children?: AnyNode[];
};

function collectTextNodes(root: AnyNode): string[] {
  const out: string[] = [];
  const stack: AnyNode[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (!n) continue;
    if (n.visible === false) continue;
    if (n.type === "TEXT" && typeof n.characters === "string") {
      const t = n.characters.trim();
      if (t) out.push(t);
    }
    if (Array.isArray(n.children)) {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
    }
  }
  return out;
}

export async function fetchFigmaNodeText(params: {
  figmaToken: string;
  fileKey: string;
  nodeId: string;
}): Promise<string[]> {
  const { figmaToken, fileKey, nodeId } = params;
  const res = await fetch(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}`,
    { headers: { "X-Figma-Token": figmaToken } }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Figma nodes API failed: ${res.status} ${text}`.trim());
  }

  const data = (await res.json().catch(() => null)) as
    | {
        nodes?: Record<string, { document?: unknown }>;
      }
    | null;
  const doc = (data?.nodes?.[nodeId]?.document ?? null) as AnyNode | null;
  if (!doc) return [];

  // 중복 제거 + 너무 많은 텍스트 제한
  const texts = collectTextNodes(doc)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const t of texts) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(t);
    if (uniq.length >= 120) break;
  }
  return uniq;
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

