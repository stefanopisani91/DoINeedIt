import { useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { exampleItems } from '@/data/examples';
import { ENGINE_VERSION } from '@/engine';
import { LANGUAGES, isLanguage, useCopy } from '@/i18n';
import { formatPrice, parsePriceInput } from '@/lib/format';
import { buildCsv, exportCsvFileName } from '@/storage/csv';
import { buildExport, exportFileName, parseImport } from '@/storage/export';
import { useSettingsStore, type Theme } from '@/storage/settings';
import { useItemsStore } from '@/storage/store';
import { Button, ButtonAnchor } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Field, Input, Select } from '../components/Field';
import { Icon, type IconName } from '../components/Icon';
import { Notice } from '../components/Notice';
import { Surface } from '../components/Surface';
import { useInstallPrompt } from '../use-install-prompt';

const REPOSITORY_URL = 'https://github.com/stefanopisani91/DoINeedIt';

type ThemeChoice = Theme | 'system';

const THEME_CHOICES: Array<{ value: ThemeChoice; icon: IconName }> = [
  { value: 'system', icon: 'monitor' },
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
];

/** A settings block: title and description on the left, controls on the right from `sm:`. */
function Section({
  icon,
  title,
  body,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Surface aria-labelledby={id} className="sm:grid sm:grid-cols-[12rem_1fr] sm:gap-8">
      <div className="mb-4 sm:mb-0">
        <h2 id={id} className="flex items-center gap-2 text-heading font-semibold">
          <Icon name={icon} size={20} className="text-brand-700 dark:text-brand-300" />
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{body}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </Surface>
  );
}

