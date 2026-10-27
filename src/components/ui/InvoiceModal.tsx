import React, { useEffect, useState } from 'react';
import { MonthlyBill } from '../../types/game';
import { dispatch } from '../../store/gameStore';
import { formatCurrency, formatSecondsTime } from '../../constants/gameConfig';
import { audio } from '../../audio/proceduralAudio';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  bill: MonthlyBill;
  cashUsd: number;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ bill, cashUsd }) => {
  const [declined, setDeclined] = useState(false);
  const canAfford = cashUsd >= bill.totalUsd;
  const shortfall = Math.max(0, bill.totalUsd - cashUsd);

  useEffect(() => {
    audio.playInvoiceChime();
    audio.triggerVibrate([100, 50, 100, 50, 200]);
  }, []);

  const handlePay = () => {
    if (!canAfford) {
      audio.playDenied();
      setDeclined(true);
      return;
    }
    dispatch({ type: 'payBill', billId: bill.id });
  };

  const handleDefault = () => {
    dispatch({ type: 'defaultBill', billId: bill.id });
  };

  return (
    <div className="ct-bill-scrim" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
      <div className={`ct-invoice ${declined || !canAfford ? 'ct-invoice--declined' : ''}`}>
        {/* Invoice Header */}
        <div className="ct-invoice__chrome">
          <span className="ct-invoice__mark" aria-hidden="true">
            aws
          </span>
          <div>
            <p className="ct-invoice__vendor">Amazon Web Services</p>
            <h1 className="ct-invoice__title" id="invoice-title">
              Monthly Infrastructure Invoice
            </h1>
          </div>
          <p className="ct-invoice__stamp" aria-hidden="true">
            {declined ? 'OVERDUE' : 'DUE NOW'}
          </p>
        </div>

        {/* Invoice Meta */}
        <dl className="ct-invoice__meta">
          <div>
            <dt>Invoice Ref</dt>
            <dd className="font-mono">{bill.id}</dd>
          </div>
          <div>
            <dt>Elapsed Time</dt>
            <dd>{formatSecondsTime(bill.issuedAtMs / 1000)}</dd>
          </div>
          <div>
            <dt>Billing Period</dt>
            <dd>
              {formatSecondsTime(bill.periodStartMs / 1000)} - {formatSecondsTime(bill.periodEndMs / 1000)}
            </dd>
          </div>
        </dl>

        <p className="ct-invoice__lede">
          {declined
            ? 'Payment was rejected due to insufficient funds. The provider has placed the cluster on hold.'
            : canAfford
            ? 'Simulation paused pending invoice settlement. Pay balance to continue traffic routing.'
            : `Insufficient account balance. Available: ${formatCurrency(cashUsd)} / Due: ${formatCurrency(bill.totalUsd)}.`}
        </p>

        {/* Itemized Services Table */}
        <table className="ct-invoice__table">
          <thead>
            <tr>
              <th scope="col">Cloud Service</th>
              <th scope="col">Usage Description</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.lineItems.map((item, idx) => (
              <tr key={idx}>
                <td>{item.service}</td>
                <td>{item.detail}</td>
                <td className={item.amountUsd < 0 ? 'text-green-400' : ''}>
                  {formatCurrency(item.amountUsd)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="ct-invoice__row ct-invoice__row--total">
              <th scope="row" colSpan={2}>
                Total Due
              </th>
              <td>{formatCurrency(bill.totalUsd)}</td>
            </tr>
            <tr className="ct-invoice__row">
              <th scope="row" colSpan={2}>
                Funds Available
              </th>
              <td style={{ color: canAfford ? 'var(--ct-green)' : 'var(--ct-red)' }}>
                {formatCurrency(cashUsd)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Declined Warning Banner */}
        {declined && (
          <div className="ct-invoice__failure" role="alert">
            <AlertOctagon size={20} className="inline mr-2" />
            <span>
              Invoice payment declined. Deficit: {formatCurrency(shortfall)}. Account suspended.
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="ct-invoice__actions">
          {declined || !canAfford ? (
            <button
              type="button"
              className="ct-invoice__btn ct-invoice__btn--terminate"
              onClick={handleDefault}
            >
              Suspend Cluster (Default)
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ct-invoice__btn ct-invoice__btn--pay"
                onClick={handlePay}
              >
                <CheckCircle2 size={16} className="inline mr-1" />
                Pay Invoice ({formatCurrency(bill.totalUsd)})
              </button>
              <button
                type="button"
                className="ct-invoice__btn ct-invoice__btn--terminate"
                onClick={handleDefault}
              >
                Decline & Suspend
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
