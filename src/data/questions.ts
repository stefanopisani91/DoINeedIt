import type { Answer, CategoryId, Dimension, Polarity, Question, Stage, Weight } from '@/engine';
import type { Copy, QuestionCopy } from '@/i18n/it';
import { it } from '@/i18n/it';

/**
 * The question bank. Order matters: within a stage, questions are asked in
 * this order (category-specific ones first), and a follow-up should be
 * declared right after the question it depends on.
 *
 * The texts live in the copy files (`src/i18n`), one per language; here are
 * ids, weights and rules, which the engine reads and which never change with
 * the language.
 *
 * polarity 'need'  → "yes" makes the purchase more necessary
 * polarity 'skip'  → "yes" makes the purchase less necessary
 */
interface QuestionDefinition {
  readonly id: string;
  readonly dimension: Dimension;
  readonly stage: Stage;
  readonly weight: Weight;
  readonly polarity: Polarity;
  readonly categories?: readonly CategoryId[];
  readonly showIf?: { readonly questionId: string; readonly answers: readonly Answer[] };
}

const DEFINITIONS = [
  // ───────────── Stage 1: core questions, asked to everyone ─────────────
  { id: 'own_similar', dimension: 'utility', stage: 1, weight: 3, polarity: 'skip' },
  {
    id: 'own_works',
    dimension: 'utility',
    stage: 1,
    weight: 3,
    polarity: 'skip',
    showIf: { questionId: 'own_similar', answers: ['yes', 'maybe'] },
  },
  {
    id: 'new_different',
    dimension: 'utility',
    stage: 1,
    weight: 2,
    polarity: 'need',
    showIf: { questionId: 'own_similar', answers: ['yes'] },
  },
  { id: 'concrete_need', dimension: 'utility', stage: 1, weight: 3, polarity: 'need' },
  { id: 'weekly_use', dimension: 'utility', stage: 1, weight: 2, polarity: 'need' },
  { id: 'problem_soon', dimension: 'urgency', stage: 1, weight: 2, polarity: 'need' },
  { id: 'impulse_today', dimension: 'impulse', stage: 1, weight: 2, polarity: 'skip' },
  { id: 'budget_sacrifice', dimension: 'budget', stage: 1, weight: 3, polarity: 'skip' },

  // ───────────── Stage 2: category-specific deepening ─────────────
  {
    id: 'tech_unsupported',
    dimension: 'urgency',
    stage: 2,
    weight: 3,
    polarity: 'need',
    categories: ['tech'],
  },
  {
    id: 'tech_daily_diff',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'need',
    categories: ['tech'],
  },
  {
    id: 'tech_extra_costs',
    dimension: 'alternatives',
    stage: 2,
    weight: 1,
    polarity: 'skip',
    categories: ['tech'],
  },
  {
    id: 'home_daily_annoy',
    dimension: 'utility',
    stage: 2,
    weight: 3,
    polarity: 'need',
    categories: ['home'],
  },
  {
    id: 'home_prettier',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'skip',
    categories: ['home'],
  },
  {
    id: 'home_special_only',
    dimension: 'utility',
    stage: 2,
    weight: 1,
    polarity: 'skip',
    categories: ['home'],
  },
  {
    id: 'kitchen_frequency',
    dimension: 'utility',
    stage: 2,
    weight: 3,
    polarity: 'need',
    categories: ['kitchen'],
  },
  {
    id: 'kitchen_same_result',
    dimension: 'alternatives',
    stage: 2,
    weight: 3,
    polarity: 'skip',
    categories: ['kitchen'],
  },
  {
    id: 'kitchen_reach',
    dimension: 'utility',
    stage: 2,
    weight: 1,
    polarity: 'need',
    categories: ['kitchen'],
  },
  {
    id: 'clothing_similar',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'skip',
    categories: ['clothing'],
  },
  {
    id: 'clothing_combos',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'need',
    categories: ['clothing'],
  },
  {
    id: 'clothing_one_event',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'skip',
    categories: ['clothing'],
  },
  {
    id: 'sport_consistent',
    dimension: 'utility',
    stage: 2,
    weight: 3,
    polarity: 'need',
    categories: ['sport'],
  },
  {
    id: 'sport_limit',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'need',
    categories: ['sport'],
  },
  {
    id: 'sport_try_first',
    dimension: 'alternatives',
    stage: 2,
    weight: 2,
    polarity: 'skip',
    categories: ['sport'],
  },
  {
    id: 'media_backlog',
    dimension: 'impulse',
    stage: 2,
    weight: 2,
    polarity: 'skip',
    categories: ['media'],
  },
  {
    id: 'media_library',
    dimension: 'alternatives',
    stage: 2,
    weight: 3,
    polarity: 'skip',
    categories: ['media'],
  },
  {
    id: 'media_this_month',
    dimension: 'urgency',
    stage: 2,
    weight: 2,
    polarity: 'need',
    categories: ['media'],
  },
  {
    id: 'health_professional',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'need',
    categories: ['health'],
  },
  {
    id: 'health_finishing',
    dimension: 'utility',
    stage: 2,
    weight: 2,
    polarity: 'skip',
    categories: ['health'],
  },
  {
    id: 'health_reviews',
    dimension: 'alternatives',
    stage: 2,
    weight: 1,
    polarity: 'need',
    categories: ['health'],
  },

  // ───────────── Stage 2: generic deepening ─────────────
  { id: 'local_cheaper', dimension: 'alternatives', stage: 2, weight: 2, polarity: 'skip' },
  { id: 'borrow_rent_used', dimension: 'alternatives', stage: 2, weight: 2, polarity: 'skip' },
  { id: 'replace_broken', dimension: 'urgency', stage: 2, weight: 3, polarity: 'need' },
  { id: 'budget_month_spent', dimension: 'budget', stage: 2, weight: 2, polarity: 'skip' },
  { id: 'budget_regret', dimension: 'budget', stage: 2, weight: 2, polarity: 'skip' },
  { id: 'wanted_before', dimension: 'impulse', stage: 2, weight: 2, polarity: 'need' },
  { id: 'full_price_later', dimension: 'impulse', stage: 2, weight: 2, polarity: 'need' },

  // ───────────── Stage 3: tie-break ─────────────
  { id: 'wait_30_days', dimension: 'impulse', stage: 3, weight: 3, polarity: 'need' },
  { id: 'recommend_friend', dimension: 'utility', stage: 3, weight: 2, polarity: 'need' },
  { id: 'pay_30_more', dimension: 'utility', stage: 3, weight: 2, polarity: 'need' },
] as const satisfies readonly QuestionDefinition[];

export type QuestionId = (typeof DEFINITIONS)[number]['id'];

export const QUESTION_IDS: readonly QuestionId[] = DEFINITIONS.map((d) => d.id);

/** The question bank with its texts in the given language. */
export function questionsIn(copy: Copy): Question[] {
  return DEFINITIONS.map((entry) => {
    const definition: QuestionDefinition = entry;
    const { text, hint }: QuestionCopy = copy.questions[entry.id];
    const question: Question = {
      id: definition.id,
      text,
      dimension: definition.dimension,
      stage: definition.stage,
      weight: definition.weight,
      polarity: definition.polarity,
    };
    if (hint) question.hint = hint;
    if (definition.categories) question.categories = [...definition.categories];
    if (definition.showIf) {
      question.showIf = {
        questionId: definition.showIf.questionId,
        answers: [...definition.showIf.answers],
      };
    }
    return question;
  });
}

/** The question bank in Italian, the app's first language. */
export const QUESTIONS: Question[] = questionsIn(it);

export function questionById(id: string, questions: Question[] = QUESTIONS): Question | undefined {
  return questions.find((q) => q.id === id);
}
