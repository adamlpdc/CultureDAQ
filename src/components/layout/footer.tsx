export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">
              Culture<span className="text-accent">DAQ</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              A fantasy cultural stock market game. For fun only.
            </p>
          </div>
          <div className="text-sm text-muted">
            <p>DAQ is fictional virtual currency with no real-world value.</p>
            <p className="mt-1">
              Not real-money trading, investing, gambling, or a financial product.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
