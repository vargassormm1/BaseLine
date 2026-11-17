"use client";
import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_COOKIE, type ThemePref } from "@/lib/ui/theme";

const OPTIONS = [{ value: "system", label: "System", icon: Monitor }, { value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }] as const;
export function ThemeControl({ initial }: { initial: ThemePref }) {
  const [pref, setPref] = useState<ThemePref>(initial);
  const choose = (v: ThemePref) => {
    setPref(v);
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = v === "system" ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax${secure}` : `${THEME_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax${secure}`;
    if (v === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", v);
  };
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-full bg-surface-3 p-1">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={pref === o.value} onClick={() => choose(o.value)}
          className={`press inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold ${pref === o.value ? "bg-surface text-text shadow-sm" : "text-text-2"}`}>
          <o.icon size={16} aria-hidden="true" />{o.label}
        </button>
      ))}
    </div>
  );
}
