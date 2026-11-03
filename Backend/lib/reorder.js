const { bad } = require('./httpError')
const { oid } = require('./validate')

// Sets `order` by position of the given ids; documents not mentioned keep their relative order after them.
async function reorder(Model, ids) {
  if (!Array.isArray(ids) || ids.length > 2000) throw bad('ids must be an array of ids.')
  const clean = ids.map(oid)
  if (clean.some((x) => !x)) throw bad('ids must be valid ids.')
  if (new Set(clean).size !== clean.length) throw bad('ids must not contain duplicates.')

  const all = await Model.find().sort({ order: 1, createdAt: 1 }).select('_id')
  const known = new Set(all.map((d) => String(d._id)))
  if (clean.some((id) => !known.has(id))) throw bad('Unknown id in list.')
  const first = new Set(clean)
  const finalIds = [...clean, ...all.map((d) => String(d._id)).filter((id) => !first.has(id))]
  await Model.bulkWrite(finalIds.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: i } } } })))
  return Model.find().sort({ order: 1, createdAt: 1 })
}

module.exports = { reorder }
