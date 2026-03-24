import * as React from 'react';
import { IDockviewPanelProps } from 'dockview';
import { usePanelApiMetadata } from './debugPanel';

const ValueDisplay: React.FC<{ value: unknown }> = ({ value }) => {
    if (value === undefined || value === null) {
        return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>;
    }
    if (typeof value === 'boolean') {
        return (
            <span style={{ color: value ? '#4ade80' : '#f87171' }}>
                {String(value)}
            </span>
        );
    }
    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if ('height' in obj && 'width' in obj) {
            return (
                <span style={{ color: '#94a3b8' }}>
                    {obj.width as number}
                    <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 2px' }}>×</span>
                    {obj.height as number}
                </span>
            );
        }
        if ('type' in obj) {
            return <span style={{ color: '#60a5fa' }}>{String(obj.type)}</span>;
        }
        return (
            <span style={{ color: '#94a3b8' }}>{JSON.stringify(value)}</span>
        );
    }
    return <span style={{ color: '#e2e8f0' }}>{String(value)}</span>;
};

const CountBadge: React.FC<{ count: number }> = ({ count }) => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
            height: 16,
            padding: '0 5px',
            borderRadius: 8,
            fontSize: 10,
            fontFamily: 'monospace',
            background:
                count > 0
                    ? 'rgba(96, 165, 250, 0.15)'
                    : 'rgba(255,255,255,0.05)',
            color: count > 0 ? '#60a5fa' : 'rgba(255,255,255,0.2)',
        }}
    >
        {count}
    </span>
);

export const PanelDebugPanel: React.FC<IDockviewPanelProps> = (props) => {
    const metadata = usePanelApiMetadata(props.api);

    const rows: {
        key: string;
        value: unknown;
        count: number;
        action?: React.ReactNode;
    }[] = [
        { key: 'isActive', value: metadata.isActive.value, count: metadata.isActive.count },
        { key: 'isVisible', value: metadata.isVisible.value, count: metadata.isVisible.count },
        {
            key: 'renderer',
            value: metadata.renderer.value,
            count: metadata.renderer.count,
            action: (
                <button
                    onClick={() =>
                        props.api.setRenderer(
                            props.api.renderer === 'always'
                                ? 'onlyWhenVisible'
                                : 'always'
                        )
                    }
                    style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 10,
                        fontFamily: 'monospace',
                        height: 'auto',
                        outline: 'none',
                    }}
                >
                    toggle
                </button>
            ),
        },
        { key: 'isGroupActive', value: metadata.isGroupActive.value, count: metadata.isGroupActive.count },
        { key: 'location', value: metadata.location.value, count: metadata.location.count },
        { key: 'dimensions', value: metadata.dimensions.value, count: metadata.dimensions.count },
        { key: 'didFocus', value: undefined, count: metadata.didFocus.count },
        { key: 'groupChanged', value: undefined, count: metadata.groupChanged.count },
    ];

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#0d1117',
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: 12,
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                }}
            >
                <span
                    style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'rgba(255,255,255,0.4)',
                    }}
                >
                    Panel API
                </span>
                <span style={{ color: '#60a5fa', fontSize: 11 }}>
                    {props.api.id}
                </span>
            </div>

            {/* Column headers */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '0 12px',
                    padding: '5px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                }}
            >
                <span>Property</span>
                <span style={{ textAlign: 'right' }}>Value</span>
                <span style={{ textAlign: 'right' }}>Events</span>
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {rows.map((row) => (
                    <div
                        key={row.key}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            gap: '0 12px',
                            padding: '5px 12px',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                    >
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {row.key}
                        </span>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                justifyContent: 'flex-end',
                            }}
                        >
                            {row.action}
                            <ValueDisplay value={row.value} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <CountBadge count={row.count} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
