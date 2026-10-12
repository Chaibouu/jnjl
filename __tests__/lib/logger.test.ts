import { logger } from '@/lib/logger'

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation()
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation()
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation()

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
    mockConsoleWarn.mockRestore()
    mockConsoleInfo.mockRestore()
    mockConsoleDebug.mockRestore()
  })

  it('should log error messages', () => {
    logger.error('Test error')
    expect(mockConsoleError).toHaveBeenCalled()
  })

  it('should log warning messages', () => {
    logger.warn('Test warning')
    expect(mockConsoleWarn).toHaveBeenCalled()
  })

  it('should log info messages', () => {
    logger.info('Test info')
    expect(mockConsoleInfo).toHaveBeenCalled()
  })

  it('should log debug messages in development', () => {
    logger.debug('Test debug')
    expect(mockConsoleDebug).toHaveBeenCalled()
  })

  it('should log with context', () => {
    logger.info({ userId: '123', action: 'login' }, 'Test with context')
    expect(mockConsoleInfo).toHaveBeenCalledWith(
      expect.stringContaining('Test with context')
    )
  })

  it('should log HTTP requests', () => {
    logger.logRequest('GET', '/api/users', 200, 150)
    expect(mockConsoleInfo).toHaveBeenCalledWith(
      expect.stringContaining('HTTP Request'),
      expect.any(Object)
    )
  })

  it('should log auth actions', () => {
    logger.logAuth('login', 'user123', 'test@example.com')
    expect(mockConsoleInfo).toHaveBeenCalled()
  })
})
