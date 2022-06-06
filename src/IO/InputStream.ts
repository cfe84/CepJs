import { EventEnvelope } from "./EventEnvelope"

export interface InputStreamParameters {
  name: string,
  cacheExpiryInSeconds?: number,
  getTimestamp?: (evt: any) => Date,
  expireEventsInBackground?: boolean
}

export type Listener = (evt: EventEnvelope) => void
export type ListenerAdder = (Listener: Listener) => void

export class InputStream {
  getEvents() { return this.events }
  events: EventEnvelope[] = []
  private sequenceId = 0;
  private getTimestamp: (evt: any) => Date;
  private cacheExpiryInMilliSeconds: number;
  private expiryTimer: NodeJS.Timer | undefined;

  constructor(public params: InputStreamParameters) {
    this.getTimestamp = params.getTimestamp || (() => new Date())
    this.cacheExpiryInMilliSeconds = (params.cacheExpiryInSeconds === undefined ? 3600 : params.cacheExpiryInSeconds) * 1000
    if (params.expireEventsInBackground) {
      this.expiryTimer = setInterval(() => {
        this.expireEvents()
      }, this.cacheExpiryInMilliSeconds / 2)
    }
  }

  private listeners: Listener[] = []

  /**
   * This will be made private at some point. Users shouldn't worry about this.
   * @param listener 
   */
  public addListener(listener: Listener) {
    this.listeners.push(listener)
  }

  /**
   * Destroy input and close background loops if necessary.
   * 
   * Call to remove any remaining Node hooks.
   */
  public destroy() {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer)
    }
  }

  /**
   * Removes expired events.
   */
  private expireEvents() {
    const expiry = new Date(Date.now() - this.cacheExpiryInMilliSeconds)
    while (this.events.length !== 0 && this.events[0].timestamp < expiry) {
      this.events.shift()
    }
  }

  public pushEvent(evts: any | any[]) {
    if (!Array.isArray(evts)) {
      evts = [evts]
    }
    this.expireEvents()
    const maxTimestamp = this.events.length ? this.events[this.events.length - 1] : new Date()
    const sorter = (a: EventEnvelope, b: EventEnvelope) => b.timestamp.getTime() - a.timestamp.getTime()
    let envelopes: EventEnvelope[] = evts.map((evt: any) => ({
      body: evt,
      sequenceId: this.sequenceId++,
      timestamp: this.getTimestamp(evt)
    }));
    envelopes.sort(sorter)
    this.events.push(...envelopes)
    const minTimeInEnvelopes = envelopes[0].timestamp
    // We sort only if events arrived out of order.
    if (minTimeInEnvelopes < maxTimestamp) {
      this.events.sort(sorter)
    }
    envelopes.forEach(envelope => this.listeners.forEach(listener => listener(envelope)))
  }
}