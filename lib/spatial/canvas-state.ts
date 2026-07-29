export interface SpatialNode {
  id: string;
  type: "ISSUE_CARD" | "CODE_SNIPPET" | "FIGMA_FRAME" | "WHITEBOARD_NOTE";
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: Record<string, any>;
}

export interface SpatialCanvasState {
  boardId: string;
  nodes: SpatialNode[];
  activeCursors: Array<{
    userId: string;
    userName: string;
    color: string;
    x: number;
    y: number;
  }>;
}

/**
 * Superpower 3: Real-Time Spatial Canvas State Manager
 * Manages spatial nodes, issue cards, code snippet blocks, and multiplayer cursor presence.
 */
export class SpatialCanvasManager {
  private state: SpatialCanvasState;

  constructor(boardId: string) {
    this.state = {
      boardId,
      nodes: [
        {
          id: "node-1",
          type: "ISSUE_CARD",
          title: "TRACK-101: Refactor JWT Auth Middleware",
          x: 100,
          y: 150,
          width: 280,
          height: 160,
          content: { status: "IN_PROGRESS", priority: "HIGH", assignee: "Alex" },
        },
        {
          id: "node-2",
          type: "CODE_SNIPPET",
          title: "lib/auth.ts",
          x: 420,
          y: 150,
          width: 320,
          height: 180,
          content: { language: "typescript", code: "export async function getAuthUser() { ... }" },
        },
      ],
      activeCursors: [],
    };
  }

  public getState(): SpatialCanvasState {
    return this.state;
  }

  public addNode(node: Omit<SpatialNode, "id">): SpatialNode {
    const newNode: SpatialNode = {
      ...node,
      id: `spatial-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    this.state.nodes.push(newNode);
    return newNode;
  }

  public moveNode(id: string, x: number, y: number): boolean {
    const node = this.state.nodes.find((n) => n.id === id);
    if (!node) return false;
    node.x = x;
    node.y = y;
    return true;
  }

  public updateCursor(userId: string, userName: string, color: string, x: number, y: number): void {
    const existing = this.state.activeCursors.find((c) => c.userId === userId);
    if (existing) {
      existing.x = x;
      existing.y = y;
    } else {
      this.state.activeCursors.push({ userId, userName, color, x, y });
    }
  }
}
