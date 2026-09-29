import { useEffect } from 'react';
import type { Answer, Question } from '@/engine';
import { useCopy } from '@/i18n';
import { buttonClass, type Variant } from './button-styles';
import { Surface } from './Surface';

interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: Answer) => void;
  /** Backspace goes back to the previous question, when there is one. */
  onUndo?: (() => void) | undefined;
}

const OPTIONS: Array<{ answer: Answer; key: string; variant: Variant }> = [
  { answer: 'yes', key: '1', variant: 'primary' },
  { answer: 'no', key: '2', variant: 'secondary' },
  { answer: 'maybe', key: '3', variant: 'soft' },
];

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return !!element && ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

export function QuestionCard({ question, onAnswer, onUndo }: QuestionCardProps) {
  const copy = useCopy();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (event.key === 'Backspace' && onUndo) {
        event.preventDefault();
        onUndo();
        return;
      }
      const option = OPTIONS.find((o) => o.key === event.key);
      if (option) {
        event.preventDefault();
        onAnswer(option.answer);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAnswer, onUndo]);

  return (
    <Surface key={question.id} padding="lg" className="animate-fade-up">
      {/* Only the question is announced: the answer buttons never change. */}
      <div aria-live="polite">
        <p className="eyebrow">
          {copy.questionnaire.dimensionOf(copy.dimensions[question.dimension])}
        </p>
        <h2 className="mt-2 text-2xl leading-snug font-bold tracking-tight sm:text-3xl">
          {question.text}
        </h2>
        {question.hint && <p className="mt-3 text-base text-ink-muted">{question.hint}</p>}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3" role="group" aria-label={copy.answers.yes}>
        {OPTIONS.map((option) => (
          <button
            key={option.answer}
            type="button"
            onClick={() => onAnswer(option.answer)}
            aria-keyshortcuts={option.key}
            className={buttonClass(option.variant, 'xl')}
          >
            {copy.answers[option.answer]}
            <span
              className="ml-1 hidden text-xs font-normal opacity-60 sm:inline"
              aria-hidden="true"
            >
              {option.key}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 hidden text-xs text-ink-faint sm:block">{copy.questionnaire.shortcuts}</p>
    </Surface>
  );
}
