import React from 'react';
import { Stepper, Step, StepLabel } from '@mui/material';

/**
 * Wrapper léger autour du Stepper MUI pour l'intégration Datta Able.
 * Les étapes sont passées via children.
 */
export default function DattaStepper({ activeStep = 0, children }) {
  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
      {children}
    </Stepper>
  );
}

export { Step, StepLabel };
