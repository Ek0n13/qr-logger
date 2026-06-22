import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  type SortingState
} from '@tanstack/react-table'
import { ClipboardCopy } from 'lucide-react'
import { useState } from 'react'

import { AppInput, LogButton } from '@renderer/components/AppFormControls'
import { DateFilterPicker } from '@renderer/components/DateFilterPicker'
import { DeleteQrLogDialog } from '@renderer/components/DeleteQrLogDialog'
import { EditQrLogDialog } from '@renderer/components/EditQrLogDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'

type QrLogRecord = Awaited<ReturnType<(typeof window.api.qrLogs)['list']>>[number]

type LogsTableMeta = {
  onCopyQrCode: (log: QrLogRecord) => void | Promise<void>
  onDeleted: (log: QrLogRecord) => Promise<boolean>
  onUpdated: (log: QrLogRecord) => void
}

type LogsTableProps = LogsTableMeta & {
  isLoading: boolean
  logs: QrLogRecord[]
}

function formatDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value)

  if (!match) {
    return value || 'Unknown date'
  }

  const [, year, month, day, hour, minute, second] = match
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`
}

function getDateInputValue(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
}

const dateOnlyFilter: FilterFn<QrLogRecord> = (row, columnId, filterValue) => {
  const query = String(filterValue ?? '').trim()

  if (!query) {
    return true
  }

  return getDateInputValue(row.getValue<string>(columnId)) === query
}

const globalSearchFilter: FilterFn<QrLogRecord> = (row, columnId, filterValue) => {
  const query = String(filterValue ?? '')
    .trim()
    .toLowerCase()

  if (!query) {
    return true
  }

  const rawValue = row.getValue<string>(columnId)
  const value =
    columnId === 'created' || columnId === 'updated' ? formatDateTime(rawValue) : rawValue

  return value.toLowerCase().includes(query)
}

const columns: ColumnDef<QrLogRecord>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => row.original.name
  },
  {
    accessorKey: 'product',
    header: 'Product',
    cell: ({ row }) => row.original.product
  },
  {
    accessorKey: 'created',
    header: 'Created',
    cell: ({ row }) => formatDateTime(row.original.created),
    filterFn: dateOnlyFilter
  },
  {
    accessorKey: 'updated',
    header: 'Updated',
    cell: ({ row }) => formatDateTime(row.original.updated),
    filterFn: dateOnlyFilter
  },
  {
    id: 'actions',
    header: 'Actions',
    enableColumnFilter: false,
    enableGlobalFilter: false,
    enableSorting: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as LogsTableMeta
      const log = row.original

      return (
        <div className="flex justify-end gap-1">
          <LogButton
            type="button"
            variant="default"
            size="sm"
            aria-label={`Copy ${log.name}`}
            onClick={() => void meta.onCopyQrCode(log)}
          >
            <ClipboardCopy className="size-6" />
          </LogButton>
          <EditQrLogDialog log={log} onUpdated={meta.onUpdated} />
          <DeleteQrLogDialog log={log} onDeleted={meta.onDeleted} />
        </div>
      )
    }
  }
]

function LogsTable({
  isLoading,
  logs,
  onCopyQrCode,
  onDeleted,
  onUpdated
}: LogsTableProps): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table exposes table helpers that React Compiler cannot memoize safely.
  const table = useReactTable({
    columns,
    data: logs,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (log) => String(log.id),
    globalFilterFn: globalSearchFilter,
    meta: {
      onCopyQrCode,
      onDeleted,
      onUpdated
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      globalFilter,
      pagination,
      sorting
    }
  })

  const createdFilter = (table.getColumn('created')?.getFilterValue() as string | undefined) ?? ''
  const updatedFilter = (table.getColumn('updated')?.getFilterValue() as string | undefined) ?? ''

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <AppInput
          type="search"
          value={globalFilter}
          placeholder="Search by name, product, created, or updated"
          aria-label="Search logs"
          onChange={(event) => table.setGlobalFilter(event.target.value)}
        />

        <div className="flex flex-wrap gap-3">
          <DateFilterPicker
            label="Created date"
            value={createdFilter}
            onChange={(value) => table.getColumn('created')?.setFilterValue(value)}
          />
          <DateFilterPicker
            label="Updated date"
            value={updatedFilter}
            onChange={(value) => table.getColumn('updated')?.setFilterValue(value)}
          />
        </div>
      </div>

      <div className="p-1 min-h-0 flex-1 rounded-md border-2 bg-white **:data-[slot=table-container]:h-full **:data-[slot=table-container]:overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white shadow-[0_1px_0_0_black]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDirection = header.column.getIsSorted()

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'text-lg',
                        header.column.id === 'actions'
                          ? 'text-right'
                          : header.column.getCanSort()
                            ? 'cursor-pointer select-none'
                            : undefined
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {sortDirection === 'asc' ? ' ↑' : null}
                      {sortDirection === 'desc' ? ' ↓' : null}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-lg">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  No logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-sm">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <LogButton
            type="button"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </LogButton>
          <LogButton
            type="button"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </LogButton>
          <select
            value={table.getState().pagination.pageSize}
            aria-label="Rows per page"
            onChange={(event) => table.setPageSize(Number(event.target.value))}
          >
            {[10, 20, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export { LogsTable }
