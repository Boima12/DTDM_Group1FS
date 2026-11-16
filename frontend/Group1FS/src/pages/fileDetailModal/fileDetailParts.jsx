import { useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./fileDetailModal.module.css";

export function CopyButton({ value, label }) {
    const [copied, setCopied] = useState(false);

    const copyValue = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button
            className={styles.copyButton}
            type="button"
            onClick={copyValue}
            aria-label={copied ? `Đã sao chép ${label}` : `Sao chép ${label}`}
            title={copied ? "Đã sao chép" : "Sao chép"}
        >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className={styles.copyFeedback}>
                {copied ? "Đã sao chép" : ""}
            </span>
        </button>
    );
}

export function DetailRow({
    label,
    value,
    alternate = false,
    copyable = false,
    accent = false,
}) {
    return (
        <div
            className={`${styles.detailRow} ${alternate ? styles.alternateRow : ""}`}
        >
            <span className={styles.detailLabel}>{label}</span>
            <span className={styles.valueGroup}>
                <span
                    className={`${styles.detailValue} ${accent ? styles.accentValue : ""}`}
                    title={value}
                >
                    {value}
                </span>
                {copyable && <CopyButton value={value} label={label} />}
            </span>
        </div>
    );
}