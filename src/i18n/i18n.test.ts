import { describe, expect, it } from 'vitest';
import { categoriesIn } from '@/data/categories';
import { exampleItems } from '@/data/examples';
import { QUESTION_IDS, questionsIn } from '@/data/questions';
import { COPY, LANGUAGES, detectLanguage, manifestFor, resolveLanguage } from './index';
import { en } from './en';
import { it as italian } from './it';

/** Every leaf path of a copy object, with the type of its value. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}:array(${value.length})`];
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => shape(child, `${path}.${key}`));
  }
  return [`${path}:${typeof value}`];
}

describe('copy files', () => {
  it('have the same shape in every language', () => {
    expect(shape(en)).toEqual(shape(italian));
    for (const language of LANGUAGES) {
      expect(COPY[language].lang).toBe(language);
    }
  });

  it('translate every question, category and example', () => {
    for (const language of LANGUAGES) {
      const questions = questionsIn(COPY[language]);
      expect(questions.map((q) => q.id)).toEqual(QUESTION_IDS);
      for (const question of questions) expect(question.text.length).toBeGreaterThan(10);
      expect(categoriesIn(COPY[language]).map((c) => c.id)).toEqual([
        'tech',
        'home',
        'kitchen',
        'clothing',
        'sport',
        'media',
        'health',
        'other',
      ]);
      expect(exampleItems(COPY[language])).toHaveLength(3);
    }
    expect(questionsIn(en).find((q) => q.id === 'own_similar')?.text).toBe(
      'Do you already own something that does the same job?',
    );
    expect(questionsIn(italian).find((q) => q.id === 'own_similar')?.text).toBe(
      'Hai già qualcosa che svolge la stessa funzione?',
    );
  });

  it('gives the examples the same ids, answers and scores in every language', () => {
    const [it, en] = [exampleItems(italian), exampleItems(COPY.en)];
    expect(en.map((x) => x.id)).toEqual(it.map((x) => x.id));
    for (const [index, item] of it.entries()) {
      const other = en[index]!;
      expect(other.result.score).toBe(item.result.score);
      expect(other.answers).toEqual(item.answers);
      expect(other.title).not.toBe(item.title);
    }
  });

  it('keeps the structural strings free of language', () => {
    expect(en.answers).toEqual({ yes: 'Yes', no: 'No', maybe: 'Maybe' });
    expect(en.result.budgetShare(38, '€400.00')).toBe(
      'It costs 38% of your monthly budget of €400.00',
    );
    expect(italian.result.budgetShare(8)).toBe('Costa l’8% del tuo budget mensile');
    expect(italian.result.budgetShare(18)).toBe('Costa il 18% del tuo budget mensile');
  });
});

describe('language choice', () => {
  it('follows the browser: Italian when any preferred language is Italian, English otherwise', () => {
    expect(detectLanguage(['it-IT', 'en'])).toBe('it');
    expect(detectLanguage(['en-US', 'it'])).toBe('it');
    expect(detectLanguage(['it'])).toBe('it');
    expect(detectLanguage(['en-GB'])).toBe('en');
    expect(detectLanguage(['fr-FR', 'de'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('lets the setting win over the browser', () => {
    expect(resolveLanguage('en', ['it-IT'])).toBe('en');
    expect(resolveLanguage('it', ['en-US'])).toBe('it');
    expect(resolveLanguage(null, ['en-US'])).toBe('en');
    expect(resolveLanguage(null, ['it-CH'])).toBe('it');
  });

  it('has one manifest per language', () => {
    expect(manifestFor('it')).toBe('/manifest.webmanifest');
    expect(manifestFor('en')).toBe('/manifest.en.webmanifest');
  });
});
