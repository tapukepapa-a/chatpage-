import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, MessageSquare, AlertCircle, ShieldAlert } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import './Auth.css';

export default function RegisterPage({ onRegister, onSwitchToLogin, registrationStatus }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
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
      await onRegister({
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            Register your email to get started with Just Us.
          </p>
          {registrationStatus && (
            <span className="auth-registration-status-tag">
              Account Slot {registrationStatus.registeredCount + 1} of 2
            </span>
          )}
        </div>

        {/* Closed Banner if already 2 accounts */}
        {isRegistrationClosed ? (
          <div>
            <div className="auth-closed-banner">
              <ShieldAlert size={24} style={{ color: 'var(--purple-400)', marginBottom: '8px' }} />
              <div>
                <strong>Registration Permanently Closed</strong>
              </div>
              <p style={{ marginTop: '6px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                This private sanctuary is restricted to strictly two accounts. Both accounts have already been established.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={onSwitchToLogin}
              style={{ marginTop: '16px' }}
            >
              Return to Sign In
            </Button>
          </div>
        ) : (
          <>
            {/* Server Error Message */}
            {serverError && (
              <div className="auth-server-error" style={{ marginBottom: '16px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Form: Email, Password, Confirm Password Only */}
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <Input
                label="Email Address"
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
                placeholder="Create a password (min 6 characters)"
                icon={<Lock size={18} />}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
                  if (serverError) setServerError('');
                }}
                error={errors.password}
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                icon={<Lock size={18} />}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  if (serverError) setServerError('');
                }}
                error={errors.confirmPassword}
                autoComplete="new-password"
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
                Create Account
              </Button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <div className="auth-switch-prompt">
                Already have an account?
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={onSwitchToLogin}
                >
                  Sign In
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
