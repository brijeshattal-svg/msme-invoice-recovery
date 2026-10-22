import { formatINR } from "@/lib/format";

/** Paise as rupees for display; negatives read as "-₹30,000.00" rather than "₹-30,000.00". */
export const inrPaise = (p: number): string => (p < 0 ? `-${formatINR(-p / 100)}` : formatINR(p / 100));
