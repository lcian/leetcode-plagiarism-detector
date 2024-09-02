import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun } from "lucide-react";
import { Check } from "lucide-react";

export function ThemeSelectionDropdown() {
    const { theme, setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="border absolute right-10 top-5">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    Light
                    {theme === "light" && <Check className="ml-2 w-3.5 h-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Dark
                    {theme === "dark" && <Check className="ml-2 w-3.5 h-3.5" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
