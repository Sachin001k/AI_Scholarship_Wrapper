"use client";
import { Moon, Sun } from "lucide-react";
import { setThemeMode, useTheme } from "@/lib/theme";

/** Sun/moon button: switches between light and dark (choice is remembered). */
export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setThemeMode(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
