import { Job } from "./Execution/Job"
import { InputStream } from "./IO/InputStream"
import { OutputStream } from "./IO/OutputStream"
import { Lexer } from "./Lexer/Lexer"
import { Parser } from "./Parser/Parser"

export class EventProcessor {
  inputStreams: InputStream[] = []
  outputStreams: OutputStream[] = []

  createInputStream(name: string) {
    const stream = new InputStream({ name })
    this.inputStreams.push(stream)
    return stream
  }

  createOutputStream(name: string) {
    const stream = new OutputStream(name)
    this.outputStreams.push(stream)
    return stream
  }

  createQuery(query: string) {
    const tokens = Array.from(Lexer.lex(query))
    const ast = Parser.ParseQuery(tokens)
    return new Job(ast, this.inputStreams, this.outputStreams)
  }
}