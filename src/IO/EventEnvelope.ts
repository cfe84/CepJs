export interface EventEnvelope {
  sequenceId: number,
  timestamp: Date,
  body: any
}