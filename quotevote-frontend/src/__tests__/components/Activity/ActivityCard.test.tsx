/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityCard } from '@/components/ui/ActivityCard'

describe('ActivityCard', () => {
  const defaultProps = {
    username: 'testuser',
    date: '2024-01-01T12:00:00Z',
    content: 'Test activity content',
    post: {
      _id: 'post-1',
      title: 'Test Post',
      text: 'Test post text',
    },
    activityType: 'POSTED',
  }

  it('renders with required props', () => {
    render(<ActivityCard {...defaultProps} />)

    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText(/Test activity content/i)).toBeInTheDocument()
  })

  // RC1-028 / #380: POSTED activity cards share feed PostCard blue chrome.
  describe('Card Chrome (RC1-028 / #380)', () => {
    it('applies standard blue border chrome for POSTED cards', () => {
      const { container } = render(<ActivityCard {...defaultProps} />)

      const card = container.querySelector('[data-slot="card"]') as HTMLElement
      expect(card).toHaveAttribute('data-chrome', 'standard-blue')
      expect(card.style.border).toContain('#56b3ff')
      expect(card.style.borderBottom).toContain('#56b3ff')
      // Fill stays theme/card — not a vote-colored background
      expect(card.style.backgroundColor).toBe('')
    })

    it('keeps activity fill colors for non-POSTED cards', () => {
      const { container } = render(
        <ActivityCard
          {...defaultProps}
          activityType="UPVOTED"
          cardColor="#52b274"
        />
      )

      const card = container.querySelector('[data-slot="card"]') as HTMLElement
      expect(card).toHaveAttribute('data-chrome', 'activity')
      expect(card).toHaveStyle({ backgroundColor: '#52b274' })
      expect(card.style.border).not.toContain('#56b3ff')
    })

    it('falls back to white fill for non-POSTED cards without cardColor', () => {
      const { container } = render(
        <ActivityCard {...defaultProps} activityType="COMMENTED" />
      )

      const card = container.querySelector('[data-slot="card"]')
      expect(card).toHaveStyle({ backgroundColor: '#FFFFFF' })
    })

    it('uses the theme text color on POSTED cards, which sit on the theme card color', () => {
      const { container } = render(<ActivityCard {...defaultProps} />)
      const card = container.querySelector('[data-slot="card"]') as HTMLElement
      // Dark text on the dark-mode card was unreadable.
      expect(card).toHaveClass('bg-card', 'text-card-foreground')
      expect(card).not.toHaveClass('text-neutral-900')
    })

    it('keeps dark text on the light vote, comment and quote fills', () => {
      const { container } = render(
        <ActivityCard {...defaultProps} activityType="COMMENTED" cardColor="#FDD835" />
      )
      const card = container.querySelector('[data-slot="card"]') as HTMLElement
      expect(card).toHaveClass('text-neutral-900')
    })
  })


  it('calls onCardClick when card is clicked', async () => {
    const handleCardClick = jest.fn()
    const { container } = render(
      <ActivityCard {...defaultProps} onCardClick={handleCardClick} />
    )

    const card = container.querySelector('[data-slot="card"]')
    if (card) {
      await userEvent.click(card)
      expect(handleCardClick).toHaveBeenCalledTimes(1)
    }
  })

  it('calls onLike when bookmark button is clicked', async () => {
    const handleLike = jest.fn()
    render(<ActivityCard {...defaultProps} onLike={handleLike} />)

    const bookmarkButton = screen.getByLabelText('Save post')
    await userEvent.click(bookmarkButton)

    expect(handleLike).toHaveBeenCalled()
  })

  it('shows the saved state when liked', () => {
    render(<ActivityCard {...defaultProps} liked={true} />)

    expect(screen.getByLabelText('Remove saved post')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the unsaved state when not liked', () => {
    render(<ActivityCard {...defaultProps} liked={false} />)

    expect(screen.getByLabelText('Save post')).toHaveAttribute('aria-pressed', 'false')
  })

  it('displays interaction count', () => {
    render(
      <ActivityCard
        {...defaultProps}
        comments={[{ _id: '1' }]}
        votes={[{ _id: '2' }]}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('handles empty interactions', () => {
    render(<ActivityCard {...defaultProps} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  describe('Preview Truncation (#474)', () => {
    it('renders short activity content without ellipsis', () => {
      const shortContent = 'Short activity text'
      render(<ActivityCard {...defaultProps} content={shortContent} />)

      expect(screen.getByText(`"${shortContent}"`)).toBeInTheDocument()
    })

    it('truncates activity content over 150 chars with ellipsis and applies line-clamp-3', () => {
      const longContent = 'X'.repeat(250)
      const { container } = render(<ActivityCard {...defaultProps} content={longContent} />)

      const expectedContent = `"${'X'.repeat(150)}..."`
      expect(screen.getByText(expectedContent)).toBeInTheDocument()

      const contentP = container.querySelector('.line-clamp-3')
      expect(contentP).toBeInTheDocument()
    })
  })

  it('aligns the avatar with the username and stacks the timestamp on small screens', () => {
    render(<ActivityCard {...defaultProps} />)

    expect(screen.getByTestId('activity-content')).toHaveClass('items-start')
    expect(screen.getByTestId('activity-header')).toHaveClass('flex-col')
    expect(screen.getByTestId('activity-header')).toHaveClass('sm:flex-row')
  })
  describe('keyboard and targets (#536)', () => {
    it('opens the post with Enter or Space on the card', async () => {
      const user = userEvent.setup()
      const onCardClick = jest.fn()
      render(<ActivityCard {...defaultProps} activityType="COMMENTED" onCardClick={onCardClick} />)
      const card = screen.getByRole('article', { name: 'commented: Test Post' })
      card.focus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      expect(onCardClick).toHaveBeenCalledTimes(2)
    })

    it('leaves Enter on the Save button to the button', async () => {
      const user = userEvent.setup()
      const onCardClick = jest.fn()
      const onLike = jest.fn()
      render(<ActivityCard {...defaultProps} onCardClick={onCardClick} onLike={onLike} />)
      screen.getByRole('button', { name: 'Save post' }).focus()
      await user.keyboard('{Enter}')
      expect(onLike).toHaveBeenCalledTimes(1)
      expect(onCardClick).not.toHaveBeenCalled()
    })

    it('gives Save a 32px target and the avatar a name', () => {
      render(<ActivityCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Save post' })).toHaveClass('size-8')
      expect(screen.getByRole('button', { name: "testuser's profile" })).toBeInTheDocument()
    })
  })
})

