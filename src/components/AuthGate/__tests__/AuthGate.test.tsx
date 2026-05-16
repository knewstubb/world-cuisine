import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthGate from '../AuthGate';

// Mock supabase module
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('../../../lib/inviteValidation', () => ({
  generateInviteCode: () => 'test-invite-uuid-code',
  getInviteExpiryTimestamp: () => '2099-01-01T00:00:00.000Z',
}));

describe('AuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('renders children when session exists (Req 8.1, 8.5)', async () => {
    const mockSession = { user: { id: 'user-1' }, access_token: 'token' };
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    render(
      <AuthGate>
        <div data-testid="app-content">App Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });

  it('renders sign-in form when no session exists (Req 8.1, 8.5)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthGate>
        <div data-testid="app-content">App Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows error for invalid credentials on sign-in (Req 8.7)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    render(
      <AuthGate>
        <div>App</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /sign-in failed/i
      );
    });
  });

  it('validates password minimum length on sign-up (Req 8.2)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthGate>
        <div>App</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Switch to sign-up mode
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /password must be at least 8 characters/i
      );
    });

    // Should not have called signUp
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('creates household with invite code on successful sign-up (Req 8.3, 8.4)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // households insert with invite_code and invite_expires_at
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'household-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      // household_members insert
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    render(
      <AuthGate>
        <div>App</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Switch to sign-up mode
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    // Verify household was created with invite code
    expect(mockFrom).toHaveBeenCalledWith('households');
    expect(mockFrom).toHaveBeenCalledWith('household_members');
  });

  it('switches between sign-in, sign-up, and join-household modes', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthGate>
        <div>App</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });

    // Switch to sign-up
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();

    // Switch to join-household
    await userEvent.click(screen.getByRole('button', { name: /join a household/i }));
    expect(screen.getByRole('heading', { name: /join a household/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument();

    // Switch back to sign-in
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error when email is empty', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthGate>
        <div>App</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/password/i), 'somepassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i);
    });
  });

  it('shows validation error when password is empty', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthGate>
        <div>App</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/password is required/i);
    });
  });

  describe('Join Household flow (Req 8.4, 8.8)', () => {
    it('shows validation error when invite code is empty', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthGate>
          <div>App</div>
        </AuthGate>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Switch to join-household mode
      await userEvent.click(screen.getByRole('button', { name: /join a household/i }));

      await userEvent.type(screen.getByLabelText(/email/i), 'partner@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /join household/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/invite code is required/i);
      });
    });

    it('shows error for invalid invite code (Req 8.4)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows found' },
            }),
          }),
        }),
      }));

      render(
        <AuthGate>
          <div>App</div>
        </AuthGate>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /join a household/i }));

      await userEvent.type(screen.getByLabelText(/invite code/i), 'invalid-code');
      await userEvent.type(screen.getByLabelText(/email/i), 'partner@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /join household/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/invalid invite code/i);
      });
    });

    it('shows error for expired invite code (Req 8.4)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      });

      // Return a household with an expired invite
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'household-123',
                invite_expires_at: '2020-01-01T00:00:00.000Z', // expired
              },
              error: null,
            }),
          }),
        }),
      }));

      render(
        <AuthGate>
          <div>App</div>
        </AuthGate>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /join a household/i }));

      await userEvent.type(screen.getByLabelText(/invite code/i), 'expired-code');
      await userEvent.type(screen.getByLabelText(/email/i), 'partner@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /join household/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/expired/i);
      });
    });

    it('shows error when household is full (Req 8.8)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // households lookup - valid invite
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'household-123',
                    invite_expires_at: '2099-01-01T00:00:00.000Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        // household_members count - already full
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 2,
              error: null,
            }),
          }),
        };
      });

      render(
        <AuthGate>
          <div>App</div>
        </AuthGate>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /join a household/i }));

      await userEvent.type(screen.getByLabelText(/invite code/i), 'valid-code');
      await userEvent.type(screen.getByLabelText(/email/i), 'partner@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /join household/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/full/i);
      });
    });

    it('successfully joins household with valid invite code (Req 8.4)', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // households lookup - valid invite
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'household-123',
                    invite_expires_at: '2099-01-01T00:00:00.000Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          // household_members count - has room
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: 1,
                error: null,
              }),
            }),
          };
        }
        if (callCount === 3) {
          // household_members insert
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        // households update (invalidate invite)
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      render(
        <AuthGate>
          <div>App</div>
        </AuthGate>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /join a household/i }));

      await userEvent.type(screen.getByLabelText(/invite code/i), 'valid-code');
      await userEvent.type(screen.getByLabelText(/email/i), 'partner@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      await userEvent.click(screen.getByRole('button', { name: /join household/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'partner@example.com',
          password: 'password123',
        });
      });

      // Verify the join flow was executed
      expect(mockFrom).toHaveBeenCalledWith('households');
      expect(mockFrom).toHaveBeenCalledWith('household_members');
    });

    it('validates password minimum length in join-household mode', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthGate>
          <div>App</div>
        </AuthGate>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /join a household/i }));

      await userEvent.type(screen.getByLabelText(/invite code/i), 'some-code');
      await userEvent.type(screen.getByLabelText(/email/i), 'partner@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'short');
      await userEvent.click(screen.getByRole('button', { name: /join household/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /password must be at least 8 characters/i
        );
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });
});
