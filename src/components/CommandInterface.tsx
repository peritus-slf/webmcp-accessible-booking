"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOOLS, toolByName } from "@/lib/tools/registry";
import { getModelContext, type RegisteredTool } from "@/lib/tools/webmcp";

/**
 * The command interface — the second consumer of the tool contract.
 *
 * An agent reaches these tools through `document.modelContext`. So does this
 * dialog. When WebMCP is present it deliberately routes through
 * `getTools()` and `executeTool()`, the same calls the agent makes, rather
 * than shortcutting to the handlers. Parity is then a property of the
 * architecture rather than a claim in a README.
 *
 * When WebMCP is absent — most browsers today — it falls back to the shared
 * registry directly. The capability never disappears; only the route changes.
 *
 * Form fields are generated from each tool's `inputSchema`: the same JSON
 * Schema the agent uses to decide how to call the tool. One description of the
 * inputs, two renderings of it.
 */

type FieldValue = string | boolean;

interface SchemaProperty {
  type?: string;
  description?: string;
  enum?: string[];
  items?: { type?: string };
  minimum?: number;
  maximum?: number;
}

function properties(schema: Record<string, unknown>): Record<string, SchemaProperty> {
  return (schema.properties as Record<string, SchemaProperty>) ?? {};
}

function requiredFields(schema: Record<string, unknown>): string[] {
  return (schema.required as string[]) ?? [];
}

/** Turn the collected form values into the shape the tool's schema declares. */
function coerce(
  values: Record<string, FieldValue>,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const props = properties(schema);
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(values)) {
    const prop = props[key];
    if (!prop) continue;
    if (typeof raw === "boolean") {
      if (raw) out[key] = true;
      continue;
    }
    if (raw.trim() === "") continue;

    if (prop.type === "integer") out[key] = Number.parseInt(raw, 10);
    else if (prop.type === "number") out[key] = Number.parseFloat(raw);
    else if (prop.type === "array") {
      out[key] = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else out[key] = raw;
  }
  return out;
}

export function CommandInterface() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(TOOLS[0].name);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [result, setResult] = useState<string>("");
  const [route, setRoute] = useState<"webmcp" | "registry" | null>(null);
  const [busy, setBusy] = useState(false);

  const tool = toolByName(selected) ?? TOOLS[0];

  // Cmd/Ctrl+K opens the dialog. The trigger button is always in the tab order
  // as well; a keyboard shortcut is never the only route to a capability.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const run = useCallback(async () => {
    setBusy(true);
    setResult("");
    const input = coerce(values, tool.inputSchema);

    try {
      const mc = getModelContext();
      if (mc) {
        // Route through WebMCP itself, exactly as the agent would.
        const registered: RegisteredTool[] = await mc.getTools();
        const match = registered.find((t) => t.name === tool.name);
        if (match) {
          const output = await mc.executeTool(match, JSON.stringify(input));
          setRoute("webmcp");
          setResult(output ?? "The page navigated before a result came back.");
          return;
        }
      }
      const output = await (tool.execute as (i: unknown) => Promise<string>)(input);
      setRoute("registry");
      setResult(output);
    } catch (error) {
      setResult(`That did not run: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }, [tool, values]);

  const props = properties(tool.inputSchema);
  const required = requiredFields(tool.inputSchema);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Ask for seats
        <span className="ml-2 text-xs opacity-70" aria-hidden="true">
          ⌘K
        </span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-labelledby="command-title"
        className="rounded-lg p-0 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
      >
        <form method="dialog" className="sr-only">
          <button type="submit">Close</button>
        </form>

        <div className="p-6">
          <h2 id="command-title" className="text-lg font-semibold">
            Ask for seats
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            These are the same tools an AI agent is offered on this page. You are
            not being given a reduced version of them.
          </p>

          <div className="mt-5">
            <label htmlFor="tool-select" className="block text-sm font-medium">
              What do you want to do?
            </label>
            <select
              id="tool-select"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setValues({});
                setResult("");
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              {TOOLS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {tool.description}
            </p>
          </div>

          {Object.keys(props).length > 0 && (
            <fieldset className="mt-5 space-y-3">
              <legend className="text-sm font-medium">Details</legend>
              {Object.entries(props).map(([key, prop]) => {
                const id = `field-${key}`;
                const isRequired = required.includes(key);
                const describedBy = prop.description ? `${id}-hint` : undefined;

                return (
                  <div key={key}>
                    {prop.type === "boolean" ? (
                      <div className="flex items-start gap-2">
                        <input
                          id={id}
                          type="checkbox"
                          checked={values[key] === true}
                          aria-describedby={describedBy}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [key]: e.target.checked }))
                          }
                          className="mt-1"
                        />
                        <label htmlFor={id} className="text-sm">
                          {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </label>
                      </div>
                    ) : (
                      <>
                        <label htmlFor={id} className="block text-sm">
                          {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                          {isRequired && (
                            <span className="text-red-600"> (required)</span>
                          )}
                        </label>
                        {prop.enum ? (
                          <select
                            id={id}
                            required={isRequired}
                            aria-describedby={describedBy}
                            value={(values[key] as string) ?? ""}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [key]: e.target.value }))
                            }
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                          >
                            <option value="">No preference</option>
                            {prop.enum.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={id}
                            type={
                              prop.type === "integer" || prop.type === "number"
                                ? "number"
                                : "text"
                            }
                            required={isRequired}
                            aria-describedby={describedBy}
                            value={(values[key] as string) ?? ""}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [key]: e.target.value }))
                            }
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                          />
                        )}
                      </>
                    )}
                    {prop.description && (
                      <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
                        {prop.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </fieldset>
          )}

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              {busy ? "Working…" : "Run"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
            >
              Close
            </button>
          </div>

          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mt-5 min-h-[3rem] whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm dark:bg-slate-800"
          >
            {result || "Results appear here and are read out automatically."}
          </div>

          {route && (
            <p className="mt-2 text-xs text-slate-500">
              {route === "webmcp"
                ? "Answered through document.modelContext.executeTool — the same call an agent makes."
                : "WebMCP is not available in this browser, so this ran against the shared registry directly. Same tool, same result."}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
