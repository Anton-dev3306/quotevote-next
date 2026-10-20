/**
 * PostController Component Tests
 *
 * Tests for the PostController component including:
 * - Loading state renders PostSkeleton
 * - Error state redirects to /error
 * - Successful data fetch renders Post component
 * - Missing postId or a null post shows the unavailable state (#532)
 * - Page state management via setSelectedPage
 */

import { render, screen, fireEvent, act } from '../../utils/test-utils'
import PostController from '../../../components/Post/PostController'
import { GET_POST } from '@/graphql/queries'

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useParams: () => ({ postId: 'test-post-id' }),
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Zustand store
const mockSetSelectedPage = jest.fn()
jest.mock('@/store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => {
    const state = {
      setSelectedPage: mockSetSelectedPage,
      setNotificationsOpen: jest.fn(),
      user: {
        data: {
          _id: 'user-123',
          admin: false,
          _followingId: [],
        },
      },
    }
    return selector(state)
  },
}))

// Mock PostSkeleton
jest.mock('../../../components/Post/PostSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="post-skeleton">Loading...</div>,
}))

// Mock Post component
jest.mock('../../../components/Post/Post', () => ({
  __esModule: true,
  default: ({ post, refetchPost }: { post: { title?: string }; refetchPost?: () => void }) => (
    <div data-testid="post-component">
      {post.title}
      <button type="button" onClick={() => refetchPost?.()}>
        refetch
      </button>
    </div>
  ),
}))

const mockPost = {
  _id: 'test-post-id',
  userId: 'user-123',
  created: '2024-01-01',
  title: 'Test Post',
  text: 'Test content',
  url: '/post/group/test/test-post-id',
  comments: [],
  votes: [],
  quotes: [],
}

describe('PostController Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('renders PostSkeleton while loading', () => {
      const mocks = [
        {
          request: {
            query: GET_POST,
            variables: { postId: 'test-post-id' },
          },
          result: {
            data: { post: mockPost },
          },
          delay: 1000,
        },
      ]
      render(<PostController postId="test-post-id" />, { mocks })
      expect(screen.getByTestId('post-skeleton')).toBeInTheDocument()
    })

    it('keeps the post on screen while it refetches after a vote (#529)', async () => {
      const request = { query: GET_POST, variables: { postId: 'test-post-id' } }
      const mocks = [
        { request, result: { data: { post: mockPost } } },
        { request, result: { data: { post: { ...mockPost, title: 'Refetched' } } }, delay: 200 },
      ]
      render(<PostController postId="test-post-id" />, { mocks })
      expect(await screen.findByText('Test Post')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'refetch' }))
      // Let the refetch start (loading flips a tick later) before checking.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(screen.queryByTestId('post-skeleton')).not.toBeInTheDocument()
      expect(screen.getByTestId('post-component')).toBeInTheDocument()
      expect(await screen.findByText('Refetched')).toBeInTheDocument()
    })
  })

  describe('Missing post', () => {
    it('shows the unavailable state when postId is empty', () => {
      render(<PostController postId="" />)
      expect(screen.getByTestId('post-unavailable')).toBeInTheDocument()
      expect(screen.getByText('This post isn\u2019t available.')).toBeInTheDocument()
    })

    it('shows the unavailable state when postId is undefined', () => {
      render(<PostController />)
      expect(screen.getByTestId('post-unavailable')).toBeInTheDocument()
    })

    it('shows the unavailable state when the post query returns null', async () => {
      const mocks = [
        {
          request: { query: GET_POST, variables: { postId: 'gone-post-id' } },
          result: { data: { post: null } },
        },
      ]
      render(<PostController postId="gone-post-id" />, { mocks })
      expect(await screen.findByTestId('post-unavailable')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /go to home/i })).toHaveAttribute('href', '/')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Page State Management', () => {
    it('calls setSelectedPage with empty string on mount', () => {
      render(<PostController postId="" />)
      expect(mockSetSelectedPage).toHaveBeenCalledWith('')
    })
  })
})
