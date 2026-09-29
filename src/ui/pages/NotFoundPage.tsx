import { useCopy } from '@/i18n';
import { ButtonLink } from '../components/Button';

export function NotFoundPage() {
  const copy = useCopy();
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">{copy.notFound.title}</h1>
      <ButtonLink to="/">{copy.notFound.back}</ButtonLink>
    </div>
  );
}
