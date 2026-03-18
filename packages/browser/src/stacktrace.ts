import type { ExceptionData, StackFrame } from "./types";

// Regex patterns for parsing different browser stack trace formats
const CHROME_REGEX = /^\s*at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|(.+))\)?$/;
const FIREFOX_REGEX = /^(.+?)@(.+?):(\d+):(\d+)$/;

/** Parse an Error into structured exception data for the Overflow ingest API. */
export function parseError(error: Error): ExceptionData {
  const frames = parseStacktrace(error.stack);
  return {
    values: [
      {
        type: error.name || "Error",
        value: error.message || "Unknown error",
        stacktrace: frames.length > 0 ? { frames } : undefined,
      },
    ],
  };
}

/** Parse a stack trace string into an array of structured frames. */
export function parseStacktrace(stack?: string): StackFrame[] {
  if (!stack) return [];

  const lines = stack.split("\n").filter((line) => line.trim());
  const frames: StackFrame[] = [];

  for (const line of lines) {
    const frame = parseChromeLine(line) || parseFirefoxLine(line);
    if (frame) {
      frames.push(frame);
    }
  }

  // Reverse so oldest frame is first
  return frames.reverse();
}

function parseChromeLine(line: string): StackFrame | null {
  const match = CHROME_REGEX.exec(line);
  if (!match) return null;

  const functionName = match[1] || "<anonymous>";
  const filename = match[2] || match[5];
  const lineno = match[3] ? parseInt(match[3], 10) : undefined;
  const colno = match[4] ? parseInt(match[4], 10) : undefined;

  return buildFrame(functionName, filename, lineno, colno);
}

function parseFirefoxLine(line: string): StackFrame | null {
  const match = FIREFOX_REGEX.exec(line);
  if (!match) return null;

  return buildFrame(
    match[1] || "<anonymous>",
    match[2],
    parseInt(match[3], 10),
    parseInt(match[4], 10),
  );
}

function buildFrame(
  fn: string,
  filename?: string,
  lineno?: number,
  colno?: number,
): StackFrame {
  let moduleName: string | undefined;
  let functionName = fn;

  // Extract module from function name (e.g. "Module.functionName")
  const dotIdx = fn.lastIndexOf(".");
  if (dotIdx !== -1) {
    moduleName = fn.substring(0, dotIdx);
    functionName = fn.substring(dotIdx + 1);
  }

  return {
    module: moduleName,
    function: functionName,
    filename,
    lineno,
    colno,
    abs_path: filename,
    in_app: filename ? !filename.includes("node_modules") : undefined,
  };
}
