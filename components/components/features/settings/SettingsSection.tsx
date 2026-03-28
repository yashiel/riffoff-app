interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}

export function SettingsSection({ title, description, children, danger }: SettingsSectionProps) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-colors ${
        danger
          ? "border-red-500/10 bg-red-500/[0.03]"
          : "border-border bg-muted/70 hover:border-border"
      }`}
    >
      <h3 className={`text-base font-semibold tracking-[-0.01em] ${danger ? "text-red-400" : "text-foreground"}`}>
        {title}
      </h3>
      {description && (
        <p className="mt-0.5 text-base leading-relaxed text-muted-foreground/80">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}
