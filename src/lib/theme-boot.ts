/** Shared by the server layout (inline <head> script) and the client theme store. No "use client". */
export const THEME_KEY = "sw.theme";

/** Applies the saved/system theme before first paint, so dark mode never flashes white. */
export const THEME_BOOT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_KEY}")||"system";var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;
