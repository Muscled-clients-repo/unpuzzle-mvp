import { Command } from '../types/commands'

export class CommandQueue {
  private queue: Command[] = []
  private processing = false
  private currentCommand: Command | null = null
  public executeCommand: ((command: Command) => Promise<void>) | null = null
  
  enqueue(command: Command) {
    this.queue.push(command)
    this.process() // Don't await, let it run async
  }
  
  private async process() {
    if (this.processing) return
    this.processing = true
    
    while (this.queue.length > 0) {
      this.currentCommand = this.queue.shift()!
      this.currentCommand.status = 'processing'
      
      try {
        if (!this.executeCommand) {
          throw new Error('executeCommand not set')
        }
        await this.executeCommand(this.currentCommand)
        this.currentCommand.status = 'complete'
      } catch (error) {
        this.currentCommand.status = 'failed'
        this.currentCommand.error = error as Error
        
        if (this.currentCommand.attempts < this.currentCommand.maxAttempts) {
          // Retry with exponential backoff
          this.currentCommand.attempts++
          await this.sleep(Math.pow(2, this.currentCommand.attempts) * 100)
          this.queue.unshift(this.currentCommand) // Put back at front
        } else {
          // Move to dead letter queue
          this.handleFailedCommand(this.currentCommand)
        }
      }
      
      // Wait for system to stabilize between commands
      await this.waitForStableState()
    }
    
    this.processing = false
    this.currentCommand = null
  }
  
  private async waitForStableState(): Promise<void> {
    // Wait for React render cycle
    await new Promise(resolve => setTimeout(resolve, 0))
    // Wait for next animation frame
    await new Promise(resolve => requestAnimationFrame(resolve))
    // Additional safety delay
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  private handleFailedCommand(command: Command) {
    console.error('Command failed after all retries:', command)
    // Could send to error tracking service
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  clear() {
    this.queue = []
  }
}