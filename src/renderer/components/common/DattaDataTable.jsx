import React from 'react';

export default function DattaDataTable({
  columns = [],
  data = [],
  getRowKey,
  sortConfig,
  onSort,
  columnFilters = {},
  onColumnFilterChange,
  title = 'Données',
  actions,
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
  const totalPages = Math.ceil(total / rowsPerPage);
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min(startIndex + rowsPerPage - 1, total);

  const currentRows = data.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div className="card table-card">
      <div className="card-header">
        <h5>{title || 'Données'}</h5>
        <div className="card-header-right">{actions}</div>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover data-table" width="100%">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key || col.header}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={
                      col.sortable
                        ? sortConfig?.key === col.key
                          ? sortConfig.direction === 'descending'
                            ? 'sorting_desc'
                            : 'sorting_asc'
                          : 'sorting'
                        : ''
                    }
                    style={{
                      cursor: col.sortable ? 'pointer' : 'default',
                      ...(col.thStyle || {})
                    }}
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
                    <th key={`filter-${col.key || col.header}`} style={col.thStyle}>
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
              {currentRows.map((row, idx) => (
                <tr key={keyGetter(row, idx)}>
                  {columns.map(col => (
                    <td key={col.key || col.header} style={col.tdStyle}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > rowsPerPage && (
          <div className="d-flex justify-content-between align-items-center">
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
              {Array.from({ length: totalPages }).map((_, i) => (
                <a
                  key={i}
                  className={`paginate_button ${i === page ? 'current' : ''}`}
                  onClick={() => onPageChange && onPageChange(i)}
                >
                  {i + 1}
                </a>
              ))}
              <a
                className={`paginate_button next ${page + 1 >= totalPages ? 'disabled' : ''}`}
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
