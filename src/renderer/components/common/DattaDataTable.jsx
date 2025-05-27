import React from 'react';
import { IconArrowsSort } from '@tabler/icons-react';

export default function DattaDataTable({
  columns = [],
  data = [],
  getRowKey,
  sortConfig,
  onSort,
  columnFilters = {},
  onColumnFilterChange,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
}) {
  const keyGetter = getRowKey || ((row, idx) => row.id || idx);

  const handleSort = key => {
    if (onSort) onSort(key);
  };

  const handleFilterChange = (key, value) => {
    if (onColumnFilterChange) {
      onColumnFilterChange({ ...columnFilters, [key]: value });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="m-0 font-weight-bold text-primary">Données</h6>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered" width="100%">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key || col.header}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                  >
                    {col.header}
                    {col.sortable && sortConfig?.key === col.key && (
                      <i
                        className="fas fa-sort"
                        style={{ marginLeft: 4, transform: sortConfig.direction === 'descending' ? 'rotate(180deg)' : 'none' }}
                      ></i>
                    )}
                  </th>
                ))}
              </tr>
              {onColumnFilterChange && (
                <tr className="filter-row">
                  {columns.map(col => (
                    <th key={`filter-${col.key || col.header}`}>
                      {col.filterable && (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={columnFilters[col.key] || ''}
                          onChange={e => handleFilterChange(col.key, e.target.value)}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                <tr key={keyGetter(row, idx)}>
                  {columns.map(col => (
                    <td key={col.key || col.header}>{col.render ? col.render(row) : row[col.accessor]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > rowsPerPage && (
          <div className="d-flex justify-content-between align-items-center mt-2">
            <select
              className="form-select form-select-sm"
              value={rowsPerPage}
              onChange={e => onRowsPerPageChange && onRowsPerPageChange(parseInt(e.target.value, 10))}
            >
              {[5, 10, 20, 50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onPageChange && onPageChange(page - 1)}
                disabled={page === 0}
              >
                Préc.
              </button>
              <span className="mx-2">
                {page + 1} / {Math.ceil(data.length / rowsPerPage)}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onPageChange && onPageChange(page + 1)}
                disabled={(page + 1) * rowsPerPage >= data.length}
              >
                Suiv.
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
