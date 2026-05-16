import { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { generateInviteCode, getInviteExpiryTimestamp } from '../../lib/inviteValidation';
import type { Session } from '@supabase/supabase-js';
import styles from './AuthGate.module.css';

interface AuthGateProps {
  children: ReactNode;
}

type AuthMode = 'sign-in' | 'sign-up' | 'join-household';

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateForm = (): string | null => {
    if (mode === 'join-household') {
      if (!inviteCode.trim()) {
        return 'Invite code is required.';
      }
      if (!email.trim()) {
        return 'Email is required.';
      }
      if (!password) {
        return 'Password is required.';
      }
      if (password.length < 8) {
        return 'Password must be at least 8 characters.';
      }
      return null;
    }

    if (!email.trim()) {
      return 'Email is required.';
    }
    if (!password) {
      return 'Password is required.';
    }
    if (mode === 'sign-up' && password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError('Sign-in failed. Please check your credentials and try again.');
    }
  };

  const handleSignUp = async () => {
    // 1. Create the user account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const user = signUpData.user;
    if (!user) {
      setError('Sign-up failed. Please try again.');
      return;
    }

    // 2. Create a new household with an invite code (UUID, 48-hour expiry)
    const newInviteCode = generateInviteCode();
    const inviteExpiresAt = getInviteExpiryTimestamp();

    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({
        invite_code: newInviteCode,
        invite_expires_at: inviteExpiresAt,
      })
      .select('id')
      .single();

    if (householdError) {
      setError('Account created but failed to set up household. Please sign in to retry.');
      return;
    }

    // 3. Associate the user with the household
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
      });

    if (memberError) {
      setError('Account created but failed to join household. Please sign in to retry.');
      return;
    }
  };

  const handleJoinHousehold = async () => {
    const code = inviteCode.trim();

    // 1. Create the user account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const user = signUpData.user;
    if (!user) {
      setError('Sign-up failed. Please try again.');
      return;
    }

    // 2. Look up the household by invite code
    const { data: household, error: lookupError } = await supabase
      .from('households')
      .select('id, invite_expires_at')
      .eq('invite_code', code)
      .single();

    if (lookupError || !household) {
      setError('Invalid invite code. Please check and try again.');
      return;
    }

    // 3. Validate invite expiry (48 hours)
    if (!household.invite_expires_at) {
      setError('This invite code has already been used or is invalid.');
      return;
    }

    const expiryDate = new Date(household.invite_expires_at);
    if (new Date() > expiryDate) {
      setError('This invite code has expired.');
      return;
    }

    // 4. Check household member count (max 2)
    const { count, error: countError } = await supabase
      .from('household_members')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', household.id);

    if (countError) {
      setError('Failed to verify household. Please try again.');
      return;
    }

    if ((count ?? 0) >= 2) {
      setError('This household is full (maximum 2 members).');
      return;
    }

    // 5. Add user to household
    const { error: joinError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
      });

    if (joinError) {
      setError('Failed to join household. Please try again.');
      return;
    }

    // 6. Invalidate the invite code (single-use)
    await supabase
      .from('households')
      .update({ invite_code: null, invite_expires_at: null })
      .eq('id', household.id);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'sign-in') {
        await handleSignIn();
      } else if (mode === 'sign-up') {
        await handleSignUp();
      } else {
        await handleJoinHousehold();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Cooking World Map</h1>
        <h2 className={styles.subtitle}>
          {mode === 'sign-in'
            ? 'Sign In'
            : mode === 'sign-up'
              ? 'Create Account'
              : 'Join a Household'}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {mode === 'join-household' && (
            <div className={styles.field}>
              <label htmlFor="inviteCode" className={styles.label}>
                Invite Code
              </label>
              <input
                id="inviteCode"
                type="text"
                className={styles.input}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Paste your invite code"
                disabled={submitting}
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'sign-in' ? 'Your password' : 'Min 8 characters'}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              disabled={submitting}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting
              ? 'Please wait...'
              : mode === 'sign-in'
                ? 'Sign In'
                : mode === 'sign-up'
                  ? 'Create Account'
                  : 'Join Household'}
          </button>
        </form>

        <div className={styles.switchSection}>
          {mode === 'sign-in' && (
            <>
              <p className={styles.switchText}>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => switchMode('sign-up')}
                  disabled={submitting}
                >
                  Sign Up
                </button>
              </p>
              <p className={styles.switchText}>
                Have an invite code?{' '}
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => switchMode('join-household')}
                  disabled={submitting}
                >
                  Join a Household
                </button>
              </p>
            </>
          )}
          {mode === 'sign-up' && (
            <>
              <p className={styles.switchText}>
                Already have an account?{' '}
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => switchMode('sign-in')}
                  disabled={submitting}
                >
                  Sign In
                </button>
              </p>
              <p className={styles.switchText}>
                Have an invite code?{' '}
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => switchMode('join-household')}
                  disabled={submitting}
                >
                  Join a Household
                </button>
              </p>
            </>
          )}
          {mode === 'join-household' && (
            <p className={styles.switchText}>
              Want to create your own household?{' '}
              <button
                type="button"
                className={styles.switchButton}
                onClick={() => switchMode('sign-up')}
                disabled={submitting}
              >
                Sign Up
              </button>
              {' · '}
              <button
                type="button"
                className={styles.switchButton}
                onClick={() => switchMode('sign-in')}
                disabled={submitting}
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
