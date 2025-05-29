import React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

/**
 * Wrapper Tabs MUI pour le thème Datta Able.
 */
export default function DattaTabs({ value, onChange, children }) {
  return (
    <Tabs value={value} onChange={onChange} variant="scrollable" allowScrollButtonsMobile>
      {children}
    </Tabs>
  );
}

export { Tab };
