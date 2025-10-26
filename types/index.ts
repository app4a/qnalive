import { User, Event, Question, Poll, PollOption, QuestionStatus, PollType } from '@prisma/client'

export type EventWithRelations = Event & {
  owner: User
  questions: QuestionWithAuthor[]
  polls: PollWithOptions[]
  _count: {
    participants: number
    questions: number
    polls: number
  }
}

export type QuestionWithAuthor = Question & {
  author?: Pick<User, 'id' | 'name' | 'image'>
  upvotes: { userId?: string; sessionId?: string }[]
  _count: {
    upvotes: number
  }
}

export type PollWithOptions = Poll & {
  options: (PollOption & {
    _count: { votes: number }
  })[]
  votes: { userId?: string; sessionId?: string }[]
}

export interface EventSettings {
  allowAnonymous: boolean
  moderationEnabled: boolean
  showResultsImmediately: boolean
  allowParticipantPolls: boolean
}

export interface CreateEventInput {
  title: string
  description?: string
  startTime?: Date
  endTime?: Date
  settings?: Partial<EventSettings>
}

export interface CreateQuestionInput {
  eventId: string
  content: string
  authorName?: string
}

export interface CreatePollInput {
  eventId: string
  title: string
  type: PollType
  options: string[]
  allowMultipleVotes?: boolean
}

export interface VotePollInput {
  pollId: string
  optionId: string
}

export interface UpdateQuestionInput {
  status?: QuestionStatus
  isAnswered?: boolean
  isArchived?: boolean
}

export { QuestionStatus, PollType }

