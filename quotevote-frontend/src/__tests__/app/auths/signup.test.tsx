import { render, screen, fireEvent, waitFor } from '../../utils/test-utils'
import SignupPageContent from '@/app/auths/(card)/signup/PageContent'
import { VERIFY_PASSWORD_RESET_TOKEN } from '@/graphql/queries'
import { UPDATE_USER } from '@/graphql/mutations'

const mockPush = jest.fn()
let mockSearch = ''
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}))
jest.mock('@/lib/auth', () => ({ setToken: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

describe('SignupPageContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearch = ''
  })

  it('renders all 4 fields', () => {
    render(<SignupPageContent />)
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<SignupPageContent />)
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'Password1' },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for weak password', async () => {
    render(<SignupPageContent />)
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'weak' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/min 8 chars/i)).toBeInTheDocument()
    })
  })

  it('renders sign in link', () => {
    render(<SignupPageContent />)
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })
})

describe('SignupPageContent invite signup (#592)', () => {
  const token = 'invite-token'
  const invited = { _id: 'user-1', username: 'invited@example.com', email: 'invited@example.com' }
  const verifyMock = {
    request: { query: VERIFY_PASSWORD_RESET_TOKEN, variables: { token } },
    result: { data: { verifyUserPasswordResetToken: invited } },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSearch = `token=${token}`
  })

  it('fills in the invited email and makes it read-only', async () => {
    render(<SignupPageContent />, { mocks: [verifyMock] })

    const email = await screen.findByLabelText(/email/i)
    await waitFor(() => expect(email).toHaveValue('invited@example.com'))
    expect(email).toHaveAttribute('readonly')
    expect(email).toHaveAccessibleDescription(/invite was sent to this address/i)
  })

  it('completes signup without sending an email, so the invited one stays', async () => {
    const updateMock = {
      request: {
        query: UPDATE_USER,
        // No `email` here: MockLink only matches when the variables are exactly these.
        variables: {
          user: { _id: 'user-1', name: '', username: 'newmember', password: 'Password1' },
        },
      },
      result: {
        data: {
          updateUser: {
            _id: 'user-1',
            username: 'newmember',
            email: 'invited@example.com',
            name: '',
            avatar: null,
            admin: false,
            accountStatus: 'active',
            themePreference: null,
            contributorBadge: false,
          },
        },
      },
    }
    render(<SignupPageContent />, { mocks: [verifyMock, updateMock] })

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveValue('invited@example.com'))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newmember' } })
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
  })

  it('keeps the email editable for signup without an invite', () => {
    mockSearch = ''
    render(<SignupPageContent />)

    const email = screen.getByLabelText(/email/i)
    expect(email).not.toHaveAttribute('readonly')
    expect(email).toHaveValue('')
    expect(screen.queryByText(/invite was sent to this address/i)).not.toBeInTheDocument()
  })
})
