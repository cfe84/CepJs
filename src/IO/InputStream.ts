import { EventEnvelope } from "./EventEnvelope"

export interface InputStreamParameters {
  name: string,
  cacheExpiryInSeconds?: number,
  getTimestamp?: (evt: any) => Date
}

export type Listener = (evt: EventEnvelope) => void

export class InputStream {
  events: EventEnvelope[] = []
  private sequenceId = 0;
  private getTimestamp: (evt: any) => Date

  constructor(public params: InputStreamParameters) {
    this.getTimestamp = params.getTimestamp || (() => new Date())
  }

  private listeners: Listener[] = []
  public addListener(listener: Listener) {
    this.listeners.push(listener)
  }

  // TODO: handle event expiry
  private expireEvents() {

  }

  public pushEvents(evts: any[]) {
    const envelopes = evts.map(evt => ({
      body: evt,
      sequenceId: this.sequenceId++,
      timestamp: this.getTimestamp(evt)
    } as EventEnvelope));
    this.events.push(...envelopes)
    envelopes.forEach(envelope => this.listeners.forEach(listener => listener(envelope)))
  }

  public pushEvent(evt: any) {
    this.pushEvents([evt])
  }
}