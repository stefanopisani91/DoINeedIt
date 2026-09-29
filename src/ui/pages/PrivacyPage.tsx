import { useCopy } from '@/i18n';

export function PrivacyPage() {
  const copy = useCopy();
  return (
    <article className="prose-sm max-w-none space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.privacy.title}</h1>
      {copy.privacy.sections.map((section) => (
        <section
          key={section.heading}
          className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
        >
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {section.body}
          </p>
        </section>
      ))}
    </article>
  );
}
