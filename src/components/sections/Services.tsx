/**
 * SERVICES — real content from V1 (Apa-ini/index.html, 9 services).
 * Plain grid for now — V1 had a 3D conveyor + flip cards; V2 gets its own treatment later.
 */

const SERVICES: { num: string; title: string; desc: string; subs?: string[] }[] = [
  {
    num: "01",
    title: "Custom Software Development",
    desc: "Tailor-made software designed around your unique business processes, helping you improve productivity, streamline operations, and support long-term growth.",
  },
  {
    num: "02",
    title: "Web Application Development",
    desc: "Modern, responsive, and secure web applications built with performance, scalability, and user experience in mind.",
  },
  {
    num: "03",
    title: "Mobile App Development",
    desc: "Native and cross-platform mobile applications for Android and iOS that deliver seamless user experiences.",
  },
  {
    num: "04",
    title: "Artificial Intelligence Solutions",
    desc: "Leverage AI to automate workflows, enhance customer engagement, analyze data, and unlock new business opportunities through intelligent digital solutions.",
    subs: ["Jenna.ai", "Knowledge Assistants", "Process Automation", "AI-Powered Analytics", "Custom AI Integration"],
  },
  {
    num: "05",
    title: "Enterprise Solutions",
    desc: "Develop enterprise-grade platforms that integrate departments, automate operations, and improve decision-making across your organization.",
  },
  {
    num: "06",
    title: "System Integration",
    desc: "Connect existing applications, third-party services, and business systems through secure and reliable API integrations.",
  },
  {
    num: "07",
    title: "UI/UX Design",
    desc: "Create intuitive and engaging digital experiences through user-centered interface and experience design.",
  },
  {
    num: "08",
    title: "Cloud & DevOps",
    desc: "Deploy, monitor, and optimize applications with modern cloud infrastructure and DevOps best practices for maximum reliability and scalability.",
  },
  {
    num: "09",
    title: "Maintenance & Technical Support",
    desc: "Ensure your applications remain secure, updated, and optimized with continuous support and proactive maintenance.",
  },
];

export default function Services() {
  return (
    <section id="services" className="border-y border-zinc-900 bg-zinc-950/50">
      <div className="px-6 py-24 sm:px-10 sm:py-32">
        <p className="text-xs tracking-widest text-zinc-400 uppercase">Our Services</p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          Building Intelligent Digital Solutions
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <article
              key={s.num}
              className="group rounded-lg border border-zinc-900 bg-zinc-950 p-6 transition-colors hover:border-zinc-700"
            >
              <span className="text-xs text-zinc-600 tabular-nums">{s.num}</span>
              <h3 className="mt-3 font-medium text-zinc-100 transition-colors group-hover:text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
              {s.subs && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.subs.map((sub) => (
                    <li
                      key={sub}
                      className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400"
                    >
                      {sub}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
