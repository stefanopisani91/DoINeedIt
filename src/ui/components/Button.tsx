import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { buttonClass, type Size, type Variant } from './button-styles';
import { Icon, Spinner, type IconName } from './Icon';

interface Common {
  variant?: Variant;
  size?: Size;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  className?: string;
}

/** An icon-only control must carry its accessible name: the types enforce it. */
type Labelled =
  | { iconOnly?: false; children: ReactNode }
  | { iconOnly: true; 'aria-label': string; children?: never };

type ButtonProps = Common &
  Labelled & {
    /** Shows a spinner in place of the leading icon and disables the control. */
    loading?: boolean;
    ref?: Ref<HTMLButtonElement>;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

interface Resolved {
  variant: Variant;
  size: Size;
  leadingIcon: IconName | undefined;
  trailingIcon: IconName | undefined;
  iconOnly: boolean;
  loading: boolean;
  className: string;
}

interface Loose {
  variant?: Variant | undefined;
  size?: Size | undefined;
  leadingIcon?: IconName | undefined;
  trailingIcon?: IconName | undefined;
  className?: string | undefined;
  iconOnly?: boolean | undefined;
  loading?: boolean | undefined;
}

function resolve(props: Loose): Resolved {
  return {
    variant: props.variant ?? 'primary',
    size: props.size ?? 'md',
    leadingIcon: props.leadingIcon,
    trailingIcon: props.trailingIcon,
    iconOnly: props.iconOnly ?? false,
    loading: props.loading ?? false,
    className: props.className ?? '',
  };
}

function iconSize(size: Size): 16 | 20 | 24 {
  return size === 'sm' ? 16 : size === 'xl' ? 24 : 20;
}

function content(resolved: Resolved, children: ReactNode): ReactNode {
  const { leadingIcon, trailingIcon, loading, size } = resolved;
  const px = iconSize(size);
  return (
    <>
      {loading ? <Spinner size={px} /> : leadingIcon && <Icon name={leadingIcon} size={px} />}
      {children}
      {trailingIcon && !loading && <Icon name={trailingIcon} size={px} />}
    </>
  );
}

function classes({ variant, size, iconOnly, className }: Resolved): string {
  return buttonClass(variant, size, `${iconOnly ? 'aspect-square px-0' : ''} ${className}`);
}

export function Button(props: ButtonProps) {
  const {
    variant,
    size,
    leadingIcon,
    trailingIcon,
    className,
    iconOnly,
    loading,
    children,
    disabled,
    ...rest
  } = props;
  const resolved = resolve({
    variant,
    size,
    leadingIcon,
    trailingIcon,
    className,
    iconOnly,
    loading,
  });
  return (
    <button
      type="button"
      className={classes(resolved)}
      disabled={disabled || resolved.loading}
      aria-busy={resolved.loading || undefined}
      {...rest}
    >
      {content(resolved, children)}
    </button>
  );
}

type ButtonLinkProps = Common & Labelled & Omit<LinkProps, 'children'>;

export function ButtonLink(props: ButtonLinkProps) {
  const { variant, size, leadingIcon, trailingIcon, className, iconOnly, children, ...rest } =
    props;
  const resolved = resolve({ variant, size, leadingIcon, trailingIcon, className, iconOnly });
  return (
    <Link className={classes(resolved)} {...rest}>
      {content(resolved, children)}
    </Link>
  );
}

type ButtonAnchorProps = Common &
  Labelled & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'>;

/** An external link styled as a button: opens in a new tab and says so with its icon. */
export function ButtonAnchor(props: ButtonAnchorProps) {
  const {
    variant,
    size,
    leadingIcon,
    trailingIcon = 'external',
    className,
    iconOnly,
    children,
    ...rest
  } = props;
  const resolved = resolve({ variant, size, leadingIcon, trailingIcon, className, iconOnly });
  return (
    <a target="_blank" rel="noopener noreferrer" className={classes(resolved)} {...rest}>
      {content(resolved, children)}
    </a>
  );
}
