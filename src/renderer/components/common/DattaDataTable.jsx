import React from 'react';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';
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
    <Paper sx={{ width: '100%', overflowX: 'auto' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell
                  key={col.key || col.header}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  sx={{ cursor: col.sortable ? 'pointer' : 'default', fontWeight: 600 }}
                >
                  {col.header}
                  {col.sortable && sortConfig?.key === col.key && (
                    <IconArrowsSort
                      size={14}
                      style={{ marginLeft: 4, transform: sortConfig.direction === 'descending' ? 'rotate(180deg)' : 'none' }}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
            {onColumnFilterChange && (
              <TableRow>
                {columns.map(col => (
                  <TableCell key={`filter-${col.key || col.header}`}> 
                    {col.filterable && (
                      <input
                        type="text"
                        value={columnFilters[col.key] || ''}
                        onChange={e => handleFilterChange(col.key, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
              <TableRow key={keyGetter(row, idx)}>
                {columns.map(col => (
                  <TableCell key={col.key || col.header}> 
                    {col.render ? col.render(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {data.length > rowsPerPage && (
        <TablePagination
          component="div"
          count={data.length}
          page={page}
          onPageChange={(e, newPage) => onPageChange && onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => onRowsPerPageChange && onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      )}
    </Paper>
  );
}
