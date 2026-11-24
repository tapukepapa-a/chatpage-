import React from 'react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost', 'icon', 'danger'
  size = 'md', // 'sm', 'md', 'lg'
  fullWidth = false,
  isLoading = false,
  icon = null,
  rightIcon = null,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${isLoading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading ? (
        <span className="btn-spinner" />
      ) : (
        <>
          {icon && <span className="btn-icon-start">{icon}</span>}
          {children && <span className="btn-text">{children}</span>}
          {rightIcon && <span className="btn-icon-end">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
