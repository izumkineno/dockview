import {
    EdgePanelView,
    IEdgePanelGroup,
    ShellManager,
    EdgePanelsConfig,
} from '../../dockview/dockviewShell';

function makeGroup(): IEdgePanelGroup & { layout: jest.Mock } {
    return {
        element: document.createElement('div'),
        layout: jest.fn(),
    };
}

describe('EdgePanelView', () => {
    describe('construction', () => {
        test('collapsedSize defaults to 35', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'horizontal');
            expect(view.collapsedSize).toBe(35);
        });

        test('expandedMinimumSize = collapsedSize + 50 when minimumSize not provided', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', collapsedSize: 30 },
                group,
                'horizontal'
            );
            // minimumSize when not collapsed = expandedMinimumSize = 30 + 50 = 80
            expect(view.minimumSize).toBe(80);
        });

        test('expandedMinimumSize = provided minimumSize when given', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', minimumSize: 100 },
                group,
                'horizontal'
            );
            expect(view.minimumSize).toBe(100);
        });

        test('lastExpandedSize defaults to 200 when initialSize not provided', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'horizontal');
            expect(view.lastExpandedSize).toBe(200);
        });

        test('lastExpandedSize = provided initialSize', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', initialSize: 350 },
                group,
                'horizontal'
            );
            expect(view.lastExpandedSize).toBe(350);
        });

        test('adds dv-edge-panel CSS class to group element', () => {
            const group = makeGroup();
            new EdgePanelView({ id: 'test' }, group, 'horizontal');
            expect(group.element.classList.contains('dv-edge-panel')).toBe(
                true
            );
        });

        test('sets data-testid = dv-edge-panel-<id>', () => {
            const group = makeGroup();
            new EdgePanelView({ id: 'my-panel' }, group, 'horizontal');
            expect(group.element.dataset.testid).toBe('dv-edge-panel-my-panel');
        });
    });

    describe('minimumSize getter', () => {
        test('returns collapsedSize when collapsed', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', collapsedSize: 40 },
                group,
                'horizontal'
            );
            view.setCollapsed(true);
            expect(view.minimumSize).toBe(40);
        });

        test('returns expandedMinimumSize when expanded', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', collapsedSize: 40, minimumSize: 120 },
                group,
                'horizontal'
            );
            expect(view.minimumSize).toBe(120);
        });
    });

    describe('maximumSize getter', () => {
        test('returns collapsedSize when collapsed', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', collapsedSize: 40 },
                group,
                'horizontal'
            );
            view.setCollapsed(true);
            expect(view.maximumSize).toBe(40);
        });

        test('returns Infinity when expanded and maximumSize not provided', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'horizontal');
            expect(view.maximumSize).toBe(Number.POSITIVE_INFINITY);
        });

        test('returns provided expandedMaximumSize when expanded', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', maximumSize: 600 },
                group,
                'horizontal'
            );
            expect(view.maximumSize).toBe(600);
        });
    });

    describe('setCollapsed', () => {
        test('setCollapsed(true): isCollapsed becomes true and adds dv-fixed-collapsed class', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'horizontal');
            view.setCollapsed(true);
            expect(view.isCollapsed).toBe(true);
            expect(group.element.classList.contains('dv-fixed-collapsed')).toBe(
                true
            );
        });

        test('setCollapsed(false): isCollapsed becomes false and removes dv-fixed-collapsed class', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'horizontal');
            view.setCollapsed(true);
            view.setCollapsed(false);
            expect(view.isCollapsed).toBe(false);
            expect(group.element.classList.contains('dv-fixed-collapsed')).toBe(
                false
            );
        });

        test('setCollapsed(true) twice is a no-op on the second call', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'horizontal');
            view.setCollapsed(true);
            const afterFirst = view.isCollapsed;
            // Calling again with same value should not throw and state stays same
            view.setCollapsed(true);
            expect(view.isCollapsed).toBe(afterFirst);
        });
    });

    describe('layout', () => {
        test('horizontal: calls group.layout(size, orthogonalSize)', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'horizontal');
            view.layout(250, 800);
            expect(group.layout).toHaveBeenCalledWith(250, 800);
        });

        test('vertical: calls group.layout(orthogonalSize, size)', () => {
            const group = makeGroup();
            const view = new EdgePanelView({ id: 'test' }, group, 'vertical');
            view.layout(200, 900);
            // vertical: size=height, orthogonalSize=width → layout(width, height)
            expect(group.layout).toHaveBeenCalledWith(900, 200);
        });

        test('when not collapsed: updates lastExpandedSize', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', initialSize: 200 },
                group,
                'horizontal'
            );
            view.layout(350, 800);
            expect(view.lastExpandedSize).toBe(350);
        });

        test('when collapsed: does NOT update lastExpandedSize', () => {
            const group = makeGroup();
            const view = new EdgePanelView(
                { id: 'test', initialSize: 200 },
                group,
                'horizontal'
            );
            view.setCollapsed(true);
            view.layout(35, 800);
            expect(view.lastExpandedSize).toBe(200);
        });
    });
});

