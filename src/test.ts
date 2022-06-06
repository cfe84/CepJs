import { EventProcessor } from "./EventProcessor";

const processor = new EventProcessor()

const measurementInput = processor.createInputStream("input")
const deviceInput = processor.createInputStream("deviceInput")
const output = processor.createOutputStream("output")
output.registerCallback((evt) => console.log(JSON.stringify(evt)))

processor.createJob("Select input.name, input.temp, deviceInput.deviceName from input JOIN deviceInput on input.deviceId == deviceInput.deviceId into output where input.temp > 49")

deviceInput.pushEvent({ deviceName: "device 1", deviceId: "d1" })
deviceInput.pushEvent({ deviceName: "device 2", deviceId: "d2" })

measurementInput.pushEvent({ name: "Event 0", temp: 60, deviceId: "d1" })
measurementInput.pushEvent({ name: "Event 1", temp: 39, deviceId: "d1" })
measurementInput.pushEvent({ name: "Event 2", temp: 49, deviceId: "d1" })
measurementInput.pushEvent({ name: "Event 3", temp: 50, deviceId: "d2" })
measurementInput.pushEvent({ name: "Event 4", temp: 51, deviceId: "d1" })
measurementInput.pushEvent({ name: "Event 5", temp: 70, deviceId: "d1" })
measurementInput.pushEvent({ name: "Event 6", temp: 22, deviceId: "d1" })