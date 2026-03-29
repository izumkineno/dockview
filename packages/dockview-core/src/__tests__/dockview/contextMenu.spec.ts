import { fireEvent } from '@testing-library/dom';
import { fromPartial } from '@total-typescript/shoehorn';
import { ContextMenuController } from '../../dockview/contextMenu';
import { DockviewComponent } from '../../dockview/dockviewComponent';
import { DockviewGroupPanel } from '../../dockview/dockviewGroupPanel';
import { IDockviewPanel } from '../../dockview/dockviewPanel';
import { PopupService } from '../../dockview/components/popupService';

function makeAccessor(
    overrides: {
        getContextMenuItems?: jest.Mock;
        createContextMenuItemComponent?: jest.Mock;
    } = {}
) {
    const openPopover = jest.fn();
    const close = jest.fn();
    const popupService = fromPartial<PopupService>({ openPopover, close });

    const accessor = fromPartial<DockviewComponent>({
        options: {
            getContextMenuItems: overrides.getContextMenuItems,
            createContextMenuItemComponent:
                overrides.createContextMenuItemComponent,
        },
        api: {} as any,
        popupService,
    });

    return { accessor, openPopover, close };
}

function makePanel(closeFn = jest.fn()) {
    return fromPartial<IDockviewPanel>({ api: { close: closeFn } });
}

function makeGroup(panels: IDockviewPanel[] = []) {
    return fromPartial<DockviewGroupPanel>({ panels });
}

