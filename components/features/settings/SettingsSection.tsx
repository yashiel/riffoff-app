interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}

export function SettingsSection({ title, description, children, danger }: SettingsSectionProps) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        danger
          ? "border-red-500/20 bg-red-500/5"
          : "border-[rgba(255,255,255,0.06)]"
      }`}
    >
      <h3 className={`text-[16px] font-bold ${danger ? "text-red-400" : "text-white"}`}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}
