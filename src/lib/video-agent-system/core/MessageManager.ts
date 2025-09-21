import { Message, MessageState } from '../types/states'

export class MessageManager {
  filterUnactivated(messages: Message[]): Message[] {
    return messages.filter(msg => msg.state !== MessageState.UNACTIVATED)
  }
  
  updateMessageState(messages: Message[], messageId: string, newState: MessageState): Message[] {
    return messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, state: newState, actions: undefined }
        : msg
    )
  }
  
  addMessage(messages: Message[], newMessage: Message): Message[] {
    return [...messages, newMessage]
  }

  updateMessage(messages: Message[], messageId: string, updatedMessage: Partial<Message>): Message[] {
    return messages.map(msg =>
      msg.id === messageId
        ? { ...msg, ...updatedMessage }
        : msg
    )
  }

  addOrUpdateMessage(messages: Message[], message: Message): Message[] {
    const existingIndex = messages.findIndex(msg => msg.id === message.id)
    if (existingIndex >= 0) {
      // Update existing message
      return messages.map(msg =>
        msg.id === message.id ? message : msg
      )
    } else {
      // Add new message
      return [...messages, message]
    }
  }
}