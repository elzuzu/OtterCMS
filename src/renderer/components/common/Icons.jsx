import React from 'react';

export const EditIcon = props => <i className="feather icon-edit" {...props}></i>;
export const TrashIcon = props => <i className="feather icon-trash" {...props}></i>;
export const SearchIcon = props => <i className="feather icon-search" {...props}></i>;

export const SortIcon = ({ direction, ...props }) => (
  <i
    className={`feather icon-chevron-${direction === 'descending' ? 'down' : 'up'}`}
    style={{ marginLeft: 4 }}
    {...props}
  ></i>
);

export const SuccessIcon = props => <i className="feather icon-check-circle" {...props}></i>;
export const ErrorIcon = props => <i className="feather icon-alert-circle" {...props}></i>;
export const InfoIcon = props => <i className="feather icon-info" {...props}></i>;
export const CloseIcon = props => <i className="feather icon-x" {...props}></i>;
export const TrendUpIcon = props => <i className="feather icon-trending-up" {...props}></i>;
export const TrendDownIcon = props => <i className="feather icon-trending-down" {...props}></i>;
