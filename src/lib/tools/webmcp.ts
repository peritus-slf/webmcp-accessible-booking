import { TOOLS } from "./registry";

/**
 * WebMCP binding.
 *
 * Registers the shared tool contract with `document.modelContext` when the
 * browser supports it. Registration is additive: nothing here is required for
 * the site to work, and nothing here is the only route to a capability. If
 * WebMCP is absent, the in-page command interface still reads the same
 * registry directly, so no capability is agent-only.
 */

export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  origin?: string;
}

interface ModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: Record<string, unknown>;
      execute: (input: never, context: { signal: AbortSignal }) => Promise<string>;
    },
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
  getTools(options?: { fromOrigins?: string[] }): Promise<RegisteredTool[]>;
  /**
   * Implementations disagree on the input shape. Chrome's documentation shows
   * a JSON string; ChatGPT's browser rejects that with "executeTool requires
   * an object input". The type admits both and `callTool` below tries each.
   */
  executeTool(
    tool: RegisteredTool,
    input: string | Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>;
  addEventListener(type: "toolchange", listener: () => void): void;
  removeEventListener(type: "toolchange", listener: () => void): void;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

export function getModelContext(): ModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  return typeof document.modelContext?.registerTool === "function"
    ? document.modelContext
    : undefined;
}

export function isWebMcpAvailable(): boolean {
  return getModelContext() !== undefined;
}

/**
 * Invoke a tool through WebMCP, tolerating either input convention.
 *
 * Chrome's reference documentation passes a JSON string. ChatGPT's browser
 * requires an object and rejects a string outright. Rather than betting on one,
 * try the object form and fall back to the string form. A WebMCP demo that only
 * runs in one implementation of WebMCP would be a poor demonstration of it.
 */
export async function callTool(
  mc: ModelContext,
  tool: RegisteredTool,
  input: Record<string, unknown>,
): Promise<string | null> {
  try {
    return await mc.executeTool(tool, input);
  } catch (error) {
    if (error instanceof TypeError || String(error).includes("object input")) {
      return mc.executeTool(tool, JSON.stringify(input));
    }
    throw error;
  }
}

/**
 * Register every tool in the shared contract.
 *
 * Returns an abort function that unregisters them again. Chrome 153 and later
 * honour the signal without interrupting an execution already in flight.
 */
export async function registerAllTools(): Promise<() => void> {
  const mc = getModelContext();
  if (!mc) return () => {};

  const controller = new AbortController();

  await Promise.all(
    TOOLS.map((tool) =>
      mc
        .registerTool(
          {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: tool.annotations,
            execute: async (input) => tool.execute(input),
          },
          { signal: controller.signal },
        )
        .catch((error: unknown) => {
          // A single failed registration must not take the page down. The
          // command interface still reaches this tool through the registry.
          console.warn(`[saeti] could not register tool "${tool.name}"`, error);
        }),
    ),
  );

  return () => controller.abort();
}
