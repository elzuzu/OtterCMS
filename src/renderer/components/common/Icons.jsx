import React from 'react';
import {
  IconEdit,
  IconTrash,
  IconSearch,
  IconArrowsSort,
  IconCircleCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconX,
  IconTrendingUp,
  IconTrendingDown,
} from '@tabler/icons-react';

export const EditIcon = props => <IconEdit size={16} {...props} />;
export const TrashIcon = props => <IconTrash size={16} {...props} />;
export const SearchIcon = props => <IconSearch size={16} {...props} />;

export const SortIcon = ({ direction, ...props }) => {
  return <IconArrowsSort size={14} style={{ marginLeft: 4, transform: direction === 'descending' ? 'rotate(180deg)' : 'none' }} {...props} />;
};

export const SuccessIcon = props => <IconCircleCheck size={20} {...props} />;
export const ErrorIcon = props => <IconAlertCircle size={20} {...props} />;
export const InfoIcon = props => <IconInfoCircle size={20} {...props} />;
export const CloseIcon = props => <IconX size={16} {...props} />;
export const TrendUpIcon = props => <IconTrendingUp size={16} {...props} />;
export const TrendDownIcon = props => <IconTrendingDown size={16} {...props} />;
