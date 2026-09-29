import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { buttonClass, type Size, type Variant } from './button-styles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
