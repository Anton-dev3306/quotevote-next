/**
 * DirectoryToolbar: Following chip and removable active filter pills (home search page)
 */

import { fireEvent, render, screen } from '../../utils/test-utils'
import { DirectoryToolbar } from '@/app/components/PublicDirectory/DirectoryToolbar'
import { useAppStore } from '@/store'
import { useQuery } from '@apollo/client/react'
import { GROUPS_QUERY } from '@/graphql/queries'

const mockReplace = jest.fn()
let mockSearch = ''

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

jest.mock('@apollo/client/react', () => ({
  ...jest.requireActual('@apollo/client/react'),
  useQuery: jest.fn(() => ({ data: undefined, loading: false, error: undefined })),
}))

jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: <T,>(value: T) => value,
}))

describe('DirectoryToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearch = ''
    useAppStore.getState().clearUserData()
  })

  describe('Following filter', () => {
    it('is hidden when logged out', () => {
      render(<DirectoryToolbar />)
      expect(screen.queryByTestId('filter-following')).not.toBeInTheDocument()
    })

    it('toggles following=true in the URL when logged in', () => {
      useAppStore.getState().setUserData({ _id: 'user-1', username: 'tester', name: 'Tester' })
      render(<DirectoryToolbar />)

      const chip = screen.getByTestId('filter-following')
      expect(chip).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(chip)
      expect(mockReplace).toHaveBeenLastCalledWith('?following=true', { scroll: false })
    })

    it('clears following when already active', () => {
      useAppStore.getState().setUserData({ _id: 'user-1', username: 'tester', name: 'Tester' })
      mockSearch = 'following=true'
      render(<DirectoryToolbar />)

      const chip = screen.getByTestId('filter-following')
      expect(chip).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(chip)
      expect(mockReplace).toHaveBeenLastCalledWith('/', { scroll: false })
    })
  })

  describe('Active filter pills', () => {
    it('removes only the Feed pill and keeps other params', () => {
      mockSearch = 'q=climate&following=true&interactions=true'
      render(<DirectoryToolbar />)

      fireEvent.click(screen.getByRole('button', { name: 'Remove Feed filter' }))
      expect(mockReplace).toHaveBeenLastCalledWith('?q=climate&interactions=true', {
        scroll: false,
      })
    })

    it('removes the search pill and clears q', () => {
      mockSearch = 'q=climate&following=true'
      render(<DirectoryToolbar />)

      fireEvent.click(screen.getByRole('button', { name: 'Remove Search filter' }))
      expect(mockReplace).toHaveBeenLastCalledWith('?following=true', { scroll: false })
    })

    it('does not render pills when no filters are active', () => {
      render(<DirectoryToolbar />)
      expect(screen.queryByRole('button', { name: /^Remove /i })).not.toBeInTheDocument()
    })
  })
})

describe('DirectoryToolbar search input', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearch = ''
    ;(useQuery as unknown as jest.Mock).mockImplementation((doc: unknown) => ({
      data:
        doc === GROUPS_QUERY
          ? { groups: [{ _id: 'g1', title: 'Politics', privacy: 'public' }] }
          : undefined,
      loading: false,
      error: undefined,
    }))
  })

  it('applies the tag filter when the input is a single #word naming a tag', () => {
    render(<DirectoryToolbar />)
    const input = screen.getByTestId('directory-search')
    fireEvent.change(input, { target: { value: '#politics' } })
    expect(mockReplace).toHaveBeenCalledWith('?group=g1', { scroll: false })
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining('q='), expect.anything())
  })

  it('keeps unknown #words and plain text as text search', () => {
    render(<DirectoryToolbar />)
    const input = screen.getByTestId('directory-search')
    fireEvent.change(input, { target: { value: '#unknown' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(mockReplace).toHaveBeenLastCalledWith('?q=%23unknown', { scroll: false })
  })

  it('does not advertise @username search', () => {
    render(<DirectoryToolbar />)
    expect(screen.queryByText(/@username/)).not.toBeInTheDocument()
  })
})
