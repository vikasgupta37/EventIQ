export type Appearance = "light" | "dark" | "system";
export const appearanceKey = "eventiq-appearance";
export function validAppearance(value: unknown): Appearance {
  return value === "light" || value === "dark" ? value : "system";
}
// Runs before the first paint; contains only application-owned static code.
export const appearanceBootstrap = `(()=>{let p="system";try{const s=localStorage.getItem("eventiq-appearance");if(s==="light"||s==="dark")p=s}catch{}const r=document.documentElement;r.dataset.appearance=p;r.dataset.theme=p==="system"?(window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light"):p})()`;
