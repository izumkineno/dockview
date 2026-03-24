import * as React from 'react';
import { useMarket, useMarketDispatch, WATCHLIST_TICKERS } from './marketContext';

const Sparkline: React.FC<{ prices: number[]; up: boolean }> = ({ prices, up }) => {
    const W = 56;
    const H = 20;
    if (prices.length < 2) return <div style={{ width: W, height: H }} />;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pts = prices
        .map((p, i) => {
            const x = (i / (prices.length - 1)) * W;
            const y = H - ((p - min) / range) * (H - 4) - 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    return (
        <svg width={W} height={H} style={{ flexShrink: 0 }}>
            <polyline
                points={pts}
                fill="none"
                stroke={up ? '#4ade80' : '#f87171'}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    );
};

function fmtPrice(price: number): string {
    const decimals = price > 1000 ? 1 : 2;
    return price.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export const WatchlistPanel: React.FC = () => {
    const { selectedTicker, prices, histories } = useMarket();
    const dispatch = useMarketDispatch();

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#0d1117',
                color: '#e2e8f0',
                userSelect: 'none',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.4)',
                    flexShrink: 0,
                }}
            >
                Watchlist
            </div>

            {/* Column headers */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: '0 8px',
                    padding: '4px 12px',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    flexShrink: 0,
                }}
            >
                <span>Symbol</span>
                <span style={{ textAlign: 'right' }}>Price</span>
                <span style={{ textAlign: 'right' }}>Chg%</span>
                <span />
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {WATCHLIST_TICKERS.map((ticker) => {
                    const price = prices[ticker] ?? 0;
                    const history = histories[ticker] ?? [price];
                    const open = history[0] ?? price;
                    const change = price - open;
                    const changePct = open > 0 ? ((change / open) * 100) : 0;
                    const up = change >= 0;
                    const isSelected = ticker === selectedTicker;

                    return (
                        <div
                            key={ticker}
                            onClick={() => dispatch({ type: 'SELECT_TICKER', ticker })}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto auto auto',
                                gap: '0 8px',
                                padding: '7px 12px',
                                alignItems: 'center',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                background: isSelected
                                    ? 'rgba(96,165,250,0.08)'
                                    : 'transparent',
                                borderLeft: isSelected
                                    ? '2px solid #60a5fa'
                                    : '2px solid transparent',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    (e.currentTarget as HTMLElement).style.background =
                                        'rgba(255,255,255,0.04)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    (e.currentTarget as HTMLElement).style.background =
                                        'transparent';
                                }
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                    color: isSelected ? '#60a5fa' : '#e2e8f0',
                                }}
                            >
                                {ticker}
                            </span>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    color: up ? '#4ade80' : '#f87171',
                                    textAlign: 'right',
                                }}
                            >
                                {fmtPrice(price)}
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: up ? '#4ade80' : '#f87171',
                                    textAlign: 'right',
                                    minWidth: 52,
                                }}
                            >
                                {up ? '+' : ''}{changePct.toFixed(2)}%
                            </span>
                            <Sparkline prices={history.slice(-30)} up={up} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
