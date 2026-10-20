import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Apollo useMutation
const mockFollowMutation = jest.fn().mockResolvedValue({ data: { followUser: { _id: 'profile-user-id' } } });
jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockFollowMutation, { loading: false }],
}));

// Mock the store
const mockUpdateFollowing = jest.fn();
jest.mock('@/store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: {
        data: {
          id: 'current-user-id',
          _id: 'current-user-id',
          _followingId: [],
          username: 'testuser',
        },
      },
      updateFollowing: mockUpdateFollowing,
    }),
}));

const mockToastSuccess = jest.fn();
jest.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }));

// Mock useGuestGuard
jest.mock('@/hooks/useGuestGuard', () => ({
  __esModule: true,
  default: () => () => true,
}));

import { FollowButton } from '@/components/CustomButtons/FollowButton';

describe('FollowButton', () => {
  beforeEach(() => {
    mockUpdateFollowing.mockClear();
    mockFollowMutation.mockClear();
    mockToastSuccess.mockClear();
  });

  it('renders Follow button when not following', () => {
    render(
      <FollowButton
        isFollowing={false}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('renders a filled Following state instead of Un-Follow', () => {
    render(
      <FollowButton
        isFollowing={true}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );
    const button = screen.getByRole('button', { name: 'Following, select to unfollow' });
    expect(button).toHaveClass('bg-blue-600', 'text-white');
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.queryByText('Un-Follow')).not.toBeInTheDocument();
  });

  it('keeps the Follow state outlined, not filled', () => {
    render(
      <FollowButton
        isFollowing={false}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );
    expect(screen.getByRole('button', { name: 'Follow' })).not.toHaveClass('bg-blue-600');
  });

  it('unfollows from the Following state and confirms it', async () => {
    render(
      <FollowButton
        isFollowing={true}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Following, select to unfollow' }));

    await waitFor(() => {
      expect(mockFollowMutation).toHaveBeenCalledWith({
        variables: { user_id: 'profile-user-id', action: 'un-follow' },
      });
      expect(mockToastSuccess).toHaveBeenCalledWith('You unfollowed @targetuser');
    });
  });

  it('confirms a follow once the mutation succeeds', async () => {
    render(
      <FollowButton
        isFollowing={false}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );

    fireEvent.click(screen.getByText('Follow'));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("You're following @targetuser");
    });
  });

  it('reverts and stays quiet when the follow fails', async () => {
    mockFollowMutation.mockRejectedValueOnce(new Error('network'));
    render(
      <FollowButton
        isFollowing={false}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );

    fireEvent.click(screen.getByText('Follow'));

    await waitFor(() => {
      expect(mockUpdateFollowing).toHaveBeenLastCalledWith([]);
    });
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('calls optimistic update on follow click', async () => {
    render(
      <FollowButton
        isFollowing={false}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );

    fireEvent.click(screen.getByText('Follow'));

    await waitFor(() => {
      expect(mockUpdateFollowing).toHaveBeenCalledWith(['profile-user-id']);
    });
  });

  it('calls mutation with correct variables on follow', async () => {
    render(
      <FollowButton
        isFollowing={false}
        profileUserId="profile-user-id"
        username="targetuser"
      />
    );

    fireEvent.click(screen.getByText('Follow'));

    await waitFor(() => {
      expect(mockFollowMutation).toHaveBeenCalledWith({
        variables: { user_id: 'profile-user-id', action: 'follow' },
      });
    });
  });

  it('renders icon-only button when showIcon is true', () => {
    render(
      <FollowButton
        isFollowing={false}
        profileUserId="profile-user-id"
        username="targetuser"
        showIcon
      />
    );
    expect(screen.getByLabelText('Follow @targetuser')).toBeInTheDocument();
  });

  it('renders unfollow icon when showIcon is true and following', () => {
    render(
      <FollowButton
        isFollowing={true}
        profileUserId="profile-user-id"
        username="targetuser"
        showIcon
      />
    );
    expect(screen.getByLabelText('Following @targetuser, select to unfollow')).toBeInTheDocument();
  });
});
