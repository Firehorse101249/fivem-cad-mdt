import Link from "next/link";

type UnderConstructionProps = {
  title: string;
  description?: string;
};

export function UnderConstruction({ title, description }: UnderConstructionProps) {
  return (
    <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">
            Under Construction
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-4 leading-7 text-neutral-300">
            {description ??
              "This CAD/MDT section is planned, but the full workflow has not been built yet."}
          </p>
          <p className="mt-3 text-sm text-neutral-400">
            The route is intentionally present so users land on a clear status
            message instead of a broken or blank page.
          </p>
        </div>
        <Link
          href="/cad"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-200"
        >
          Back to CAD
        </Link>
      </div>
    </section>
  );
}
