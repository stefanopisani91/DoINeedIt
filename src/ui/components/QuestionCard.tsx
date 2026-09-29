import { useEffect } from 'react';
import type { Answer, Question } from '@/engine';
import { it } from '@/i18n/it';

interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: Answer) => void;
}

const OPTIONS: Array<{ answer: Answer; key: string; className: string }> = [
  {
    answer: 'yes',
    key: '1',
    className:
      'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-500 dark:text-stone-950 dark:hover:bg-brand-200',
  },
  {
    answer: 'no',
    key: '2',
    className:
      'bg-white text-stone-900 ring-1 ring-stone-300 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700 dark:hover:bg-stone-800',
  },
  {
    answer: 'maybe',
    key: '3',
    className:
      'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700',
  },
];

export function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      const option = OPTIONS.find((o) => o.key === event.key);
      if (option) {
        event.preventDefault();
        onAnswer(option.answer);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAnswer]);

  return (
    <section
      key={question.id}
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8 dark:bg-stone-900 dark:ring-stone-800"
      aria-live="polite"
    >
      <h2 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
        {question.text}
      </h2>
      {question.hint && (
        <p className="mt-3 text-base text-stone-600 dark:text-stone-400">{question.hint}</p>
      )}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.answer}
            type="button"
            onClick={() => onAnswer(option.answer)}
            className={`min-h-16 rounded-2xl text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950 ${option.className}`}
          >
            {it.answers[option.answer]}
            <span
              className="ml-2 hidden text-xs font-normal opacity-60 sm:inline"
              aria-hidden="true"
            >
              {option.key}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 hidden text-xs text-stone-500 sm:block dark:text-stone-400">
        {it.questionnaire.shortcuts}
      </p>
    </section>
  );
}
