export default function SiteFooter() {
  return (
    <footer className="bg-card border-t border-border mt-16 py-8 text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="heading-display text-lg text-primary tracking-widest">JMECPS</span>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          {new Date().getFullYear()} JMECPS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