export function SettingsPage() {
  const copy = useCopy();
  const items = useItemsStore((state) => state.items);
  const merge = useItemsStore((state) => state.merge);
  const clear = useItemsStore((state) => state.clear);
  const budget = useSettingsStore((state) => state.budget);
  const setBudget = useSettingsStore((state) => state.setBudget);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const fileInput = useRef<HTMLInputElement>(null);
  const installPrompt = useInstallPrompt();
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [budgetInput, setBudgetInput] = useState(() =>
    budget ? String(budget.amount).replace('.', copy.lang === 'it' ? ',' : '.') : '',
  );

  const themeLabels: Record<ThemeChoice, string> = {
    system: copy.settings.themeSystem,
    light: copy.settings.themeLight,
    dark: copy.settings.themeDark,
  };

  const saveBudget = (event: FormEvent) => {
    event.preventDefault();
    const amount = parsePriceInput(budgetInput);
    if (amount === null || amount <= 0) {
      setMessage({ tone: 'error', text: copy.settings.budgetInvalid });
      return;
    }
    const next = { amount, currency: 'EUR' };
    setBudget(next);
    setMessage({
      tone: 'success',
      text: copy.settings.budgetSaved(formatPrice(next.amount, next.currency, copy.locale)),
    });
  };

  const removeBudget = () => {
    setBudget(null);
    setBudgetInput('');
    setMessage({ tone: 'success', text: copy.settings.budgetRemoved });
  };

  const download = (content: string, type: string, name: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportFile = () =>
    download(JSON.stringify(buildExport(items), null, 2), 'application/json', exportFileName());

  const exportCsv = () =>
    download(buildCsv(items, copy), 'text/csv;charset=utf-8', exportCsvFileName());

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const outcome = parseImport(await file.text());
    if (!outcome.ok) {
      setMessage({ tone: 'error', text: copy.settings.importError[outcome.reason] });
      return;
    }
    const added = merge(outcome.items);
    setMessage({ tone: 'success', text: copy.settings.imported(added, outcome.skipped) });
  };

  const loadExamples = () => {
    const added = merge(exampleItems(copy));
    setMessage({ tone: 'success', text: copy.settings.examplesLoaded(added) });
  };

  const clearAll = () => {
    setClearing(false);
    clear();
    setMessage({ tone: 'success', text: copy.settings.cleared });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-title font-bold">{copy.settings.title}</h1>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Section icon="sun" title={copy.settings.themeTitle} body={copy.settings.themeBody}>
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">{copy.settings.themeLabel}</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {THEME_CHOICES.map((choice) => {
              const selected = (theme ?? 'system') === choice.value;
              return (
                <label
                  key={choice.value}
                  className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control px-3 text-sm font-medium ring-1 transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${
                    selected
                      ? 'bg-brand-100 text-brand-900 ring-brand-500 dark:bg-brand-900/60 dark:text-brand-100'
                      : 'bg-surface ring-line-strong hover:bg-surface-sunken'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={choice.value}
                    checked={selected}
                    onChange={() => setTheme(choice.value === 'system' ? null : choice.value)}
                    className="sr-only"
                  />
                  <Icon name={choice.icon} size={16} />
                  {themeLabels[choice.value]}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      <Section icon="link" title={copy.settings.languageTitle} body={copy.settings.languageBody}>
        <Field id="language" label={copy.settings.languageLabel} className="sm:max-w-xs">
          <Select
            id="language"
            value={language ?? 'auto'}
            onChange={(event) => {
              const value = event.target.value;
              setLanguage(isLanguage(value) ? value : null);
            }}
          >
            <option value="auto">{copy.settings.languageAuto}</option>
            {LANGUAGES.map((code) => (
              <option key={code} value={code} lang={code}>
                {copy.settings.languageNames[code]}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section icon="wallet" title={copy.settings.budgetTitle} body={copy.settings.budgetBody}>
        <p className="text-sm text-ink-faint">
          {budget
            ? copy.settings.budgetCurrent(formatPrice(budget.amount, budget.currency, copy.locale))
            : copy.settings.budgetNone}
        </p>
        <form onSubmit={saveBudget} className="flex flex-wrap items-end gap-3">
          <Field id="budget" label={copy.settings.budgetLabel} className="flex-1 basis-40">
            <Input
              id="budget"
              type="text"
              inputMode="decimal"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              placeholder={copy.settings.budgetPlaceholder}
            />
          </Field>
          <Button type="submit">{copy.settings.budgetSave}</Button>
          {budget && (
            <Button type="button" variant="secondary" onClick={removeBudget}>
              {copy.settings.budgetRemove}
            </Button>
          )}
        </form>
      </Section>

      <Section icon="download" title={copy.settings.dataTitle} body={copy.settings.dataBody}>
        <p className="text-sm text-ink-faint">{copy.home.count(items.length)}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            leadingIcon="download"
            onClick={exportFile}
            disabled={items.length === 0}
          >
            {copy.settings.export}
          </Button>
          <Button
            variant="secondary"
            leadingIcon="download"
            onClick={exportCsv}
            disabled={items.length === 0}
          >
            {copy.settings.exportCsv}
          </Button>
          <Button
            variant="secondary"
            leadingIcon="upload"
            onClick={() => fileInput.current?.click()}
          >
            {copy.settings.import}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importFile}
            aria-label={copy.settings.import}
          />
          <Button variant="secondary" leadingIcon="sparkle" onClick={loadExamples}>
            {copy.settings.examples}
          </Button>
          <Button
            variant="danger"
            leadingIcon="trash"
            onClick={() => setClearing(true)}
            disabled={items.length === 0}
          >
            {copy.settings.clear}
          </Button>
        </div>
        <p className="text-xs text-ink-faint">{copy.settings.dataHint}</p>
      </Section>

      <Section icon="download" title={copy.settings.installTitle} body={copy.settings.installBody}>
        {installPrompt.installed ? (
          <p className="text-sm text-ink-faint">{copy.settings.installed}</p>
        ) : installPrompt.canInstall ? (
          <Button leadingIcon="download" onClick={() => void installPrompt.install()}>
            {copy.settings.install}
          </Button>
        ) : installPrompt.ios ? (
          <p className="text-sm text-ink-faint">{copy.settings.installIos}</p>
        ) : null}
      </Section>

      <Section icon="info" title={copy.settings.infoTitle} body={copy.settings.aboutBody}>
        <p className="text-sm text-ink-faint tabular-nums">
          {copy.settings.version(__APP_VERSION__, ENGINE_VERSION)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/privacy"
            className="text-sm font-medium underline underline-offset-4 hover:text-brand-700"
          >
            {copy.settings.privacy}
          </Link>
          <ButtonAnchor href={REPOSITORY_URL} variant="ghost" size="sm">
            {copy.settings.source}
          </ButtonAnchor>
        </div>
      </Section>

      <ConfirmDialog
        open={clearing}
        title={copy.settings.clearTitle}
        body={copy.settings.clearConfirm}
        confirmLabel={copy.settings.clearYes}
        cancelLabel={copy.settings.clearNo}
        tone="danger"
        onConfirm={clearAll}
        onCancel={() => setClearing(false)}
      />
    </div>
  );
}
