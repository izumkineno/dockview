import {
    DockviewApi,
    DockviewReact,
    DockviewReadyEvent,
    IDockviewPanelProps,
} from 'dockview';
import * as React from 'react';

const Default = (props: IDockviewPanelProps) => {
    return (
        <div style={{ height: '100%' }}>
            <div>{props.api.title}</div>
        </div>
    );
};

const components = {
    default: Default,
};

const Component = (props: { theme?: string }) => {
    const [api, setApi] = React.useState<DockviewApi>();
    const [smoothTabReorder, setSmoothTabReorder] = React.useState(false);

    const toggleMode = () => {
        const next = !smoothTabReorder;
        setSmoothTabReorder(next);
        api?.updateOptions({ smoothTabReorder: next });
    };

    React.useEffect(() => {
        if (!api) {
            return;
        }

        const disposables = [
            api.onWillShowOverlay((e) => {
                if (e.kind === 'header_space' || e.kind === 'tab') {
                    return;
                }
                e.preventDefault();
            }),
        ];

        return () => {
            disposables.forEach((disposable) => {
                disposable.dispose();
            });
        };
    }, [api]);

    const onReady = (event: DockviewReadyEvent) => {
        setApi(event.api);

        event.api.addPanel({
            id: 'panel_1',
            component: 'default',
        });

        event.api.addPanel({
            id: 'panel_2',
            component: 'default',
        });

        event.api.addPanel({
            id: 'panel_3',
            component: 'default',
        });
        event.api.addPanel({
            id: 'panel_4',
            component: 'default',
        });
        event.api.addPanel({
            id: 'panel_5',
            component: 'default',
        });
    };

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                <button onClick={toggleMode}>
                    {`smoothTabReorder: ${smoothTabReorder}`}
                </button>
            </div>
            <div style={{ flexGrow: 1 }}>
                <DockviewReact
                    className={`${props.theme || 'dockview-theme-abyss'}`}
                    onReady={onReady}
                    components={components}
                    smoothTabReorder={smoothTabReorder}
                    disableFloatingGroups={true}
                />
            </div>
        </div>
    );
};

export default Component;
