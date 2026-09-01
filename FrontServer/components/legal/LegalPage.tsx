type Props = {
  title: string;
  updated: string;
  children: React.ReactNode;
};

export default function LegalPage({ title, updated, children }: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">시행일 {updated}</p>
      <article className="prose-legal mt-8 space-y-6 text-sm leading-relaxed">
        {children}
      </article>
    </main>
  );
}
