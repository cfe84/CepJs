import { Job } from "./Processing/Job"
import { InputStream, InputStreamParameters } from "./IO/InputStream"
import { OutputStream } from "./IO/OutputStream"
import { Lexer } from "./Lexer/Lexer"
import { Parser } from "./Parser/Parser"

export class EventProcessor {
  inputStreams: InputStream[] = []
  outputStreams: OutputStream[] = []

  /**
   * Create an input stream to send events. Needs to be called before the query gets created
   * @param name 
   * @returns 
   */
  createInputStream(name: string | InputStreamParameters) {
    const stream = typeof name === "string" ? new InputStream({ name }) : new InputStream(name)
    this.inputStreams.push(stream)
    return stream
  }

  /**
   * Create an output stream to receive events. Needs to be called before the query gets created.
   * 
   * @param name 
   * @returns 
   */
  createOutputStream(name: string) {
    const stream = new OutputStream(name)
    this.outputStreams.push(stream)
    return stream
  }

  /**
   * Create a job.
   * @param query that will power the Job. 
   * @returns New job running the query.
   */
  createJob(query: string) {
    const tokens = Array.from(Lexer.lex(query))
    const ast = Parser.ParseQuery(tokens)
    return new Job(ast, this.inputStreams, this.outputStreams)
  }
}