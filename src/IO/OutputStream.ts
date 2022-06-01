export type Callback = (evt: any) => void

export class OutputStream {
  private callbacks: Callback[] = []
  public get name(): string {
    return this._name
  }

  constructor(private _name: string) { }

  registerCallback(callback: Callback) {
    this.callbacks.push(callback)
  }

  pushEvent(evt: any) {
    this.callbacks.forEach((callback) => {
      // Todo: use setTimeout to prevent serial execution
      callback(evt)
    })
  }
}