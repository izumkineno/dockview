import { DockviewComponent } from './dockviewComponent';
import { DockviewGroupPanel } from './dockviewGroupPanel';
import { IDockviewPanel } from './dockviewPanel';
import { ContextMenuItem } from './options';

function buildItem(
    label: string,
    close: () => void,
    action: () => void,
    disabled?: boolean
): HTMLElement {
    const el = document.createElement('div');
    el.className = 'dv-context-menu-item';
    if (disabled) {
        el.classList.add('dv-context-menu-item--disabled');
    }
    el.textContent = label;
    if (!disabled) {
        el.addEventListener('click', () => {
            action();
            close();
        });
    }
    return el;
}

function buildSeparator(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'dv-context-menu-separator';
    return el;
}

export class ContextMenuController {
    constructor(private readonly accessor: DockviewComponent) {}

    show(
        panel: IDockviewPanel,
        group: DockviewGroupPanel,
        event: MouseEvent
    ): void {
        event.preventDefault();

        const items: ContextMenuItem[] =
            this.accessor.options.getContextMenuItems?.({
                panel,
                group,
                api: this.accessor.api,
                event,
            }) ?? ['close', 'closeOthers', 'closeAll'];

        if (items.length === 0) {
            return;
        }

        const close = () => this.accessor.popupService.close();
        const menuEl = document.createElement('div');
        menuEl.className = 'dv-context-menu';

        for (const item of items) {
            if (item === 'separator') {
                menuEl.appendChild(buildSeparator());
            } else if (item === 'close') {
                menuEl.appendChild(
                    buildItem('Close', close, () => panel.api.close())
                );
            } else if (item === 'closeOthers') {
                menuEl.appendChild(
                    buildItem('Close Others', close, () => {
                        group.panels
                            .filter((p) => p !== panel)
                            .forEach((p) => p.api.close());
                    })
                );
            } else if (item === 'closeAll') {
                menuEl.appendChild(
                    buildItem('Close All', close, () => {
                        [...group.panels].forEach((p) => p.api.close());
                    })
                );
            } else if (item.component) {
                const renderer =
                    this.accessor.options.createContextMenuItemComponent?.({
                        id: Math.random().toString(36).slice(2),
                        component: item.component,
                    });
                if (renderer) {
                    renderer.init({
                        panel,
                        group,
                        api: this.accessor.api,
                        close,
                    });
                    menuEl.appendChild(renderer.element);
                }
            } else if (item.label) {
                menuEl.appendChild(
                    buildItem(
                        item.label,
                        close,
                        () => item.action?.(),
                        item.disabled
                    )
                );
            }
        }

        this.accessor.popupService.openPopover(menuEl, {
            x: event.clientX,
            y: event.clientY,
        });
    }
}
