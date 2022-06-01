import { EventProcessor } from "./EventProcessor";

const processor = new EventProcessor()

const input = processor.createInputStream("input")
const output = processor.createOutputStream("output")
output.registerCallback((evt) => console.log(JSON.stringify(evt)))

processor.createJob("Select input.name from input into output where input.temp > 49")

input.pushEvent({ name: "Event 0", temp: 60 })
input.pushEvent({ name: "Event 1", temp: 39 })
input.pushEvent({ name: "Event 2", temp: 49 })
input.pushEvent({ name: "Event 3", temp: 50 })
input.pushEvent({ name: "Event 4", temp: 51 })
input.pushEvent({ name: "Event 5", temp: 70 })
input.pushEvent({ name: "Event 6", temp: 22 })