describe('ShellManager', () => {
    let container: HTMLElement;
    let dockviewElement: HTMLElement;
    let layoutGrid: jest.Mock;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        dockviewElement = document.createElement('div');
        layoutGrid = jest.fn();
    });

    afterEach(() => {
        container.parentElement?.removeChild(container);
    });

    function makeShell(
        config: EdgePanelsConfig,
        groups: {
            top?: IEdgePanelGroup;
            bottom?: IEdgePanelGroup;
            left?: IEdgePanelGroup;
            right?: IEdgePanelGroup;
        } = {}
    ): ShellManager {
        return new ShellManager(
            container,
            dockviewElement,
            config,
            groups,
            layoutGrid
        );
    }

    describe('hasEdgePanel', () => {
        test('returns true for configured positions and false for others', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            expect(shell.hasEdgePanel('left')).toBe(true);
            expect(shell.hasEdgePanel('right')).toBe(false);
            expect(shell.hasEdgePanel('top')).toBe(false);
            expect(shell.hasEdgePanel('bottom')).toBe(false);
            shell.dispose();
        });

        test('returns true for all four positions when all configured', () => {
            const shell = makeShell(
                {
                    left: { id: 'left' },
                    right: { id: 'right' },
                    top: { id: 'top' },
                    bottom: { id: 'bottom' },
                },
                {
                    left: makeGroup(),
                    right: makeGroup(),
                    top: makeGroup(),
                    bottom: makeGroup(),
                }
            );
            expect(shell.hasEdgePanel('left')).toBe(true);
            expect(shell.hasEdgePanel('right')).toBe(true);
            expect(shell.hasEdgePanel('top')).toBe(true);
            expect(shell.hasEdgePanel('bottom')).toBe(true);
            shell.dispose();
        });
    });

    describe('setEdgePanelVisible / isEdgePanelVisible', () => {
        test('left panel: visible by default, can be hidden and shown', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            expect(shell.isEdgePanelVisible('left')).toBe(true);
            shell.setEdgePanelVisible('left', false);
            expect(shell.isEdgePanelVisible('left')).toBe(false);
            shell.setEdgePanelVisible('left', true);
            expect(shell.isEdgePanelVisible('left')).toBe(true);
            shell.dispose();
        });

        test('right panel: visible by default, can be hidden', () => {
            const shell = makeShell(
                { right: { id: 'right' } },
                { right: makeGroup() }
            );
            expect(shell.isEdgePanelVisible('right')).toBe(true);
            shell.setEdgePanelVisible('right', false);
            expect(shell.isEdgePanelVisible('right')).toBe(false);
            shell.dispose();
        });

        test('top panel: visible by default, can be hidden', () => {
            const shell = makeShell(
                { top: { id: 'top' } },
                { top: makeGroup() }
            );
            expect(shell.isEdgePanelVisible('top')).toBe(true);
            shell.setEdgePanelVisible('top', false);
            expect(shell.isEdgePanelVisible('top')).toBe(false);
            shell.dispose();
        });

        test('bottom panel: visible by default, can be hidden', () => {
            const shell = makeShell(
                { bottom: { id: 'bottom' } },
                { bottom: makeGroup() }
            );
            expect(shell.isEdgePanelVisible('bottom')).toBe(true);
            shell.setEdgePanelVisible('bottom', false);
            expect(shell.isEdgePanelVisible('bottom')).toBe(false);
            shell.dispose();
        });

        test('unconfigured position always returns false', () => {
            const shell = makeShell({}, {});
            expect(shell.isEdgePanelVisible('left')).toBe(false);
            expect(shell.isEdgePanelVisible('right')).toBe(false);
            expect(shell.isEdgePanelVisible('top')).toBe(false);
            expect(shell.isEdgePanelVisible('bottom')).toBe(false);
            shell.dispose();
        });
    });

    describe('setEdgePanelCollapsed / isEdgePanelCollapsed', () => {
        test('collapse and expand left panel', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            expect(shell.isEdgePanelCollapsed('left')).toBe(false);
            shell.setEdgePanelCollapsed('left', true);
            expect(shell.isEdgePanelCollapsed('left')).toBe(true);
            shell.setEdgePanelCollapsed('left', false);
            expect(shell.isEdgePanelCollapsed('left')).toBe(false);
            shell.dispose();
        });

        test('collapse right panel', () => {
            const shell = makeShell(
                { right: { id: 'right' } },
                { right: makeGroup() }
            );
            shell.setEdgePanelCollapsed('right', true);
            expect(shell.isEdgePanelCollapsed('right')).toBe(true);
            shell.dispose();
        });

        test('collapse top panel', () => {
            const shell = makeShell(
                { top: { id: 'top' } },
                { top: makeGroup() }
            );
            shell.setEdgePanelCollapsed('top', true);
            expect(shell.isEdgePanelCollapsed('top')).toBe(true);
            shell.dispose();
        });

        test('collapse bottom panel', () => {
            const shell = makeShell(
                { bottom: { id: 'bottom' } },
                { bottom: makeGroup() }
            );
            shell.setEdgePanelCollapsed('bottom', true);
            expect(shell.isEdgePanelCollapsed('bottom')).toBe(true);
            shell.dispose();
        });

        test('collapse unconfigured position is a no-op', () => {
            const shell = makeShell({}, {});
            expect(() =>
                shell.setEdgePanelCollapsed('left', true)
            ).not.toThrow();
            expect(shell.isEdgePanelCollapsed('left')).toBe(false);
            shell.dispose();
        });
    });

    describe('toJSON', () => {
        test('includes visible: true and no collapsed field when not collapsed', () => {
            const shell = makeShell(
                { left: { id: 'left', initialSize: 250 } },
                { left: makeGroup() }
            );
            const json = shell.toJSON();
            expect(json.left).toBeDefined();
            expect(json.left!.visible).toBe(true);
            expect(json.left!.collapsed).toBeUndefined();
            shell.dispose();
        });

        test('collapsed field is true when collapsed', () => {
            const shell = makeShell(
                { left: { id: 'left', initialSize: 250 } },
                { left: makeGroup() }
            );
            shell.setEdgePanelCollapsed('left', true);
            const json = shell.toJSON();
            // collapsed flag should be set; avoid asserting pixel size (jsdom has no real layout)
            expect(json.left!.collapsed).toBe(true);
            expect(typeof json.left!.size).toBe('number');
            shell.dispose();
        });

        test('visible is false after hiding the panel', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            shell.setEdgePanelVisible('left', false);
            const json = shell.toJSON();
            expect(json.left!.visible).toBe(false);
            shell.dispose();
        });

        test('unconfigured positions are absent from the result', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            const json = shell.toJSON();
            expect(json.right).toBeUndefined();
            expect(json.top).toBeUndefined();
            expect(json.bottom).toBeUndefined();
            shell.dispose();
        });
    });

    describe('fromJSON', () => {
        test('restores hidden visibility state for left panel', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            shell.fromJSON({ left: { size: 200, visible: false } });
            expect(shell.isEdgePanelVisible('left')).toBe(false);
            shell.dispose();
        });

        test('restores collapsed state for left panel', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            shell.fromJSON({
                left: { size: 200, visible: true, collapsed: true },
            });
            expect(shell.isEdgePanelCollapsed('left')).toBe(true);
            shell.dispose();
        });

        test('restores expanded size for collapsed left panel so expand uses saved size', () => {
            const shell = makeShell(
                { left: { id: 'left', initialSize: 300 } },
                { left: makeGroup() }
            );
            // Simulate a serialised state where the panel was collapsed at 350px expanded
            shell.fromJSON({
                left: { size: 350, visible: true, collapsed: true },
            });
            expect(shell.isEdgePanelCollapsed('left')).toBe(true);
            // lastExpandedSize must be the serialised 350px (not the constructor
            // default of 300px) so that expanding restores the correct size
            const leftView = (shell as any)._leftView as EdgePanelView;
            expect(leftView.lastExpandedSize).toBe(350);
            shell.dispose();
        });

        test('restores hidden visibility state for right panel', () => {
            const shell = makeShell(
                { right: { id: 'right' } },
                { right: makeGroup() }
            );
            shell.fromJSON({ right: { size: 200, visible: false } });
            expect(shell.isEdgePanelVisible('right')).toBe(false);
            shell.dispose();
        });

        test('restores hidden visibility state for top panel', () => {
            const shell = makeShell(
                { top: { id: 'top' } },
                { top: makeGroup() }
            );
            shell.fromJSON({ top: { size: 200, visible: false } });
            expect(shell.isEdgePanelVisible('top')).toBe(false);
            shell.dispose();
        });

        test('restores hidden visibility state for bottom panel', () => {
            const shell = makeShell(
                { bottom: { id: 'bottom' } },
                { bottom: makeGroup() }
            );
            shell.fromJSON({ bottom: { size: 200, visible: false } });
            expect(shell.isEdgePanelVisible('bottom')).toBe(false);
            shell.dispose();
        });
    });

    describe('defaultCollapsedSize', () => {
        test('panels use defaultCollapsedSize when no per-panel collapsedSize is set', () => {
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left' } },
                { left: makeGroup() },
                layoutGrid,
                0,
                48
            );
            const leftView = (shell as any)._leftView as EdgePanelView;
            expect(leftView.collapsedSize).toBe(48);
            shell.dispose();
        });

        test('per-panel collapsedSize overrides defaultCollapsedSize', () => {
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left', collapsedSize: 60 } },
                { left: makeGroup() },
                layoutGrid,
                0,
                48
            );
            const leftView = (shell as any)._leftView as EdgePanelView;
            expect(leftView.collapsedSize).toBe(60);
            shell.dispose();
        });

        test('applies to all four positions', () => {
            const shell = new ShellManager(
                container,
                dockviewElement,
                {
                    top: { id: 'top' },
                    bottom: { id: 'bottom' },
                    left: { id: 'left' },
                    right: { id: 'right' },
                },
                {
                    top: makeGroup(),
                    bottom: makeGroup(),
                    left: makeGroup(),
                    right: makeGroup(),
                },
                layoutGrid,
                0,
                48
            );
            expect((shell as any)._topView.collapsedSize).toBe(48);
            expect((shell as any)._bottomView.collapsedSize).toBe(48);
            expect((shell as any)._leftView.collapsedSize).toBe(48);
            expect((shell as any)._rightView.collapsedSize).toBe(48);
            shell.dispose();
        });
    });

    describe('gap adjustment', () => {
        test('gap is added to collapsedSize for all four positions', () => {
            // All 4 positions: outerN=3, innerN=3, gapAdd = gap*(n-1)/n = 10*2/3
            const shell = new ShellManager(
                container,
                dockviewElement,
                {
                    top: { id: 'top' },
                    bottom: { id: 'bottom' },
                    left: { id: 'left' },
                    right: { id: 'right' },
                },
                {
                    top: makeGroup(),
                    bottom: makeGroup(),
                    left: makeGroup(),
                    right: makeGroup(),
                },
                layoutGrid,
                10,
                44
            );
            const expected = 44 + (10 * 2) / 3; // ≈ 50.667
            expect((shell as any)._topView.collapsedSize).toBeCloseTo(
                expected,
                5
            );
            expect((shell as any)._bottomView.collapsedSize).toBeCloseTo(
                expected,
                5
            );
            expect((shell as any)._leftView.collapsedSize).toBeCloseTo(
                expected,
                5
            );
            expect((shell as any)._rightView.collapsedSize).toBeCloseTo(
                expected,
                5
            );
            shell.dispose();
        });

        test('gap is added on top of per-panel collapsedSize override', () => {
            // Only left configured: outerN=2, outerGapAdd = 10*1/2 = 5
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left', collapsedSize: 60 } },
                { left: makeGroup() },
                layoutGrid,
                10,
                44
            );
            // per-panel 60 + gapAdd 5 = 65
            expect((shell as any)._leftView.collapsedSize).toBe(65);
            shell.dispose();
        });

        test('gap is added to minimumSize when explicitly provided', () => {
            // Only left configured: outerN=2, outerGapAdd = 5
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left', minimumSize: 100 } },
                { left: makeGroup() },
                layoutGrid,
                10,
                44
            );
            // minimumSize 100 + gapAdd 5 = 105
            expect((shell as any)._leftView.minimumSize).toBe(105);
            shell.dispose();
        });

        test('minimumSize is NOT adjusted when not explicitly provided', () => {
            // Only top configured: innerN=2, innerGapAdd = 10*1/2 = 5
            const shell = new ShellManager(
                container,
                dockviewElement,
                { top: { id: 'top' } },
                { top: makeGroup() },
                layoutGrid,
                10,
                44
            );
            // no minimumSize provided → defaults to collapsedSize + 50 = 49 + 50 = 99
            expect((shell as any)._topView.minimumSize).toBe(99);
            shell.dispose();
        });
    });

    describe('dispose', () => {
        test('removes the shell element from the container', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );
            const shellEl = shell.element;
            expect(container.contains(shellEl)).toBe(true);
            shell.dispose();
            expect(container.contains(shellEl)).toBe(false);
        });
    });

    describe('updateTheme', () => {
        test('switching gap=0→10 updates collapsed sizes on all panels', () => {
            // Only left+right configured: outerN=3, outerGapAdd = 10*2/3
            // Only bottom configured:     innerN=2, innerGapAdd = 10*1/2 = 5
            const shell = new ShellManager(
                container,
                dockviewElement,
                {
                    left: { id: 'left' },
                    right: { id: 'right' },
                    bottom: { id: 'bottom' },
                },
                {
                    left: makeGroup(),
                    right: makeGroup(),
                    bottom: makeGroup(),
                },
                layoutGrid,
                0, // initial gap
                35 // initial defaultCollapsedSize
            );

            shell.updateTheme(10, 44);

            const outerGapAdd = (10 * 2) / 3; // ≈ 6.667
            const innerGapAdd = (10 * 1) / 2; // = 5

            expect((shell as any)._leftView.collapsedSize).toBeCloseTo(
                44 + outerGapAdd,
                5
            );
            expect((shell as any)._rightView.collapsedSize).toBeCloseTo(
                44 + outerGapAdd,
                5
            );
            expect((shell as any)._bottomView.collapsedSize).toBe(
                44 + innerGapAdd
            );
            shell.dispose();
        });

        test('switching gap=10→0 resets collapsed sizes to the default', () => {
            // Only left configured: outerN=2, outerGapAdd = 10*1/2 = 5 initially
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left' } },
                { left: makeGroup() },
                layoutGrid,
                10, // initial gap
                44 // initial defaultCollapsedSize
            );

            // initial collapsed size = 44 + 5 = 49
            expect((shell as any)._leftView.collapsedSize).toBe(49);

            shell.updateTheme(0, 35);

            // After theme switch: gap=0 → gapAdd=0, defaultCollapsedSize=35
            expect((shell as any)._leftView.collapsedSize).toBe(35);
            shell.dispose();
        });

        test('per-panel collapsedSize override is respected after updateTheme', () => {
            // Only left with explicit collapsedSize; outerN=2
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left', collapsedSize: 40 } },
                { left: makeGroup() },
                layoutGrid,
                0,
                35
            );

            shell.updateTheme(10, 44); // outerGapAdd = 10*1/2 = 5

            // original collapsedSize=40, gapAdd=5 → 45
            expect((shell as any)._leftView.collapsedSize).toBe(45);
            shell.dispose();
        });

        test('per-panel minimumSize is adjusted by new gapAdd after updateTheme', () => {
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left', minimumSize: 100 } },
                { left: makeGroup() },
                layoutGrid,
                0,
                35
            );

            shell.updateTheme(10, 44); // outerGapAdd = 5

            // minimumSize 100 + gapAdd 5 = 105
            expect((shell as any)._leftView.minimumSize).toBe(105);
            shell.dispose();
        });

        test('minimumSize defaults to collapsedSize+50 when not provided after updateTheme', () => {
            const shell = new ShellManager(
                container,
                dockviewElement,
                { bottom: { id: 'bottom' } },
                { bottom: makeGroup() },
                layoutGrid,
                0,
                35
            );

            shell.updateTheme(10, 44); // innerN=2, innerGapAdd=5

            // collapsedSize = 44+5 = 49, minimumSize = 49+50 = 99
            expect((shell as any)._bottomView.collapsedSize).toBe(49);
            expect((shell as any)._bottomView.minimumSize).toBe(99);
            shell.dispose();
        });

        test('updateTheme updates the outer splitview margin', () => {
            const shell = makeShell(
                { left: { id: 'left' } },
                { left: makeGroup() }
            );

            shell.updateTheme(10, 44);

            expect((shell as any)._outerSplitview.margin).toBe(10);
            shell.dispose();
        });

        test('updateTheme updates the inner (middle column) splitview margin', () => {
            const shell = makeShell(
                { bottom: { id: 'bottom' } },
                { bottom: makeGroup() }
            );

            shell.updateTheme(10, 44);

            expect((shell as any)._middleColumn._splitview.margin).toBe(10);
            shell.dispose();
        });

        test('a currently-collapsed panel keeps isCollapsed=true after updateTheme', () => {
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left' } },
                { left: makeGroup() },
                layoutGrid,
                0,
                35
            );
            shell.setEdgePanelCollapsed('left', true);
            expect(shell.isEdgePanelCollapsed('left')).toBe(true);

            shell.updateTheme(10, 44);

            expect(shell.isEdgePanelCollapsed('left')).toBe(true);
            shell.dispose();
        });

        test('updateTheme is idempotent — calling twice with same args gives same result', () => {
            const shell = new ShellManager(
                container,
                dockviewElement,
                { left: { id: 'left' } },
                { left: makeGroup() },
                layoutGrid,
                0,
                35
            );

            shell.updateTheme(10, 44);
            const sizeAfterFirst = (shell as any)._leftView.collapsedSize;

            shell.updateTheme(10, 44);
            expect((shell as any)._leftView.collapsedSize).toBe(sizeAfterFirst);
            shell.dispose();
        });
    });
});
