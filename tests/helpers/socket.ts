/**
 * Socket.io Test Helpers
 * 
 * Helpers for testing real-time Socket.io functionality
 */

import { Page } from '@playwright/test'

/**
 * Wait for a Socket.io event to be emitted
 */
export async function waitForSocketEvent(
  page: Page,
  eventName: string,
  timeout: number = 5000
): Promise<any> {
  return page.evaluate(
    ({ eventName, timeout }) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout waiting for socket event: ${eventName}`))
        }, timeout)
        
        // Access the socket from the window object
        // (Your app needs to expose this for testing)
        const socket = (window as any).__socket
        
        if (!socket) {
          clearTimeout(timeoutId)
          reject(new Error('Socket not found on window object'))
          return
        }
        
        socket.once(eventName, (data: any) => {
          clearTimeout(timeoutId)
          resolve(data)
        })
      })
    },
    { eventName, timeout }
  )
}

/**
 * Emit a Socket.io event from the test
 */
export async function emitSocketEvent(
  page: Page,
  eventName: string,
  data?: any
): Promise<void> {
  await page.evaluate(
    ({ eventName, data }) => {
      const socket = (window as any).__socket
      
      if (!socket) {
        throw new Error('Socket not found on window object')
      }
      
      socket.emit(eventName, data)
    },
    { eventName, data }
  )
}

/**
 * Check if socket is connected
 */
export async function isSocketConnected(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const socket = (window as any).__socket
    return socket?.connected || false
  })
}

/**
 * Wait for socket to connect
 */
export async function waitForSocketConnection(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const connected = await isSocketConnected(page)
    if (connected) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  
  throw new Error(`Socket did not connect within ${timeout}ms`)
}

/**
 * Listen for multiple socket events
 */
export async function listenForSocketEvents(
  page: Page,
  eventNames: string[],
  timeout: number = 5000
): Promise<Record<string, any[]>> {
  // Set up listeners for all events
  await page.evaluate(
    ({ eventNames }) => {
      const socket = (window as any).__socket
      
      if (!socket) {
        throw new Error('Socket not found on window object')
      }
      
      // Store events in window object
      ;(window as any).__socketEvents = {}
      
      eventNames.forEach((eventName) => {
        ;(window as any).__socketEvents[eventName] = []
        
        socket.on(eventName, (data: any) => {
          ;(window as any).__socketEvents[eventName].push({
            data,
            timestamp: Date.now(),
          })
        })
      })
    },
    { eventNames }
  )
  
  // Wait for the timeout period
  await new Promise((resolve) => setTimeout(resolve, timeout))
  
  // Retrieve all captured events
  const events = await page.evaluate(() => {
    return (window as any).__socketEvents || {}
  })
  
  return events
}

/**
 * Clear socket event listeners
 */
export async function clearSocketListeners(page: Page): Promise<void> {
  await page.evaluate(() => {
    const socket = (window as any).__socket
    
    if (socket) {
      socket.removeAllListeners()
    }
    
    delete (window as any).__socketEvents
  })
}

/**
 * Get the count of received socket events
 */
export async function getSocketEventCount(
  page: Page,
  eventName: string
): Promise<number> {
  return page.evaluate(
    ({ eventName }) => {
      const events = (window as any).__socketEvents
      return events && events[eventName] ? events[eventName].length : 0
    },
    { eventName }
  )
}

/**
 * Setup socket monitoring for debugging
 */
export async function setupSocketMonitoring(page: Page): Promise<void> {
  await page.evaluate(() => {
    const socket = (window as any).__socket
    
    if (!socket) {
      console.warn('Socket not found for monitoring')
      return
    }
    
    // Log all socket events
    const originalEmit = socket.emit.bind(socket)
    socket.emit = (...args: any[]) => {
      console.log('[Socket EMIT]', args[0], args[1])
      return originalEmit(...args)
    }
    
    const originalOn = socket.on.bind(socket)
    socket.on = (...args: any[]) => {
      const eventName = args[0]
      const callback = args[1]
      
      return originalOn(eventName, (...callbackArgs: any[]) => {
        console.log('[Socket ON]', eventName, callbackArgs[0])
        return callback(...callbackArgs)
      })
    }
  })
}

