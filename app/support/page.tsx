import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Donate | Sentinel Community CAD/MDT",
  description:
    "Support the Sentinel FiveM community with donations for CAD hosting, server tools, and ongoing development.",
};

const donationCheckoutUrl = process.env.NEXT_PUBLIC_DONATION_URL?.trim();
const donationReady = Boolean(donationCheckoutUrl);
const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL?.trim();
const discordHref = discordUrl || "/#community-discord";

const donationTiers = [
  {
    amount: 5,
    title: "Fuel Stop",
    description: "A small boost toward hosting, database usage, and routine CAD upkeep.",
    impact: "Helps keep the day-to-day systems moving.",
  },
  {
    amount: 15,
    title: "Patrol Assist",
    description: "Supports server tools, auth services, and the features members use most.",
    impact: "Good for steady maintenance and quick quality-of-life fixes.",
  },
  {
    amount: 30,
    title: "Dispatch Boost",
    description: "Backs larger CAD/MDT improvements for dispatch, patrol, civilian, and staff workflows.",
    impact: "Good for meaningful feature work across departments.",
  },
  {
    amount: 50,
    title: "Community Builder",
    description: "Helps fund bigger upgrades, production polish, and long-running upkeep.",
    impact: "Good for larger roadmap items and reliability work.",
  },
];

const fundingUses = [
  "CAD/MDT hosting, database, and authentication costs",
  "Community server tools, reliability work, and monitoring",
  "Dispatch, officer, civilian, and admin workflow improvements",
  "Bug fixes, security cleanup, and staff quality-of-life tools",
];

const supporterNotes = [
  {
    title: "Donations stay community-focused",
    description:
      "Support goes toward the systems our members actually use, not toward packaging this CAD for other servers.",
  },
  {
    title: "Recognition happens in Discord",
    description:
      "If supporter shoutouts or roles are enabled, staff will coordinate them through the community Discord.",
  },
  {
    title: "Access is still staff-managed",
    description:
      "Donating helps the community, but CAD permissions and department roles still follow the normal approval process.",
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

function HeartIcon() {
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
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"
      />
    </svg>
  );
}

function getDonationHref(amount?: number) {
  if (!donationCheckoutUrl) {
    return "#donation-checkout";
  }

  if (amount && donationCheckoutUrl.includes("{amount}")) {
    return donationCheckoutUrl.replaceAll("{amount}", String(amount));
  }

  return donationCheckoutUrl;
}

type DonateButtonProps = {
  amount?: number;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

function DonateButton({ amount, children, variant = "primary" }: DonateButtonProps) {
  const baseClasses =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition";
  const variantClasses =
    variant === "primary"
      ? "bg-emerald-300 text-neutral-950 hover:bg-emerald-200"
      : "border border-white/15 text-white hover:bg-white/10";

  if (!donationReady) {
    return (
      <span
        aria-disabled="true"
        className={`${baseClasses} cursor-not-allowed border border-white/10 bg-white/5 text-neutral-500`}
      >
        Checkout pending
      </span>
    );
  }

  return (
    <a
      href={getDonationHref(amount)}
      className={`${baseClasses} ${variantClasses}`}
      target="_blank"
      rel="noreferrer"
    >
      {children} <ArrowIcon />
    </a>
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

export default function SupportPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#08090d] text-neutral-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md border border-emerald-300/35 bg-emerald-300/10 text-sm font-bold text-emerald-100">
            SC
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase text-neutral-400">
              Sentinel Community
            </span>
            <span className="block text-lg font-semibold text-white">Donations</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-3 text-sm text-neutral-300 sm:flex">
          <Link href="/" className="rounded-md px-3 py-2 hover:bg-white/10">
            Home
          </Link>
          <CommunityLink href={discordHref} className="rounded-md px-3 py-2 hover:bg-white/10">
            Discord
          </CommunityLink>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-cyan-300 px-4 py-2 font-semibold text-neutral-950 hover:bg-cyan-200"
          >
            CAD login <ArrowIcon />
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center gap-10 px-6 pb-14 pt-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="mb-5 inline-flex rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-200">
              Support our FiveM community
            </p>
            <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Help keep the CAD and community tools online.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
              Donations help pay for the systems behind our roleplay server:
              CAD/MDT hosting, database usage, authentication, staff tools, and
              ongoing development for our members.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <DonateButton variant="primary">Donate now</DonateButton>
              <CommunityLink
                href={discordHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Visit Discord <ArrowIcon />
              </CommunityLink>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-500">
              Donations are optional and do not purchase CAD access, rank,
              department placement, or staff permissions.
            </p>
          </div>

          <div
            id="donation-checkout"
            className="rounded-lg border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/40"
          >
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-emerald-300">
                  One-time donations
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Pick an amount that feels right
                </h2>
              </div>
              <span
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  donationReady
                    ? "bg-emerald-300/10 text-emerald-200"
                    : "bg-amber-300/10 text-amber-200"
                }`}
              >
                {donationReady ? "Checkout ready" : "Checkout pending"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {donationTiers.map((tier) => (
                <article
                  key={tier.title}
                  className="rounded-lg border border-white/10 bg-neutral-950/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-3xl font-semibold text-white">${tier.amount}</p>
                      <h3 className="mt-2 font-semibold text-white">{tier.title}</h3>
                    </div>
                    <span className="grid size-10 place-items-center rounded-md bg-emerald-300/10 text-emerald-200">
                      <HeartIcon />
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">
                    {tier.description}
                  </p>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-neutral-500">
                    {tier.impact}
                  </p>
                  <div className="mt-4">
                    <DonateButton amount={tier.amount}>
                      Donate ${tier.amount}
                    </DonateButton>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-white">Custom amount</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-400">
                    Open checkout and enter any amount that works for you.
                  </p>
                </div>
                <DonateButton variant="secondary">Open checkout</DonateButton>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-neutral-900/70">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-cyan-300">
                Funding priorities
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Donations go back into the server experience.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fundingUses.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/10 bg-neutral-950/60 p-4"
                >
                  <span className="mb-4 block size-2 rounded-full bg-cyan-300" />
                  <p className="text-sm leading-6 text-neutral-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase text-indigo-300">
              Community notes
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">
              Support is appreciated, but the community process stays the same.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {supporterNotes.map((note) => (
              <article
                key={note.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <h3 className="text-lg font-semibold text-white">{note.title}</h3>
                <p className="mt-4 text-sm leading-6 text-neutral-400">
                  {note.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-sm text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Sentinel Community donations support our CAD, tools, and server operations.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-neutral-200">
              Home
            </Link>
            <CommunityLink href={discordHref} className="hover:text-neutral-200">
              Discord
            </CommunityLink>
            <Link href="/login" className="hover:text-neutral-200">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
