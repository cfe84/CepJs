import { Job } from "./Execution/Job"
import { InputStream } from "./IO/InputStream"
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
  createInputStream(name: string) {
    const stream = new InputStream({ name })
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
   * Create a query, that will run in a single Job.
   * @param query 
   * @returns New job running the query.
   */
  createQuery(query: string) {
    const tokens = Array.from(Lexer.lex(query))
    const ast = Parser.ParseQuery(tokens)
    return new Job(ast, this.inputStreams, this.outputStreams)
  }
}