describe('ContextMenuController', () => {
    describe('show()', () => {
        test('calls event.preventDefault()', () => {
            const { accessor } = makeAccessor();
            const controller = new ContextMenuController(accessor);
            const event = new MouseEvent('contextmenu', { cancelable: true });
            const spy = jest.spyOn(event, 'preventDefault');

            controller.show(makePanel(), makeGroup(), event);

            expect(spy).toHaveBeenCalled();
        });

        test('calls popupService.openPopover with correct coordinates', () => {
            const { accessor, openPopover } = makeAccessor();
            const controller = new ContextMenuController(accessor);
            const event = new MouseEvent('contextmenu', {
                clientX: 150,
                clientY: 300,
            });

            controller.show(makePanel(), makeGroup(), event);

            expect(openPopover).toHaveBeenCalledWith(expect.any(HTMLElement), {
                x: 150,
                y: 300,
            });
        });

        test('does not call openPopover when getContextMenuItems returns empty array', () => {
            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest.fn().mockReturnValue([]),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            expect(openPopover).not.toHaveBeenCalled();
        });

        test('shows default menu (close, closeOthers, closeAll) when no callback provided', () => {
            const { accessor, openPopover } = makeAccessor();
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            const items = menuEl.querySelectorAll('.dv-context-menu-item');
            expect(items).toHaveLength(3);
            expect(items[0].textContent).toBe('Close');
            expect(items[1].textContent).toBe('Close Others');
            expect(items[2].textContent).toBe('Close All');
        });

        test('menu element has class dv-context-menu', () => {
            const { accessor, openPopover } = makeAccessor();
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            expect(menuEl.className).toBe('dv-context-menu');
        });
    });

    describe("built-in 'close' item", () => {
        test('calls panel.api.close() and closes popup on click', () => {
            const closePanelMock = jest.fn();
            const { accessor, openPopover, close } = makeAccessor({
                getContextMenuItems: jest.fn().mockReturnValue(['close']),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(closePanelMock),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            fireEvent.click(menuEl.querySelector('.dv-context-menu-item')!);

            expect(closePanelMock).toHaveBeenCalled();
            expect(close).toHaveBeenCalled();
        });
    });

    describe("built-in 'closeOthers' item", () => {
        test('closes all panels except the target panel', () => {
            const close1 = jest.fn();
            const close2 = jest.fn();
            const close3 = jest.fn();

            const panel1 = makePanel(close1);
            const panel2 = makePanel(close2);
            const panel3 = makePanel(close3);

            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest.fn().mockReturnValue(['closeOthers']),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                panel2,
                makeGroup([panel1, panel2, panel3]),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            fireEvent.click(menuEl.querySelector('.dv-context-menu-item')!);

            expect(close1).toHaveBeenCalled();
            expect(close2).not.toHaveBeenCalled();
            expect(close3).toHaveBeenCalled();
        });
    });

    describe("built-in 'closeAll' item", () => {
        test('closes all panels in the group', () => {
            const close1 = jest.fn();
            const close2 = jest.fn();
            const close3 = jest.fn();

            const panel1 = makePanel(close1);
            const panel2 = makePanel(close2);
            const panel3 = makePanel(close3);

            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest.fn().mockReturnValue(['closeAll']),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                panel1,
                makeGroup([panel1, panel2, panel3]),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            fireEvent.click(menuEl.querySelector('.dv-context-menu-item')!);

            expect(close1).toHaveBeenCalled();
            expect(close2).toHaveBeenCalled();
            expect(close3).toHaveBeenCalled();
        });
    });

    describe("built-in 'separator' item", () => {
        test('renders a separator element', () => {
            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest.fn().mockReturnValue(['separator']),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            expect(
                menuEl.querySelectorAll('.dv-context-menu-separator')
            ).toHaveLength(1);
            expect(
                menuEl.querySelectorAll('.dv-context-menu-item')
            ).toHaveLength(0);
        });
    });

    describe('custom label item', () => {
        test('renders label text and calls action on click', () => {
            const actionMock = jest.fn();
            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest
                    .fn()
                    .mockReturnValue([
                        { label: 'My Action', action: actionMock },
                    ]),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            const item = menuEl.querySelector(
                '.dv-context-menu-item'
            ) as HTMLElement;
            expect(item.textContent).toBe('My Action');

            fireEvent.click(item);
            expect(actionMock).toHaveBeenCalled();
        });

        test('does not call action when disabled', () => {
            const actionMock = jest.fn();
            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest
                    .fn()
                    .mockReturnValue([
                        {
                            label: 'Disabled',
                            action: actionMock,
                            disabled: true,
                        },
                    ]),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            const item = menuEl.querySelector(
                '.dv-context-menu-item'
            ) as HTMLElement;
            expect(
                item.classList.contains('dv-context-menu-item--disabled')
            ).toBe(true);
            fireEvent.click(item);
            expect(actionMock).not.toHaveBeenCalled();
        });
    });

    describe('custom component item', () => {
        test('calls createContextMenuItemComponent with the component reference', () => {
            const componentRef = { type: 'my-component' };
            const rendererElement = document.createElement('div');
            const initMock = jest.fn();
            const createContextMenuItemComponent = jest.fn().mockReturnValue({
                element: rendererElement,
                init: initMock,
                dispose: jest.fn(),
            });

            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest
                    .fn()
                    .mockReturnValue([{ component: componentRef }]),
                createContextMenuItemComponent,
            });
            const controller = new ContextMenuController(accessor);

            const panel = makePanel();
            const group = makeGroup();
            controller.show(panel, group, new MouseEvent('contextmenu'));

            expect(createContextMenuItemComponent).toHaveBeenCalledWith(
                expect.objectContaining({ component: componentRef })
            );
            expect(initMock).toHaveBeenCalledWith(
                expect.objectContaining({ panel, group })
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            expect(menuEl.contains(rendererElement)).toBe(true);
        });

        test('init receives a close function that calls popupService.close()', () => {
            const initMock = jest.fn();
            const createContextMenuItemComponent = jest.fn().mockReturnValue({
                element: document.createElement('div'),
                init: initMock,
                dispose: jest.fn(),
            });

            const { accessor, close } = makeAccessor({
                getContextMenuItems: jest
                    .fn()
                    .mockReturnValue([{ component: {} }]),
                createContextMenuItemComponent,
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const { close: closeFn } = initMock.mock.calls[0][0];
            closeFn();
            expect(close).toHaveBeenCalled();
        });

        test('skips item if createContextMenuItemComponent returns undefined', () => {
            const createContextMenuItemComponent = jest
                .fn()
                .mockReturnValue(undefined);
            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest
                    .fn()
                    .mockReturnValue([{ component: {} }]),
                createContextMenuItemComponent,
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            expect(menuEl.children).toHaveLength(0);
        });
    });

    describe('mixed item list', () => {
        test('renders items in order with correct types', () => {
            const { accessor, openPopover } = makeAccessor({
                getContextMenuItems: jest
                    .fn()
                    .mockReturnValue([
                        'close',
                        'separator',
                        { label: 'Custom' },
                        'closeAll',
                    ]),
            });
            const controller = new ContextMenuController(accessor);

            controller.show(
                makePanel(),
                makeGroup(),
                new MouseEvent('contextmenu')
            );

            const menuEl = openPopover.mock.calls[0][0] as HTMLElement;
            expect(menuEl.children).toHaveLength(4);
            expect(menuEl.children[0].className).toBe('dv-context-menu-item');
            expect(menuEl.children[1].className).toBe(
                'dv-context-menu-separator'
            );
            expect(menuEl.children[2].className).toBe('dv-context-menu-item');
            expect(menuEl.children[3].className).toBe('dv-context-menu-item');
        });
    });
});
