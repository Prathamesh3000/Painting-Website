// An error whose message is safe to show to the client.
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.expose = true
  }
}
const bad = (msg) => new HttpError(400, msg)
module.exports = { HttpError, bad }
