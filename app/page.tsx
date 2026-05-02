import Link from "next/link";

const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL?.trim();
const discordHref = discordUrl || "#community-discord";
const discordIsReady = Boolean(discordUrl);

const communityStats = [
  ["Invite-only", "CAD access"],
  ["Discord", "Community hub"],
  ["Roleplay", "Built for us"],
];

const communityHighlights = [
  {
    title: "Join the community first",
    description:
      "Discord is the front door for announcements, applications, department updates, and support from staff.",
  },
  {
    title: "Use the CAD once approved",
    description:
      "Members sign in after staff approval so dispatch, patrol, civilian records, and admin tools stay tied to our roster.",
  },
  {
    title: "Keep roleplay organized",
    description:
      "Calls, reports, BOLOs, warrants, citations, arrests, vehicles, and civilian data all live in one shared system.",
  },
];

const rolePanels = [
  {
    label: "Dispatch",
    title: "Coordinate live scenes",
    detail:
      "Create calls, assign units, track priority, and keep everyone working from the same operational picture.",
  },
  {
    label: "Patrol",
    title: "Work from the MDT",
    detail:
      "Review calls, run lookups, file reports, issue citations, process arrests, and check BOLOs or warrants.",
  },
  {
    label: "Civilian",
    title: "Build persistent records",
    detail:
      "Keep character, vehicle, and incident history organized for deeper community roleplay.",
  },
  {
    label: "Staff",
    title: "Manage access",
    detail:
      "Handle onboarding, user roles, password resets, removals, and system settings from the admin console.",
  },
];

const supportOptions = [
  {
    title: "Community donations",
    description:
      "Help cover hosting, database usage, development time, and the tools that keep our CAD available.",
    href: "/support",
    cta: "Support the server",
  },
  {
    title: "Discord updates",
    description:
      "Follow development notes, report issues, and see when CAD access or new workflows are opened to members.",
    href: discordHref,
    cta: discordIsReady ? "Join Discord" : "Discord link soon",
  },
];

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.4-4" />
    </svg>
  );
}

type CommunityLinkProps = {
  href: string;
  children: React.ReactNode;
  className: string;
};

function CommunityLink({ href, children, className }: CommunityLinkProps) {
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#08090d] text-neutral-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md border border-cyan-300/35 bg-cyan-300/10 text-sm font-bold text-cyan-100">
            SC
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase text-neutral-400">
              Sentinel Community
            </span>
            <span className="block text-lg font-semibold text-white">CAD/MDT</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-3 text-sm text-neutral-300 sm:flex">
          <CommunityLink href={discordHref} className="rounded-md px-3 py-2 hover:bg-white/10">
            Discord
          </CommunityLink>
          <Link href="/support" className="rounded-md px-3 py-2 hover:bg-white/10">
            Donate
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-4 py-2 font-semibold text-neutral-950 hover:bg-cyan-200"
          >
            Member login <ArrowIcon />
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center gap-10 px-6 pb-14 pt-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-100">
              Built for our FiveM roleplay community
            </p>
            <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
              Sentinel Community CAD/MDT
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
              This CAD is not a public product or multi-community service. It is
              our shared operations hub for approved members, dispatchers,
              officers, civilians, and staff.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CommunityLink
                href={discordHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-indigo-400 px-5 py-3 font-semibold text-white hover:bg-indigo-300"
              >
                {discordIsReady ? "Join our Discord" : "Discord invite coming soon"} <ArrowIcon />
              </CommunityLink>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/10"
              >
                CAD login <ArrowIcon />
              </Link>
              <Link
                href="/support"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-semibold text-emerald-100 hover:bg-emerald-300/15"
              >
                Donate <ArrowIcon />
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              {communityStats.map(([value, label]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-2xl font-semibold text-white">{value}</div>
                  <div className="mt-1 text-xs uppercase text-neutral-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-neutral-900/80 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-neutral-400">Community Access</p>
                <h2 className="text-xl font-semibold text-white">Member Pathway</h2>
              </div>
              <span className="rounded-md bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">
                Active
              </span>
            </div>
            <div className="space-y-3">
              {communityHighlights.map((item, index) => (
                <article
                  key={item.title}
                  className="grid gap-3 rounded-md border border-white/10 bg-neutral-950/70 p-4 sm:grid-cols-[auto_1fr]"
                >
                  <span className="grid size-10 place-items-center rounded-md bg-cyan-300/10 text-sm font-bold text-cyan-200">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="community-discord"
          className="border-y border-white/10 bg-neutral-900/70"
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-indigo-300">
                Start here
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Discord is the front desk for the community.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <p className="text-base leading-8 text-neutral-300">
                New members should join Discord for rules, whitelist steps,
                staff announcements, department information, and help getting
                connected. CAD access comes after the community process, not
                before it.
              </p>
              <CommunityLink
                href={discordHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-indigo-400 px-5 py-3 font-semibold text-white hover:bg-indigo-300"
              >
                {discordIsReady ? "Join Discord" : "Invite pending"} <ArrowIcon />
              </CommunityLink>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-cyan-300">
                CAD tools
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Organized around how our server actually plays.
              </h2>
            </div>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Request an account <ArrowIcon />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {rolePanels.map((panel) => (
              <article
                key={panel.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="mb-5 inline-flex rounded-md bg-cyan-300/10 px-2 py-1 text-xs font-semibold uppercase text-cyan-200">
                  {panel.label}
                </span>
                <h3 className="text-lg font-semibold text-white">{panel.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-400">
                  {panel.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-neutral-900/50">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-emerald-300">
                Support
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Help keep our CAD and server tools running.
              </h2>
              <p className="mt-4 leading-7 text-neutral-300">
                Donations are for this community: infrastructure, reliability,
                staff tools, and the quality-of-life work that improves roleplay.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {supportOptions.map((option) => (
                <article
                  key={option.title}
                  className="rounded-lg border border-white/10 bg-neutral-950/60 p-5"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-md bg-emerald-300/10 text-emerald-200">
                      <ShieldIcon />
                    </span>
                    <span className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold uppercase text-neutral-400">
                      Community
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{option.title}</h3>
                  <p className="mt-3 min-h-18 text-sm leading-6 text-neutral-400">
                    {option.description}
                  </p>
                  <CommunityLink
                    href={option.href}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
                  >
                    {option.cta} <ArrowIcon />
                  </CommunityLink>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-sm text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Sentinel Community CAD/MDT for our FiveM roleplay server.</p>
          <div className="flex gap-4">
            <CommunityLink href={discordHref} className="hover:text-neutral-200">
              Discord
            </CommunityLink>
            <Link href="/support" className="hover:text-neutral-200">
              Donate
            </Link>
            <Link href="/login" className="hover:text-neutral-200">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
