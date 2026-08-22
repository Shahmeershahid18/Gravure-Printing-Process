/**
 * Theme resolution, in one place.
 *
 * Kept free of React and of `next/headers` so the same constants can be used
 * by the blocking script in the document head, by client components, and by
 * tests without dragging a runtime along.
 */

export type Theme = "light" | "dark" | "system"

export const THEME_KEY = "intaglio-theme"
export const THEMES: Theme[] = ["light", "dark", "system"]

export const themeLabel: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "Auto",
}

export function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark" || v === "system"
}

/**
 * The script that runs before first paint.
 *
 * It is inlined into <head> and deliberately not a module: anything deferred
 * or hydrated runs after the browser has already painted the default palette,
 * which is the white flash every themed app is judged on. It also sets
 * colorScheme so the native form controls and scrollbars come up correct on
 * the very first frame rather than one repaint later.
 */
export const THEME_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});
if(s!=="light"&&s!=="dark"&&s!=="system")s="system";
var d=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var e=document.documentElement;
e.setAttribute("data-theme",d?"dark":"light");
e.style.colorScheme=d?"dark":"light";
}catch(_){}})();`
