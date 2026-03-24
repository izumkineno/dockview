import * as React from 'react';
import { DockviewApi } from 'dockview';

export const LayoutInspectorPanel: React.FC<{ api: DockviewApi }> = ({
    api,
}) => {
    const [json, setJson] = React.useState<string>('');
    const [copied, setCopied] = React.useState(false);

    const refresh = React.useCallback(() => {
        try {
            setJson(JSON.stringify(api.toJSON(), null, 2));
        } catch {
            setJson('// error serializing layout');
        }
    }, [api]);

    React.useEffect(() => {
        refresh();
        const disposable = api.onDidLayoutChange(refresh);
        return () => disposable.dispose();
    }, [api, refresh]);

    const onCopy = () => {
        navigator.clipboard.writeText(json).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#0d1117',
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
                <span
                    style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontFamily: 'monospace',
                    }}
                >
                    Layout JSON
                </span>
                <button
                    onClick={onCopy}
                    style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: copied ? '#4ade80' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        borderRadius: 3,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        transition: 'color 0.2s',
                    }}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
                <pre
                    style={{
                        margin: 0,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: '#94a3b8',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                    }}
                >
                    {json}
                </pre>
            </div>
        </div>
    );
};
