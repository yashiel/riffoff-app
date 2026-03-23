"use client";

interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = calculateStrength(password);

  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-amber-500", "bg-emerald-500"];
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength ? colors[strength] : "bg-[rgba(255,255,255,0.06)]"
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className={`text-[11px] ${strength >= 3 ? "text-emerald-400" : strength >= 2 ? "text-amber-400" : "text-red-400"}`}>
          {labels[strength]}
        </p>
      )}
    </div>
  );
}

/** Calculate password strength (0-4) based on entropy factors */
function calculateStrength(password: string): number {
  if (password.length === 0) return 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Common patterns reduce score
  if (/^[a-z]+$/i.test(password) || /^\d+$/.test(password)) score = Math.max(0, score - 2);
  if (password.length < 8) score = 0;

  return Math.min(4, score);
}

/** Exported for testing */
export { calculateStrength };
