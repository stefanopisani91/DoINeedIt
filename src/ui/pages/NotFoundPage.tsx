import { useCopy } from '@/i18n';
import { ButtonLink } from '../components/Button';
import { Logo } from '../components/Logo';

export function NotFoundPage() {
  const copy = useCopy();
  return (
    <div className="mx-auto max-w-md space-y-6 py-8 text-center">
      <Logo size={96} className="mx-auto opacity-80" />
      <div>
        <h1 className="text-title font-bold">{copy.notFound.title}</h1>
        <p className="mt-2 text-ink-muted">{copy.notFound.body}</p>
      </div>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink to="/" leadingIcon="arrow-left">
          {copy.notFound.back}
        </ButtonLink>
        <ButtonLink to="/new" variant="secondary" leadingIcon="plus">
          {copy.notFound.new}
        </ButtonLink>
      </div>
    </div>
  );
}
