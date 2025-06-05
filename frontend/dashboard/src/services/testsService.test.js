import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { adminTestsService } from './testsService'

vi.mock('axios')

describe('createRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends request with auth token', () => {
    global.localStorage = { getItem: vi.fn(() => 'tok') }
    axios.mockResolvedValue({})
    return adminTestsService.getAllTests().then(() => {
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: '/api/tests/admin/tests',
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok'
        })
      }))
    })
  })

  it('omits auth header when no token', () => {
    global.localStorage = { getItem: vi.fn(() => null) }
    axios.mockResolvedValue({})
    return adminTestsService.getAllTests().then(() => {
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.not.objectContaining({ Authorization: expect.any(String) })
      }))
    })
  })
})
