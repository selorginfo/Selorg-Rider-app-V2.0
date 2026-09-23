import React from 'react';
import {ShiftSelectSheet} from './ShiftSelectSheet';
import {DepositSheet} from './DepositSheet';
import {CancelOrderSheet} from './CancelOrderSheet';
import {BulkExceptionSheet} from './BulkExceptionSheet';

export {BottomSheet} from './BottomSheet';
export {
  ShiftSelectSheet,
  DepositSheet,
  CancelOrderSheet,
  BulkExceptionSheet,
};

/** Phone-level overlay sheets, mounted once above the navigator. */
export function GlobalSheets() {
  return (
    <>
      <ShiftSelectSheet />
      <DepositSheet />
      <CancelOrderSheet />
      <BulkExceptionSheet />
    </>
  );
}
