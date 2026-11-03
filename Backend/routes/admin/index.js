const express = require('express')
const { csrf, rejectBadKeys } = require('../../middleware/security')
const { requireAdmin } = require('../../middleware/auth')
const auth = require('./auth')

const router = express.Router()

router.use(csrf)
router.use('/auth', express.json({ limit: '10kb' }), rejectBadKeys, auth.publicRouter) // POST /auth/login only
router.use('/auth', requireAdmin, auth.protectedRouter)

router.use(requireAdmin)
// Bodies are only parsed for authenticated admins (content edits are up to 50 keys x 20k chars).
router.use(express.json({ limit: '1mb' }), rejectBadKeys)
router.use('/dashboard', require('./dashboard'))
router.use('/artworks', require('./artworks'))
router.use('/poems', require('./poems'))
router.use('/orders', require('./orders'))
router.use('/enquiries', require('./enquiries'))
router.use('/content', require('./content'))
router.use('/settings', require('./settings'))
router.use('/media', require('./media'))
router.use('/audit', require('./audit'))

// Unknown admin paths still require a session (handled above), then 404 at app level.
router.loginLimiter = auth.publicRouter.limiter
module.exports = router
