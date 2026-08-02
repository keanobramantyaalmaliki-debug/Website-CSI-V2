import { FadeUpList, FadeUpItem } from "@/components/motion/FadeUp";
import { TEAM_MEMBERS } from "@/data/people";
import type { TeamMember } from "@/data/people";

const CATEGORIES: TeamMember["category"][] = [
  "Management",
  "Design",
  "Engineering",
];

export default function TheCrew() {
  const grouped = CATEGORIES.reduce(
    (acc, cat) => ({
      ...acc,
      [cat]: TEAM_MEMBERS.filter((m) => m.category === cat),
    }),
    {} as Record<TeamMember["category"], TeamMember[]>,
  );

  return (
    <section id="crew" className="px-6 py-24 sm:px-10">
      <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-400">
          The Crew
        </p>
        <span className="font-mono text-xs tabular-nums text-zinc-600">
          {TEAM_MEMBERS.length} people
        </span>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat}>
          <p className="mt-12 mb-2 text-[10px] uppercase tracking-widest text-zinc-600">
            {cat}
          </p>

          <FadeUpList>
            {grouped[cat].map((member) => (
              <FadeUpItem
                key={member.name}
                tag="article"
                className="group grid gap-2 border-b border-white/[0.06] py-5 sm:grid-cols-[1fr_auto] sm:gap-6"
              >
                <div>
                  <h3 className="relative w-fit font-medium text-zinc-100 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-zinc-100 after:transition-[width] after:duration-300 after:content-[''] group-hover:after:w-full">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">{member.role}</p>
                </div>
                {member.social && (
                  <div className="flex gap-4 self-center">
                    {member.social.map((s) => (
                      <a
                        key={s.platform}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] uppercase tracking-wider text-zinc-600 transition-colors duration-200 hover:text-zinc-300"
                      >
                        {s.platform}
                      </a>
                    ))}
                  </div>
                )}
              </FadeUpItem>
            ))}
          </FadeUpList>
        </div>
      ))}
    </section>
  );
}
