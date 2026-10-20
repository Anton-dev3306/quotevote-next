import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import { resetStore } from '@/__tests__/utils/test-utils'
import { useAppStore } from '@/store/useAppStore'
import { UPDATE_USER } from '@/graphql/mutations'
import { GET_USER } from '@/graphql/queries'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock ThemeContext
const mockToggleTheme = jest.fn().mockReturnValue('light')
const mockSetTheme = jest.fn()
const mockToggleNeoBrutalism = jest.fn().mockReturnValue(false)
jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'light',
    setTheme: mockSetTheme,
    toggleTheme: mockToggleTheme,
    isDarkMode: false,
    neoBrutalism: false,
    toggleNeoBrutalism: mockToggleNeoBrutalism,
    theme: { mode: 'light', palette: { background: '#ffffff', text: '#111827' } },
  }),
}))

let SettingsPageClient: React.ComponentType
beforeAll(async () => {
  const mod = await import('@/app/(dashboard)/settings/SettingsPageClient')
  SettingsPageClient = mod.default
})

const mockUser = {
  id: 'user-1',
  _id: 'user-1',
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.png',
  admin: false,
  accountStatus: 'active',
}

const getUserMock = {
  request: {
    query: GET_USER,
    variables: { username: 'testuser' },
  },
  result: {
    data: {
      user: {
        _id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        upvotes: 0,
        downvotes: 0,
        _followingId: [],
        _followersId: [],
        avatar: 'https://example.com/avatar.png',
        contributorBadge: false,
        reputation: null,
      },
    },
  },
}

const saveEmailMock = {
  request: {
    query: UPDATE_USER,
    variables: {
      user: {
        _id: 'user-1',
        themePreference: 'light',
        email: 'new@example.com',
      },
    },
  },
  result: {
    data: {
      updateUser: {
        _id: 'user-1',
        username: 'testuser',
        email: 'new@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.png',
        admin: false,
        accountStatus: 'active',
        themePreference: 'light',
        contributorBadge: false,
      },
    },
  },
}

describe('Settings Page (#536: account and app preferences only)', () => {
  beforeEach(() => {
    resetStore()
    mockPush.mockClear()
    useAppStore.getState().setUserData(mockUser)
  })

  it('is called Settings, not Settings & Privacy', () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByText(/privacy/i)).not.toBeInTheDocument()
  })

  it('has no profile editing: no photo, name, username, About or banner', () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    expect(screen.queryByText(/change photo/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^username$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('About')).not.toBeInTheDocument()
    expect(screen.queryByText(/profile background/i)).not.toBeInTheDocument()
  })

  it('points to Edit profile for those instead', () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    expect(screen.getByTestId('settings-edit-profile-link')).toHaveAttribute(
      'href',
      '/profile/testuser/edit'
    )
  })

  it('has no Sign out (it lives in the account menu)', () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('shows the account email and the appearance switches', () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    expect(screen.getByLabelText('Email')).toHaveValue('test@example.com')
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Neo-Brutalism' })).toBeInTheDocument()
  })

  it('keeps Save disabled until something changes', async () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
    })
  })

  it('enables Save when only dark mode changes', async () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    fireEvent.click(screen.getByRole('switch', { name: 'Dark mode' }))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
    })
  })

  it('shows an error for an invalid email and does not save', async () => {
    render(<SettingsPageClient />, { mocks: [getUserMock] })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('saves only the account fields', async () => {
    render(<SettingsPageClient />, { mocks: [getUserMock, saveEmailMock, getUserMock] })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(useAppStore.getState().user.data?.email).toBe('new@example.com')
    })
    expect(useAppStore.getState().user.data?.name).toBe('Test User')
  })
})
