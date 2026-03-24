import * as React from 'react';
import { useMarket, Trade } from './marketContext';

const TICK = 0.5;
const LEVELS = 14;

type Level = { price: number; size: number; total: number };

function weightedSize() {
    return parseFloat((Math.pow(Math.random(), 1.8) * 6 + 0.02).toFixed(4));
}

function buildBook(mid: number): { asks: Level[]; bids: Level[] } {
    const asks: Level[] = [];
    let at = 0;
    for (let i = 0; i < LEVELS; i++) {
        const price = parseFloat((mid + (i + 0.5) * TICK).toFixed(1));
        const size = weightedSize();
        at = parseFloat((at + size).toFixed(4));
        asks.push({ price, size, total: at });
    }
    const bids: Level[] = [];
    let bt = 0;
    for (let i = 0; i < LEVELS; i++) {
        const price = parseFloat((mid - (i + 0.5) * TICK).toFixed(1));
        const size = weightedSize();
        bt = parseFloat((bt + size).toFixed(4));
        bids.push({ price, size, total: bt });
    }
    return { asks, bids };
}

function fmt(n: number, decimals = 1) {
    return n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function fmtPrice(price: number): string {
    const decimals = price > 1000 ? 1 : 2;
    return price.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

const Sparkline: React.FC<{ prices: number[] }> = ({ prices }) => {
    const W = 100;
    const H = 32;
    if (prices.length < 2) return <div style={{ width: W, height: H }} />;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pts = prices
        .map((p, i) => {
            const x = (i / (prices.length - 1)) * W;
            const y = H - ((p - min) / range) * (H - 2) - 1;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    const up = prices[prices.length - 1] >= prices[0];
    return (
        <svg width={W} height={H}>
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

const BookRow: React.FC<{
    level: Level;
    maxTotal: number;
    side: 'ask' | 'bid';
}> = ({ level, maxTotal, side }) => {
    const pct = Math.min((level.total / maxTotal) * 100, 100);
    const color = side === 'ask' ? '#f87171' : '#4ade80';
    const bg = side === 'ask' ? 'rgba(248,113,113,0.10)' : 'rgba(74,222,128,0.10)';
    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                height: 19,
                fontSize: 11,
                fontFamily: 'monospace',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    background: bg,
                    transition: 'width 0.3s ease',
                }}
            />
            <span style={{ flex: 1, color, zIndex: 1 }}>{fmtPrice(level.price)}</span>
            <span style={{ width: 72, textAlign: 'right', zIndex: 1, color: '#cbd5e1' }}>
                {level.size.toFixed(4)}
            </span>
            <span style={{ width: 72, textAlign: 'right', zIndex: 1, color: 'rgba(255,255,255,0.35)' }}>
                {level.total.toFixed(3)}
            </span>
        </div>
    );
};

const TradeRow: React.FC<{ trade: Trade }> = ({ trade }) => {
    const [flash, setFlash] = React.useState(true);
    React.useEffect(() => {
        const t = setTimeout(() => setFlash(false), 400);
        return () => clearTimeout(t);
    }, []);
    const color = trade.side === 'buy' ? '#4ade80' : '#f87171';
    const time = new Date(trade.ms).toISOString().slice(11, 19);
    return (
        <div
            style={{
                display: 'flex',
                padding: '1px 8px',
                fontSize: 11,
                fontFamily: 'monospace',
                background: flash
                    ? trade.side === 'buy'
                        ? 'rgba(74,222,128,0.07)'
                        : 'rgba(248,113,113,0.07)'
                    : 'transparent',
                transition: 'background 0.4s',
            }}
        >
            <span style={{ color: 'rgba(255,255,255,0.3)', width: 64 }}>{time}</span>
            <span style={{ color, flex: 1 }}>{fmtPrice(trade.price)}</span>
            <span style={{ width: 70, textAlign: 'right', color: '#cbd5e1' }}>
                {trade.size.toFixed(4)}
            </span>
        </div>
    );
};

export const OrderBookPanel: React.FC = () => {
    const { selectedTicker, prices, histories, trades } = useMarket();
    const mid = prices[selectedTicker] ?? 0;
    const history = histories[selectedTicker] ?? [mid];
    const prevPrice = history.length > 1 ? history[history.length - 2] : mid;
    const priceUp = mid >= prevPrice;

    const book = React.useMemo(() => buildBook(mid), [mid]);

    const maxTotal = Math.max(
        book.asks[book.asks.length - 1]?.total ?? 1,
        book.bids[book.bids.length - 1]?.total ?? 1
    );

    const spread =
        book.asks[0] && book.bids[0] ? book.asks[0].price - book.bids[0].price : 0;

    const open = history[0] ?? mid;
    const change = mid - open;
    const changePct = ((change / open) * 100).toFixed(2);
    const changeColor = change >= 0 ? '#4ade80' : '#f87171';

    const decimals = mid > 1000 ? 1 : 2;

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#0b0f19',
                color: '#e2e8f0',
                overflow: 'hidden',
                userSelect: 'none',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '10px 12px 8px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    flexShrink: 0,
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                        {selectedTicker}
                    </div>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: priceUp ? '#4ade80' : '#f87171',
                            letterSpacing: '-0.5px',
                            lineHeight: 1,
                        }}
                    >
                        {fmtPrice(mid)}
                    </div>
                    <div style={{ fontSize: 11, color: changeColor, marginTop: 3 }}>
                        {change >= 0 ? '+' : ''}{fmt(change, decimals)} ({change >= 0 ? '+' : ''}{changePct}%)
                    </div>
                </div>
                <Sparkline prices={history} />
            </div>

            {/* Column headers */}
            <div
                style={{
                    display: 'flex',
                    padding: '4px 8px',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.3)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                }}
            >
                <span style={{ flex: 1 }}>Price</span>
                <span style={{ width: 72, textAlign: 'right' }}>Size</span>
                <span style={{ width: 72, textAlign: 'right' }}>Total</span>
            </div>

            {/* Asks */}
            <div
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                }}
            >
                {[...book.asks].reverse().map((level, i) => (
                    <BookRow key={i} level={level} maxTotal={maxTotal} side="ask" />
                ))}
            </div>

            {/* Spread */}
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    padding: '3px 8px',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.03)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    flexShrink: 0,
                }}
            >
                <span>Spread</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>${fmt(spread)}</span>
                <span>({((spread / mid) * 100).toFixed(3)}%)</span>
            </div>

            {/* Bids */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {book.bids.map((level, i) => (
                    <BookRow key={i} level={level} maxTotal={maxTotal} side="bid" />
                ))}
            </div>

            {/* Recent trades */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                <div
                    style={{
                        padding: '4px 8px 2px',
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.3)',
                        display: 'flex',
                        fontFamily: 'monospace',
                    }}
                >
                    <span style={{ width: 64 }}>Time</span>
                    <span style={{ flex: 1 }}>Price</span>
                    <span style={{ width: 70, textAlign: 'right' }}>Size</span>
                </div>
                <div style={{ maxHeight: 120, overflow: 'hidden' }}>
                    {trades.slice(0, 6).map((t) => (
                        <TradeRow key={t.id} trade={t} />
                    ))}
                </div>
            </div>
        </div>
    );
};
