import { Link } from 'react-router-dom';
import { useCopy } from '@/i18n';
import { Icon } from '../components/Icon';
import { Surface } from '../components/Surface';

export function PrivacyPage() {
  const copy = useCopy();
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-title font-bold">{copy.privacy.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-ink-muted">
          <Icon name="check" size={20} className="text-brand-700 dark:text-brand-300" />
          {copy.privacy.intro}
        </p>
      </header>
      {copy.privacy.sections.map((section) => (
        <Surface key={section.heading}>
          <h2 className="text-heading font-semibold">{section.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{section.body}</p>
        </Surface>
      ))}
      <p className="text-sm text-ink-faint">
        <Link to="/settings" className="underline underline-offset-4 hover:text-ink">
          {copy.settings.dataTitle}
        </Link>
      </p>
    </article>
  );
}
