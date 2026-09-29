import { it } from '@/i18n/it';
import { ButtonLink } from '../components/Button';

export function NotFoundPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">{it.notFound.title}</h1>
      <ButtonLink to="/">{it.notFound.back}</ButtonLink>
    </div>
  );
}
