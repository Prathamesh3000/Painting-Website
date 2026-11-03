require('dotenv').config()
const mongoose = require('mongoose')
const { createApp } = require('./app')
const { releaseExpiredHolds } = require('./lib/holds')

let app
try {
  app = createApp()
} catch (err) {
  console.error(err.message)
  process.exit(1)
}

const PORT = process.env.PORT || 5000
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kalpana')
  .then(() => {
    // Auto-release unpaid holds (setting `holdHours`). unref'd so it never keeps the process alive.
    const sweep = () => releaseExpiredHolds()
      .then((n) => { if (n) console.log(`Released ${n} expired unpaid order(s)`) })
      .catch((err) => console.error('hold sweep failed:', err.message))
    const minutes = parseInt(process.env.HOLD_SWEEP_MINUTES, 10) > 0 ? parseInt(process.env.HOLD_SWEEP_MINUTES, 10) : 10
    setInterval(sweep, minutes * 60 * 1000).unref()
    sweep()
    return app.listen(PORT, () => console.log(`API listening on :${PORT}`))
  })
  .catch((err) => { console.error('MongoDB connection failed:', err.message); process.exit(1) })
