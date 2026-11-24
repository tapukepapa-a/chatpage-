import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, MessageSquare, AlertCircle, ShieldCheck } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import './Auth.css';

export default function LoginPage({ onLogin, onSwitchToRegister, registrationStatus }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Registered email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      await onLogin({
        email: formData.email.trim(),
        password: formData.password
      });
    } catch (err) {
      setServerError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRegistrationClosed = registrationStatus && registrationStatus.registrationOpen === false;

  return (
    <div className="auth-page-container">
      <div className="auth-bg-glow-1" />
      <div className="auth-bg-glow-2" />

      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-emblem">
            <MessageSquare size={26} />
          </div>
          <h1 className="auth-title">Just Us</h1>
          <p className="auth-subtitle">
            Sign in to your private chat account.
          </p>
          {registrationStatus && (
            <span className="auth-registration-status-tag">
              <ShieldCheck size={13} />
              {isRegistrationClosed
                ? 'Sanctuary Established (2/2 Accounts)'
                : `${registrationStatus.registeredCount}/2 Accounts Registered`}
            </span>
          )}
        </div>

        {/* Server Error Message */}
        {serverError && (
          <div className="auth-server-error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form: Email & Password Only */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <Input
            label="Registered Email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail size={18} />}
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: '' });
              if (serverError) setServerError('');
            }}
            error={errors.email}
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            icon={<Lock size={18} />}
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (errors.password) setErrors({ ...errors, password: '' });
              if (serverError) setServerError('');
            }}
            error={errors.password}
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRight size={18} />}
          >
            Sign In
          </Button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-switch-prompt">
            {isRegistrationClosed ? (
              <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                🔒 Registration closed (Sanctuary full: 2/2)
              </span>
            ) : (
              <>
                Don't have an account?
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={onSwitchToRegister}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
