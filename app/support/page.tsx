import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support Sentinel CAD/MDT",
  description:
    "Support Sentinel CAD/MDT with a one-time donation while subscription tiers are under construction.",
};

const donationCheckoutUrl = process.env.NEXT_PUBLIC_DONATION_URL?.trim();
const donationReady = Boolean(donationCheckoutUrl);

const donationTiers = [
  {
    amount: 5,
    title: "Coffee Run",
    description: "Covers small tooling costs and keeps the next patch moving.",
    impact: "Good for quick fixes, UI polish, and test deployments.",
  },
  {
    amount: 15,
    title: "Server Assist",
    description: "Helps carry hosting, storage, and auth costs for the CAD.",
    impact: "Good for keeping public routes fast and reliable.",
  },
  {
    amount: 30,
    title: "Dispatch Boost",
    description: "Funds bigger work like dispatch workflows and MDT upgrades.",
    impact: "Good for features that touch officers, dispatchers, and admins.",
  },
  {
    amount: 50,
    title: "Community Builder",
    description: "Backs larger roadmap items and long-form maintenance work.",
    impact: "Good for sustained development and production hardening.",
  },
];

const fundingUses = [
  "Hosting, database, and authentication costs",
  "Dispatch, officer, civilian, and admin workflow improvements",
  "Security reviews, bug fixes, and maintenance time",
  "Future quality-of-life tools for FiveM roleplay communities",
];

const subscriptionTiers = [
  {
    name: "Supporter",
    price: "$5/mo",
    description: "Monthly community backing with basic supporter recognition.",
  },
  {
    name: "Patron",
    price: "$15/mo",
    description: "Planned recurring support tier for active community members.",
  },
  {
    name: "Sponsor",
    price: "$30/mo",
    description: "Planned recurring support tier for departments and partners.",
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

export default function SupportPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md border border-sky-400/40 bg-sky-400/10 text-sm font-bold text-sky-200">
            SC
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-neutral-400">
              Sentinel
            </span>
            <span className="block text-lg font-semibold text-white">Support</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-3 text-sm text-neutral-300 sm:flex">
          <Link href="/" className="rounded-md px-3 py-2 hover:bg-white/10">
            Home
          </Link>
          <Link href="/login" className="rounded-md px-3 py-2 hover:bg-white/10">
            Login
          </Link>
          <Link
            href="/cad"
            className="inline-flex items-center gap-2 rounded-md bg-sky-400 px-4 py-2 font-semibold text-neutral-950 hover:bg-sky-300"
          >
            Dashboard <ArrowIcon />
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center gap-10 px-6 pb-14 pt-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="mb-5 inline-flex rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-200">
              Community-funded CAD/MDT development
            </p>
            <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Support Sentinel CAD/MDT
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
              One-time donations help keep the platform online, cover services,
              and fund the features that make dispatch, officer, civilian, and
              admin workflows better for the whole FiveM community.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <DonateButton variant="primary">Donate now</DonateButton>
              <Link
                href="#subscriptions"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Subscription status <ArrowIcon />
              </Link>
            </div>
          </div>

          <div
            id="donation-checkout"
            className="rounded-lg border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/40"
          >
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Donations
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Choose a one-time amount
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
                    Open the secure checkout and enter any amount that fits.
                  </p>
                </div>
                <DonateButton variant="secondary">Open checkout</DonateButton>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-neutral-900/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
                Funding priorities
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Every donation backs the work people actually use.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fundingUses.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/10 bg-neutral-950/60 p-4"
                >
                  <span className="mb-4 block size-2 rounded-full bg-sky-300" />
                  <p className="text-sm leading-6 text-neutral-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="subscriptions" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
                Subscriptions
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Monthly tiers are under construction.
              </h2>
              <p className="mt-4 max-w-3xl leading-7 text-neutral-300">
                Subscription perks, recurring billing, and supporter management
                are planned for a later release. One-time donations are the live
                support path right now.
              </p>
            </div>
            <span className="inline-flex min-h-10 items-center rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-200">
              Under construction
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {subscriptionTiers.map((tier) => (
              <article
                key={tier.name}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5 opacity-80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                    <p className="mt-2 text-2xl font-semibold text-neutral-300">
                      {tier.price}
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-300/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                    Soon
                  </span>
                </div>
                <p className="mt-4 min-h-18 text-sm leading-6 text-neutral-400">
                  {tier.description}
                </p>
                <span className="mt-5 inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-neutral-500">
                  Not available yet
                </span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-sm text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Sentinel CAD/MDT donations support infrastructure and development.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-neutral-200">
              Home
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
