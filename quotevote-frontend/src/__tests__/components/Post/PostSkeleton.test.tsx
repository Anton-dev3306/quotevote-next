import { render, screen } from '../../utils/test-utils'
import PostSkeleton from '../../../components/Post/PostSkeleton'

describe('PostSkeleton Component', () => {
  it('renders skeleton component', () => {
    const { container } = render(<PostSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with animate-pulse class', () => {
    const { container } = render(<PostSkeleton />)
    const animated = container.querySelector('.animate-pulse')
    expect(animated).toBeInTheDocument()
  })

  it('matches the card layout: tag pill first, no vote row (#528)', () => {
    const { container } = render(<PostSkeleton />)
    const firstCard = container.querySelector('[aria-hidden="true"]')
    expect(firstCard?.querySelector('.rounded-full')).toBeInTheDocument()
    expect(firstCard?.textContent).toBe('')
  })

  it('announces loading once and hides the placeholder shapes from screen readers', () => {
    render(<PostSkeleton />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders multiple skeleton placeholder divs', () => {
    const { container } = render(<PostSkeleton />)
    const skeletonDivs = container.querySelectorAll('[class*="bg-muted"]')
    expect(skeletonDivs.length).toBeGreaterThan(5)
  })

  it('renders content area with body lines', () => {
    const { container } = render(<PostSkeleton />)
    const lines = container.querySelectorAll('[class*="rounded"]')
    expect(lines.length).toBeGreaterThan(3)
  })
})
