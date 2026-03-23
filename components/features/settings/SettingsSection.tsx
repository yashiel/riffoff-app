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
          : "border-white/[0.04] bg-white/[0.02] hover:border-white/[0.06]"
      }`}
    >
      <h3 className={`text-[15px] font-semibold tracking-[-0.01em] ${danger ? "text-red-400" : "text-white/90"}`}>
        {title}
      </h3>
      {description && (
        <p className="mt-0.5 text-[12px] leading-relaxed text-white/30">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}
