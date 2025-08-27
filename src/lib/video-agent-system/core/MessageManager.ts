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
}