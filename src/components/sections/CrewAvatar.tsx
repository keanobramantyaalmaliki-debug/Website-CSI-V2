import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared photo-or-placeholder tile — same rule for desktop grid and mobile cards. */
export default function CrewAvatar({
  photoUrl,
  name,
  active,
  dimmed,
  className,
}: {
  photoUrl?: string;
  name: string;
  active?: boolean;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white/[0.04] transition-[opacity,filter] duration-300",
        active && "ring-1 ring-accent",
        dimmed && "opacity-50 brightness-75",
        className,
      )}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <UserRound
          className="h-1/3 w-1/3 text-zinc-600"
          strokeWidth={1.25}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
