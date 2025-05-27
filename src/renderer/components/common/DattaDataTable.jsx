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

  const total = data.length;
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min(startIndex + rowsPerPage - 1, total);

  return (
    <div className="card table-card">
      <div className="card-header">
        <h5>{'Données'}</h5>
        <div className="card-header-right"></div>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover" width="100%">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key || col.header}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={col.sortable ? (sortConfig?.key === col.key ? (sortConfig.direction === 'descending' ? 'sorting_desc' : 'sorting_asc') : 'sorting') : ''}
                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                  >
                    {col.header}
                    {col.sortable && (
                      <i className="feather icon-chevron-down ms-1"></i>
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
            <div className="dataTables_info">
              Affichage de {startIndex} à {endIndex} sur {total} entrées
            </div>
            <div className="dataTables_paginate paging_simple_numbers">
              <a
                className={`paginate_button previous ${page === 0 ? 'disabled' : ''}`}
                onClick={() => onPageChange && onPageChange(page - 1)}
              >
                Préc.
              </a>
              <span className="mx-2">
                {page + 1} / {Math.ceil(data.length / rowsPerPage)}
              </span>
              <a
                className={`paginate_button next ${(page + 1) * rowsPerPage >= data.length ? 'disabled' : ''}`}
                onClick={() => onPageChange && onPageChange(page + 1)}
              >
                Suiv.
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
