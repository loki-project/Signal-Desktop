import { Attachment } from './Attachment';

export type Message = UserMessage;
export type UserMessage = IncomingMessage;

export type IncomingMessage = Readonly<
  {
    type: 'incoming';
    // Required
    attachments: Array<Attachment>;
    id: string;
    received_at: number;

    // Optional
    body?: string;
    errors?: Array<any>;
    expireTimer?: number;
    flags?: number;
    source?: string;
  } & SharedMessageProperties &
    ExpirationTimerUpdate
>;

type SharedMessageProperties = Readonly<{
  conversationId: string;
  sent_at: number;
  timestamp: number;
}>;

type ExpirationTimerUpdate = Partial<
  Readonly<{
    expirationTimerUpdate: Readonly<{
      expireTimer: number;
      fromSync: boolean;
      source: string;
    }>;
  }>
>;

export type LokiProfile = {
  displayName: string;
  avatarPointer?: string;
  profileKey: Uint8Array | null;
};

enum Action {
  REACT = 0,
  REMOVE = 1,
}

export interface ReactionType {
  id: number; // this is in fact a uint64 so we will have an issue
  author: string;
  emoji: string;
  action: Action;
}

export type ReactionList = Record<
  string,
  {
    id?: string;
    senders: Array<string>;
  }
>;
