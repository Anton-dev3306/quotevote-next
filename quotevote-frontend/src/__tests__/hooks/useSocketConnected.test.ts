import { act, renderHook } from '@testing-library/react'
import useSocketConnected from '@/hooks/useSocketConnected'
import { isSocketConnected, setSocketConnected } from '@/lib/apollo/socketStatus'

describe('useSocketConnected', () => {
  afterEach(() => {
    act(() => setSocketConnected(false))
  })

  it('starts disconnected', () => {
    const { result } = renderHook(() => useSocketConnected())
    expect(result.current).toBe(false)
    expect(isSocketConnected()).toBe(false)
  })

  it('follows the socket as it connects and closes', () => {
    const { result } = renderHook(() => useSocketConnected())

    act(() => setSocketConnected(true))
    expect(result.current).toBe(true)

    act(() => setSocketConnected(false))
    expect(result.current).toBe(false)
  })
})
