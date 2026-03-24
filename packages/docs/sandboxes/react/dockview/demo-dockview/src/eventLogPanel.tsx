import * as React from 'react';
import { DockviewApi } from 'dockview';

type LogEntry = {
    id: number;
    text: string;
    timestamp: Date;
    category: 'panel' | 'group' | 'layout';
};

let entryId = 0;

const categoryColor = (cat: LogEntry['category']) => {
    switch (cat) {
        case 'panel':
            return '#60a5fa';
        case 'group':
            return '#a78bfa';
        case 'layout':
            return '#34d399';
    }
};

export const EventLogPanel: React.FC<{ api: DockviewApi }> = ({ api }) => {
    const [entries, setEntries] = React.useState<LogEntry[]>([]);

    React.useEffect(() => {
        const add = (text: string, category: LogEntry['category']) => {
            setEntries((prev) =>
                [
                    {
                        id: entryId++,
                        text,
                        timestamp: new Date(),
                        category,
                    },
                    ...prev,
                ].slice(0, 500)
            );
        };

        const disposables = [
            api.onDidAddPanel((e) => add(`Panel added: ${e.id}`, 'panel')),
            api.onDidRemovePanel((e) =>
                add(`Panel removed: ${e.id}`, 'panel')
            ),
            api.onDidActivePanelChange((e) =>
                add(`Active panel: ${e?.id ?? 'none'}`, 'panel')
            ),
            api.onDidMovePanel((e) =>
                add(`Panel moved: ${e.panel.id}`, 'panel')
            ),
            api.onDidAddGroup((e) => add(`Group added: ${e.id}`, 'group')),
            api.onDidRemoveGroup((e) =>
                add(`Group removed: ${e.id}`, 'group')
            ),
            api.onDidActiveGroupChange((e) =>
                add(`Active group: ${e?.id ?? 'none'}`, 'group')
            ),
            api.onDidMaximizedGroupChange((e) =>
                add(
                    `Group ${e.group.api.id} maximized: ${e.isMaximized}`,
                    'group'
                )
            ),
            api.onDidLayoutChange(() => add('Layout changed', 'layout')),
        ];

        return () => disposables.forEach((d) => d.dispose());
    }, [api]);

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#0d1117',
                fontFamily: 'monospace',
                fontSize: 12,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                        style={{
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}
                    >
                        Events
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {(['panel', 'group', 'layout'] as const).map((cat) => (
                            <span
                                key={cat}
                                style={{
                                    fontSize: 10,
                                    color: categoryColor(cat),
                                    opacity: 0.7,
                                }}
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => setEntries([])}
                    style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        borderRadius: 3,
                        fontSize: 11,
                        fontFamily: 'monospace',
                    }}
                >
                    Clear
                </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
                {entries.length === 0 && (
                    <div
                        style={{
                            padding: '12px 10px',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: 11,
                        }}
                    >
                        Interact with the layout to see events...
                    </div>
                )}
                {entries.map((entry) => (
                    <div
                        key={entry.id}
                        style={{
                            display: 'flex',
                            gap: 8,
                            padding: '2px 10px',
                            alignItems: 'baseline',
                        }}
                    >
                        <span
                            style={{
                                color: 'rgba(255,255,255,0.25)',
                                fontSize: 10,
                                flexShrink: 0,
                                width: 72,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                            }}
                        >
                            {entry.timestamp.toISOString().slice(11, 23)}
                        </span>
                        <span
                            style={{
                                color: categoryColor(entry.category),
                                flexShrink: 0,
                                width: 44,
                                fontSize: 10,
                            }}
                        >
                            {entry.category}
                        </span>
                        <span style={{ color: '#e2e8f0' }}>{entry.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
