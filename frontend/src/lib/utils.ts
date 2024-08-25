import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function timestampToDate(UNIX_timestamp: number) {
    const a = new Date(UNIX_timestamp * 1000);
    const hour = a.getHours().toString().padStart(2, "0");
    const min = a.getMinutes().toString().padStart(2, "0");
    const sec = a.getSeconds().toString().padStart(2, "0");
    const time = hour + ":" + min + ":" + sec;
    return time;
}
