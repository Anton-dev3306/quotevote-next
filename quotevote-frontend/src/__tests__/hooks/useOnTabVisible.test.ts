import { renderHook } from '@testing-library/react'
import useOnTabVisible from '@/hooks/useOnTabVisible'

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useOnTabVisible', () => {
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  })

  it('calls back when the tab becomes visible, not when it hides', () => {
    const callback = jest.fn()
    renderHook(() => useOnTabVisible(callback))

    setVisibility('hidden')
    expect(callback).not.toHaveBeenCalled()

    setVisibility('visible')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does nothing while disabled', () => {
    const callback = jest.fn()
    renderHook(() => useOnTabVisible(callback, false))

    setVisibility('visible')
    expect(callback).not.toHaveBeenCalled()
  })

  it('stops listening after unmount', () => {
    const callback = jest.fn()
    const { unmount } = renderHook(() => useOnTabVisible(callback))
    unmount()

    setVisibility('visible')
    expect(callback).not.toHaveBeenCalled()
  })
})
