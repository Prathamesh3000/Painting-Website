import { useState } from 'react'
import { api, qs } from '../adminApi.js'
import { useFetch, usePageTitle } from '../hooks.js'
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pagination, TableWrap } from '../ui.jsx'
import { formatDate } from '../util.js'

const PAGE_SIZE = 50

export default function Audit() {
  usePageTitle('Audit log')
  const [page, setPage] = useState(1)
  const { data, error, loading, reload } = useFetch(() => api.get('/audit' + qs({ page, pageSize: PAGE_SIZE })), [page])
  return (
    <div>
      <PageHeader title="Audit log" sub="Every change made in the admin, newest first." />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.items.length === 0 ? <Empty>No activity recorded yet.</Empty> : (
        <>
          <TableWrap label="Audit log">
            <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">What</th><th scope="col">Summary</th></tr></thead>
            <tbody>
              {data.items.map((a, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{formatDate(a.at)}</td>
                  <td className="break-all">{a.adminEmail}</td>
                  <td><Badge tone={a.action === 'delete' ? 'danger' : 'plain'}>{a.action}</Badge></td>
                  <td>{a.entity}{a.entityId ? <span className="block text-xs text-mut break-all">{a.entityId}</span> : null}</td>
                  <td className="break-words">{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={data.page || page} pageSize={data.pageSize || PAGE_SIZE} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  )
}
