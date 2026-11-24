import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Input.css';

export default function Input({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error = '',
  helperText = '',
  icon = null,
  rightIcon = null,
  disabled = false,
  required = false,
  className = '',
  id,
  name,
  autoComplete,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`input-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}

      <div className="input-field-wrapper">
        {icon && <span className="input-icon-left">{icon}</span>}

        <input
          id={inputId}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`input-element ${icon ? 'has-left-icon' : ''} ${isPassword || rightIcon ? 'has-right-icon' : ''}`}
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            className="input-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : rightIcon ? (
          <span className="input-icon-right">{rightIcon}</span>
        ) : null}
      </div>

      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}
