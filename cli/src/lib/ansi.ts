/**
 * Diez líneas de color. Sin chalk.
 * Se apaga con NO_COLOR (https://no-color.org), con --no-color, con TERM=dumb
 * o cuando stdout no es un TTY (pipes, CI, agentes).
 */
let enabled =
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb" &&
  process.stdout.isTTY === true;

export function setColor(on: boolean): void {
  enabled = on;
}

const wrap = (code: string) => (s: string) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : s);

export const bold = wrap("1");
export const dim = wrap("2");
export const red = wrap("31");
export const green = wrap("32");
export const yellow = wrap("33");
export const blue = wrap("34");
export const cyan = wrap("36");
