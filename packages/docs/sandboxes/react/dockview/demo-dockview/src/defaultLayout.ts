import { DockviewApi } from 'dockview';

export const nextId = (() => {
    let counter = 0;
    return () => counter++;
})();

export function defaultConfig(api: DockviewApi) {
    // Left column: watchlist (top) + price alert (bottom)
    const watchlist = api.addPanel({
        id: 'watchlist',
        component: 'watchlist',
        title: 'Watchlist',
        renderer: 'always',
    });

    const pricealert = api.addPanel({
        id: 'pricealert',
        component: 'pricealert',
        title: 'Price Alert',
        renderer: 'always',
        position: { referencePanel: watchlist, direction: 'below' },
    });

    // Centre column: order book (top) + orders grid (bottom)
    const orderbook = api.addPanel({
        id: 'orderbook',
        component: 'orderbook',
        title: 'Order Book',
        renderer: 'always',
        position: { referencePanel: watchlist, direction: 'right' },
    });

    const orders = api.addPanel({
        id: 'orders',
        component: 'orders',
        title: 'Orders',
        renderer: 'always',
        position: { referencePanel: orderbook, direction: 'below' },
    });

    api.addPanel({
        id: 'vesselfinder',
        component: 'vesselfinder',
        title: 'VesselFinder',
        position: { referencePanel: orders },
    });

    // Right column: position summary (top) + dev panels (bottom, tabbed)
    const positionsummary = api.addPanel({
        id: 'positionsummary',
        component: 'positionsummary',
        title: 'Positions',
        renderer: 'always',
        position: { referencePanel: orderbook, direction: 'right' },
    });

    const eventlog = api.addPanel({
        id: 'eventlog',
        component: 'eventlog',
        title: 'Events',
        renderer: 'always',
        position: { referencePanel: positionsummary, direction: 'below' },
    });

    api.addPanel({
        id: 'layoutinspector',
        component: 'layoutinspector',
        title: 'Layout JSON',
        renderer: 'always',
        position: { referencePanel: eventlog },
    });

    api.addPanel({
        id: 'debuginfo',
        component: 'debuginfo',
        title: 'Panel Debug',
        renderer: 'always',
        position: { referencePanel: eventlog },
    });

    // Set active panels
    watchlist.api.setActive();
    orderbook.api.setActive();
    orders.api.setActive();
    positionsummary.api.setActive();
    eventlog.api.setActive();
}
