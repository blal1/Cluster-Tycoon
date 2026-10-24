import React from 'react';
import { formatCurrency, spokenCurrency } from '../../constants/gameConfig';

interface MoneyReadoutProps {
  cashUsd: number;
  ratePerSecond: number;
}

export const MoneyReadout: React.FC<MoneyReadoutProps> = ({ cashUsd, ratePerSecond }) => {
  const isPositiveRate = ratePerSecond >= 0;
  const rateFormatted = `${isPositiveRate ? '+' : ''}${formatCurrency(ratePerSecond)}/s`;

  return (
    <div className="ct-money" role="status" aria-label={`Balance: ${spokenCurrency(cashUsd)}, earning ${rateFormatted}`}>
      <span className="ct-money__label">Funds</span>
      <span className="ct-money__value">{formatCurrency(cashUsd)}</span>
      <span className={`ct-money__rate ${isPositiveRate ? 'ct-money__rate--pos' : 'ct-money__rate--neg'}`}>
        <span className="ct-money__pip" aria-hidden="true" />
        <span>{rateFormatted}</span>
      </span>
    </div>
  );
};
