import { getPanelData } from '../../../dnd/dataTransfer';
import {
    addClasses,
    isChildEntirelyVisibleWithinParent,
    OverflowObserver,
    removeClasses,
    toggleClass,
} from '../../../dom';
import { addDisposableListener, Emitter, Event } from '../../../events';
import {
    CompositeDisposable,
    Disposable,
    IValueDisposable,
    MutableDisposable,
} from '../../../lifecycle';
import { Scrollbar } from '../../../scrollbar';
import { DockviewComponent } from '../../dockviewComponent';
import { DockviewGroupPanel } from '../../dockviewGroupPanel';
import { DockviewWillShowOverlayLocationEvent } from '../../events';
import { DockviewPanel, IDockviewPanel } from '../../dockviewPanel';
import { DockviewHeaderDirection } from '../../options';
import { Tab } from '../tab/tab';
import { TabDragEvent, TabDropIndexEvent } from './tabsContainer';

interface TabAnimationState {
    sourceTabId: string;
    sourceIndex: number;
    tabPositions: Map<string, DOMRect>;
    currentInsertionIndex: number | null;
}

export class Tabs extends CompositeDisposable {
    private readonly _element: HTMLElement;
    private readonly _tabsList: HTMLElement;
    private readonly _observerDisposable = new MutableDisposable();
    private readonly _scrollbar: Scrollbar | null = null;

    private _tabs: IValueDisposable<Tab>[] = [];
    private selectedIndex = -1;
    private _showTabsOverflowControl = false;
    private _direction: DockviewHeaderDirection = 'horizontal';
    private _animState: TabAnimationState | null = null;
    private _extendedDropZone: HTMLElement | null = null;

    private readonly _onTabDragStart = new Emitter<TabDragEvent>();
    readonly onTabDragStart: Event<TabDragEvent> = this._onTabDragStart.event;

    private readonly _onDrop = new Emitter<TabDropIndexEvent>();
    readonly onDrop: Event<TabDropIndexEvent> = this._onDrop.event;

    private readonly _onWillShowOverlay =
        new Emitter<DockviewWillShowOverlayLocationEvent>();
    readonly onWillShowOverlay: Event<DockviewWillShowOverlayLocationEvent> =
        this._onWillShowOverlay.event;

    private readonly _onOverflowTabsChange = new Emitter<{
        tabs: string[];
        reset: boolean;
    }>();
    readonly onOverflowTabsChange = this._onOverflowTabsChange.event;

    get showTabsOverflowControl(): boolean {
        return this._showTabsOverflowControl;
    }

    set showTabsOverflowControl(value: boolean) {
        if (this._showTabsOverflowControl == value) {
            return;
        }

        this._showTabsOverflowControl = value;

        if (value) {
            const observer = new OverflowObserver(this._tabsList);

            this._observerDisposable.value = new CompositeDisposable(
                observer,
                observer.onDidChange((event) => {
                    const hasOverflow = event.hasScrollX || event.hasScrollY;
                    this.toggleDropdown({ reset: !hasOverflow });
                }),
                addDisposableListener(this._tabsList, 'scroll', () => {
                    this.toggleDropdown({ reset: false });
                })
            );
        }
    }

    get element(): HTMLElement {
        return this._element;
    }

    get panels(): string[] {
        return this._tabs.map((_) => _.value.panel.id);
    }

    get size(): number {
        return this._tabs.length;
    }

    get tabs(): Tab[] {
        return this._tabs.map((_) => _.value);
    }

    get direction(): DockviewHeaderDirection {
        return this._direction;
    }

    set direction(value: DockviewHeaderDirection) {
        if (this._direction === value) {
            return;
        }

        this._direction = value;
        if (this._scrollbar) {
            this._scrollbar.orientation = value;
        }
        removeClasses(this._tabsList, 'dv-horizontal', 'dv-vertical');
        if (value === 'vertical') {
            addClasses(
                this._tabsList,
                'dv-tabs-container-vertical',
                'dv-vertical'
            );
        } else {
            removeClasses(this._tabsList, 'dv-tabs-container-vertical');
            addClasses(this._tabsList, 'dv-horizontal');
        }

        for (const tab of this._tabs) {
            tab.value.setDirection(value);
        }
    }

    constructor(
        private readonly group: DockviewGroupPanel,
        private readonly accessor: DockviewComponent,
        options: {
            showTabsOverflowControl: boolean;
        }
    ) {
        super();

        this._tabsList = document.createElement('div');
        this._tabsList.className = 'dv-tabs-container';

        this.showTabsOverflowControl = options.showTabsOverflowControl;

        if (accessor.options.scrollbars === 'native') {
            this._element = this._tabsList;
        } else {
            this._scrollbar = new Scrollbar(this._tabsList);
            this._scrollbar.orientation = this.direction;
            this._element = this._scrollbar.element;
            this.addDisposables(this._scrollbar);
        }

        this.addDisposables(
            this._onOverflowTabsChange,
            this._observerDisposable,
            this._onWillShowOverlay,
            this._onDrop,
            this._onTabDragStart,
            addDisposableListener(this.element, 'pointerdown', (event) => {
                if (event.defaultPrevented) {
                    return;
                }

                const isLeftClick = event.button === 0;

                if (isLeftClick) {
                    this.accessor.doSetGroupActive(this.group);
                }
            }),
            addDisposableListener(
                this._tabsList,
                'dragover',
                (event) => {
                    if (!this._animState) {
                        // Check for external drag from another group
                        if (
                            this.accessor.options.tabAnimation !== 'smooth' ||
                            this.accessor.options.disableDnd
                        ) {
                            return;
                        }
                        const data = getPanelData();
                        if (
                            data &&
                            data.panelId &&
                            data.groupId !== this.group.id
                        ) {
                            this._animState = {
                                sourceTabId: data.panelId,
                                sourceIndex: -1,
                                tabPositions: this.snapshotTabPositions(),
                                currentInsertionIndex: null,
                            };
                        } else {
                            return;
                        }
                    }
                    event.preventDefault();
                    // For intra-group drag (sourceIndex >= 0) the gap
                    // animation is the sole visual indicator — clear any
                    // stale anchor overlay that may have been set while the
                    // cursor was over the panel content area or another zone.
                    // External drags (sourceIndex === -1) leave the overlay
                    // to the individual tab Droptargets so cross-group
                    // animation is not disrupted.
                    if (this._animState!.sourceIndex !== -1) {
                        this.group.model.dropTargetContainer?.model?.clear();
                    }
                    this.handleDragOver(event);
                },
                true
            ),
            addDisposableListener(
                this._tabsList,
                'dragleave',
                (event) => {
                    if (!this._animState) {
                        return;
                    }
                    const related = event.relatedTarget as HTMLElement | null;
                    // Ignore moves between children of the tabs list
                    if (related && this._tabsList.contains(related)) {
                        return;
                    }
                    // If moving into the broader drop zone (e.g. void container,
                    // left actions), keep _animState alive so the external
                    // dragover listeners can continue the gap animation.
                    if (related && this._extendedDropZone?.contains(related)) {
                        this.resetTabTransforms();
                        this._animState.currentInsertionIndex = null;
                        return;
                    }
                    this.resetTabTransforms();
                    if (this._animState) {
                        if (this._animState.sourceIndex === -1) {
                            // External drag left the header entirely — clear
                            // state (no dragend will fire on this tab list).
                            // Also clear the anchor overlay: the tab-level
                            // Droptarget onDragLeave does not clear the
                            // override target, so if the drag re-enters
                            // another group's header where canDisplayOverlay
                            // returns false (e.g. same-group smooth mode) the
                            // overlay would remain stranded here.
                            this.group.model.dropTargetContainer?.model?.clear();
                            this._animState = null;
                        } else {
                            this._animState.currentInsertionIndex = null;
                        }
                    }
                },
                true
            ),
            addDisposableListener(this._tabsList, 'dragend', () => {
                // Only fires for cancel (not after successful drop, since
                // source tab is removed from DOM and doesn't bubble)
                this.resetDragAnimation();
            }),
            addDisposableListener(
                this._tabsList,
                'drop',
                (event) => {
                    if (
                        this.accessor.options.tabAnimation !== 'smooth' ||
                        !this._animState ||
                        this._animState.currentInsertionIndex === null
                    ) {
                        return;
                    }

                    event.stopPropagation();
                    event.preventDefault();

                    // The capturing stopPropagation above prevents the
                    // individual tab's Droptarget.onDrop from firing, so
                    // the anchor overlay won't be cleared by that path.
                    // Clear it explicitly here before processing the drop.
                    this.group.model.dropTargetContainer?.model?.clear();

                    const animState = this._animState;
                    this._animState = null;

                    const insertionIndex =
                        animState.currentInsertionIndex as number;
                    const sourceIndex = animState.sourceIndex;
                    // After the source tab is removed, indices after it shift
                    // down by one, so adjust the target index accordingly.
                    const adjustedIndex =
                        insertionIndex -
                        (sourceIndex !== -1 && sourceIndex < insertionIndex
                            ? 1
                            : 0);

                    // No-op: drop at the same position, nothing to animate
                    if (adjustedIndex === sourceIndex) {
                        this.resetTabTransforms();
                        return;
                    }

                    // Snapshot current visual positions (with margins still applied)
                    // before resetting transforms, so FLIP starts from what the
                    // user currently sees — not from a teleported state.
                    const firstPositions = this.snapshotTabPositions();
                    this.resetTabTransforms();
                    this._onDrop.fire({ event, index: adjustedIndex });
                    this.runFlipAnimation(
                        firstPositions,
                        animState.sourceTabId,
                        animState.sourceIndex === -1,
                        {
                            from: Math.min(sourceIndex, adjustedIndex),
                            to: Math.max(sourceIndex, adjustedIndex),
                        }
                    );
                },
                true
            ),
            Disposable.from(() => {
                this.resetDragAnimation();

                for (const { value, disposable } of this._tabs) {
                    disposable.dispose();
                    value.dispose();
                }

                this._tabs = [];
            })
        );
    }

    indexOf(id: string): number {
        return this._tabs.findIndex((tab) => tab.value.panel.id === id);
    }

    isActive(tab: Tab): boolean {
        return (
            this.selectedIndex > -1 &&
            this._tabs[this.selectedIndex].value === tab
        );
    }

    setActivePanel(panel: IDockviewPanel): void {
        const isVertical = this._direction === 'vertical';
        let running = 0;

        for (const tab of this._tabs) {
            const isActivePanel = panel.id === tab.value.panel.id;
            tab.value.setActive(isActivePanel);

            if (isActivePanel) {
                const element = tab.value.element;
                const parentElement = element.parentElement!;

                if (isVertical) {
                    if (
                        running < parentElement.scrollTop ||
                        running + element.clientHeight >
                            parentElement.scrollTop + parentElement.clientHeight
                    ) {
                        parentElement.scrollTop = running;
                    }
                } else {
                    if (
                        running < parentElement.scrollLeft ||
                        running + element.clientWidth >
                            parentElement.scrollLeft + parentElement.clientWidth
                    ) {
                        parentElement.scrollLeft = running;
                    }
                }
            }

            running += isVertical
                ? tab.value.element.clientHeight
                : tab.value.element.clientWidth;
        }
    }

    openPanel(panel: IDockviewPanel, index: number = this._tabs.length): void {
        if (this._tabs.find((tab) => tab.value.panel.id === panel.id)) {
            return;
        }
        const tab = new Tab(panel, this.accessor, this.group);
        tab.setContent(panel.view.tab);
        if (this._direction !== 'horizontal') {
            tab.setDirection(this._direction);
        }

        const disposable = new CompositeDisposable(
            tab.onDragStart((event) => {
                this._onTabDragStart.fire({ nativeEvent: event, panel });

                if (this.accessor.options.tabAnimation === 'smooth') {
                    this._animState = {
                        sourceTabId: panel.id,
                        sourceIndex: this._tabs.findIndex(
                            (x) => x.value === tab
                        ),
                        tabPositions: this.snapshotTabPositions(),
                        currentInsertionIndex: null,
                    };
                }
            }),
            tab.onTabClick((event) => {
                if (event.defaultPrevented) {
                    return;
                }
                if (this.group.api.location.type !== 'fixed') {
                    return;
                }
                if (this.group.activePanel === panel) {
                    // Clicking the active tab toggles expansion
                    if (this.group.api.isCollapsed()) {
                        this.group.api.expand();
                    } else {
                        this.group.api.collapse();
                    }
                } else {
                    // Clicking a non-active tab switches the active tab.
                    // If the group is collapsed, also expand it.
                    this.group.model.openPanel(panel);
                    if (this.group.api.isCollapsed()) {
                        this.group.api.expand();
                    }
                }
            }),
            tab.onPointerDown((event) => {
                if (event.defaultPrevented) {
                    return;
                }

                const isFloatingGroupsEnabled =
                    !this.accessor.options.disableFloatingGroups;

                const isFloatingWithOnePanel =
                    this.group.api.location.type === 'floating' &&
                    this.size === 1;

                if (
                    isFloatingGroupsEnabled &&
                    !isFloatingWithOnePanel &&
                    event.shiftKey
                ) {
                    event.preventDefault();

                    const panel = this.accessor.getGroupPanel(tab.panel.id);

                    const { top, left } = tab.element.getBoundingClientRect();
                    const { top: rootTop, left: rootLeft } =
                        this.accessor.element.getBoundingClientRect();

                    this.accessor.addFloatingGroup(panel as DockviewPanel, {
                        x: left - rootLeft,
                        y: top - rootTop,
                        inDragMode: true,
                    });
                    return;
                }

                switch (event.button) {
                    case 0:
                        if (this.group.api.location.type === 'fixed') {
                            // All tab interaction for fixed groups is handled by
                            // onTabClick to avoid race conditions with active panel state
                        } else {
                            if (this.group.activePanel !== panel) {
                                this.group.model.openPanel(panel);
                            }
                        }
                        break;
                }
            }),
            tab.onDrop((event) => {
                const animState = this._animState;
                this._animState = null;

                const tabIndex = this._tabs.findIndex((x) => x.value === tab);

                if (animState) {
                    const dropIndex =
                        event.position === 'right' ? tabIndex + 1 : tabIndex;
                    const firstPositions = this.snapshotTabPositions();
                    this.resetTabTransforms();

                    this._onDrop.fire({
                        event: event.nativeEvent,
                        index: dropIndex,
                    });

                    this.runFlipAnimation(
                        firstPositions,
                        animState.sourceTabId,
                        animState.sourceIndex === -1,
                        animState.sourceIndex !== -1
                            ? {
                                  from: Math.min(
                                      animState.sourceIndex,
                                      dropIndex
                                  ),
                                  to: Math.max(
                                      animState.sourceIndex,
                                      dropIndex
                                  ),
                              }
                            : undefined
                    );
                } else {
                    // Compute insertion index based on which half of the tab
                    // the pointer is over, then adjust for same-group removal:
                    // when the source tab sits before the insertion point,
                    // removing it shifts all subsequent indices down by one.
                    const afterPosition =
                        this._direction === 'vertical' ? 'bottom' : 'right';
                    const insertionIndex =
                        event.position === afterPosition
                            ? tabIndex + 1
                            : tabIndex;
                    const data = getPanelData();
                    const sourceIndex = data
                        ? this._tabs.findIndex(
                              (x) => x.value.panel.id === data.panelId
                          )
                        : -1;
                    const adjustedIndex =
                        insertionIndex -
                        (sourceIndex !== -1 && sourceIndex < insertionIndex
                            ? 1
                            : 0);
                    this._onDrop.fire({
                        event: event.nativeEvent,
                        index: adjustedIndex,
                    });
                }
            }),
            tab.onWillShowOverlay((event) => {
                this._onWillShowOverlay.fire(
                    new DockviewWillShowOverlayLocationEvent(event, {
                        kind: 'tab',
                        panel: this.group.activePanel,
                        api: this.accessor.api,
                        group: this.group,
                        getData: getPanelData,
                    })
                );
            })
        );

        const value: IValueDisposable<Tab> = { value: tab, disposable };

        this.addTab(value, index);

        // If a tab was added during active drag, refresh positions
        if (this._animState) {
            this._animState.tabPositions = this.snapshotTabPositions();
            this.applyDragOverTransforms();
        }
    }

    delete(id: string): void {
        if (this._animState?.sourceTabId === id) {
            this.resetTabTransforms();
            this._animState = null;
        }

        const index = this.indexOf(id);
        const tabToRemove = this._tabs.splice(index, 1)[0];

        const { value, disposable } = tabToRemove;

        disposable.dispose();
        value.dispose();
        value.element.remove();

        // If a non-source tab was removed during active drag, refresh positions
        if (this._animState) {
            this._animState.tabPositions = this.snapshotTabPositions();
            this.applyDragOverTransforms();
        }
    }

    private addTab(
        tab: IValueDisposable<Tab>,
        index: number = this._tabs.length
    ): void {
        if (index < 0 || index > this._tabs.length) {
            throw new Error('invalid location');
        }

        this._tabsList.insertBefore(
            tab.value.element,
            this._tabsList.children[index]
        );

        this._tabs = [
            ...this._tabs.slice(0, index),
            tab,
            ...this._tabs.slice(index),
        ];

        if (this.selectedIndex < 0) {
            this.selectedIndex = index;
        }
    }

    private toggleDropdown(options: { reset: boolean }): void {
        const tabs = options.reset
            ? []
            : this._tabs
                  .filter(
                      (tab) =>
                          !isChildEntirelyVisibleWithinParent(
                              tab.value.element,
                              this._tabsList
                          )
                  )
                  .map((x) => x.value.panel.id);

        this._onOverflowTabsChange.fire({ tabs, reset: options.reset });
    }

    updateDragAndDropState(): void {
        for (const tab of this._tabs) {
            tab.value.updateDragAndDropState();
        }
    }

    /**
     * Sets the broader container that is part of the same logical drop surface
     * as this tab list (e.g. the full header element).  When a dragleave from
     * the tabs list lands inside this container, `_animState` is preserved so
     * that external dragover listeners can continue the animation.
     */
    setExtendedDropZone(el: HTMLElement): void {
        this._extendedDropZone = el;
    }

    /**
     * Allows external elements (e.g. void container, left actions) to push an
     * insertion index into the animation while the cursor is outside the tabs
     * list itself.  Pass `null` to clear the indicator.
     */
    setExternalInsertionIndex(index: number | null): void {
        if (!this._animState) {
            return;
        }
        if (index === this._animState.currentInsertionIndex) {
            return;
        }
        this._animState.currentInsertionIndex = index;
        this.applyDragOverTransforms();
    }

    /**
     * Called when the drag cursor leaves the entire header area (not just the
     * tabs list).  Clears animation state for cross-group drags, which never
     * receive a `dragend` event on this tab list.
     */
    clearExternalAnimState(): void {
        if (!this._animState) {
            return;
        }
        this.resetTabTransforms();
        if (this._animState.sourceIndex === -1) {
            this._animState = null;
        } else {
            this._animState.currentInsertionIndex = null;
        }
    }

    private snapshotTabPositions(): Map<string, DOMRect> {
        const positions = new Map<string, DOMRect>();
        for (const tab of this._tabs) {
            positions.set(
                tab.value.panel.id,
                tab.value.element.getBoundingClientRect()
            );
        }
        return positions;
    }

    private getAverageTabSize(): number {
        if (this._tabs.length === 0) {
            return 0;
        }
        const isVertical = this._direction === 'vertical';
        let total = 0;
        for (const tab of this._tabs) {
            const rect = tab.value.element.getBoundingClientRect();
            total += isVertical ? rect.height : rect.width;
        }
        return total / this._tabs.length;
    }

    private handleDragOver(event: DragEvent): void {
        if (!this._animState) {
            return;
        }

        const isVertical = this._direction === 'vertical';
        const mousePos = isVertical ? event.clientY : event.clientX;
        let insertionIndex: number | null = null;

        for (let i = 0; i < this._tabs.length; i++) {
            const tab = this._tabs[i].value;
            if (tab.panel.id === this._animState.sourceTabId) {
                continue;
            }
            const rect = tab.element.getBoundingClientRect();
            const midpoint = isVertical
                ? rect.top + rect.height / 2
                : rect.left + rect.width / 2;

            if (mousePos < midpoint) {
                insertionIndex = i;
                break;
            }
            insertionIndex = i + 1;
        }

        if (insertionIndex === this._animState.currentInsertionIndex) {
            return;
        }

        this._animState.currentInsertionIndex = insertionIndex;
        this.applyDragOverTransforms();
    }

    private applyDragOverTransforms(): void {
        if (
            !this._animState ||
            this._animState.currentInsertionIndex === null
        ) {
            this.resetTabTransforms();
            return;
        }

        const isVertical = this._direction === 'vertical';
        // Leading margin: applied to the first tab at/after the insertion point
        const marginLeadProp = isVertical ? 'marginTop' : 'marginLeft';
        const marginLeadCssProp = isVertical ? 'margin-top' : 'margin-left';
        // Trailing margin: applied to the last tab when inserting at the end
        const marginTrailProp = isVertical ? 'marginBottom' : 'marginRight';
        const marginTrailCssProp = isVertical
            ? 'margin-bottom'
            : 'margin-right';

        const insertionIndex = this._animState.currentInsertionIndex;
        const sourceRect = this._animState.tabPositions.get(
            this._animState.sourceTabId
        );
        const gapSize = sourceRect
            ? isVertical
                ? sourceRect.height
                : sourceRect.width
            : this.getAverageTabSize();

        // When inserting at the end (past the last tab's midpoint), no tab sits
        // after the insertion point, so apply a trailing margin to the last
        // non-source tab instead of a leading margin to a non-existent tab.
        const insertAtEnd =
            insertionIndex >= this._tabs.length ||
            (insertionIndex === this._tabs.length - 1 &&
                this._tabs[this._tabs.length - 1]?.value.panel.id ===
                    this._animState.sourceTabId);

        let gapApplied = false;

        for (let i = 0; i < this._tabs.length; i++) {
            const tab = this._tabs[i].value;
            if (tab.panel.id === this._animState.sourceTabId) {
                continue;
            }

            if (insertAtEnd) {
                // Clear any leading margin — trailing margin handles the gap.
                // Keep dv-tab--shifting so the margin-to-0 transition plays;
                // it is removed by resetTabTransforms at drag end.
                if (tab.element.style[marginLeadProp]) {
                    tab.element.style[marginLeadProp] = '0px';
                    toggleClass(tab.element, 'dv-tab--shifting', true);
                }
            } else if (!gapApplied && i >= insertionIndex) {
                tab.element.style[marginLeadProp] = `${gapSize}px`;
                // Clear any stale trailing margin on this tab
                tab.element.style.removeProperty(marginTrailCssProp);
                toggleClass(tab.element, 'dv-tab--shifting', true);
                gapApplied = true;
            } else {
                // Animate lead margin back to 0. Keep dv-tab--shifting so the
                // transition plays; resetTabTransforms cleans up at drag end.
                if (tab.element.style[marginLeadProp]) {
                    tab.element.style[marginLeadProp] = '0px';
                    toggleClass(tab.element, 'dv-tab--shifting', true);
                }
            }
        }

        if (insertAtEnd) {
            // Find the last non-source tab and apply the trailing gap
            for (let i = this._tabs.length - 1; i >= 0; i--) {
                const tab = this._tabs[i].value;
                if (tab.panel.id === this._animState.sourceTabId) {
                    continue;
                }
                tab.element.style[marginTrailProp] = `${gapSize}px`;
                toggleClass(tab.element, 'dv-tab--shifting', true);
                break;
            }
        } else {
            // Clear any stale trailing margins. Keep dv-tab--shifting so the
            // transition plays; resetTabTransforms cleans up at drag end.
            for (const { value: tab } of this._tabs) {
                if (tab.panel.id === this._animState.sourceTabId) {
                    continue;
                }
                if (tab.element.style[marginTrailProp]) {
                    tab.element.style[marginTrailProp] = '0px';
                    toggleClass(tab.element, 'dv-tab--shifting', true);
                }
            }
        }
    }

    private resetTabTransforms(): void {
        for (const tab of this._tabs) {
            tab.value.element.style.removeProperty('margin-left');
            tab.value.element.style.removeProperty('margin-right');
            tab.value.element.style.removeProperty('margin-top');
            tab.value.element.style.removeProperty('margin-bottom');
            tab.value.element.style.removeProperty('transform');
            toggleClass(tab.value.element, 'dv-tab--shifting', false);
        }
    }

    private resetDragAnimation(): void {
        this.resetTabTransforms();
        this._animState = null;

        for (const tab of this._tabs) {
            toggleClass(tab.value.element, 'dv-tab--dragging', false);
        }
    }

    private runFlipAnimation(
        firstPositions: Map<string, DOMRect>,
        sourceTabId: string,
        isCrossGroup: boolean = false,
        animRange?: { from: number; to: number }
    ): void {
        const isVertical = this._direction === 'vertical';
        let hasAnimation = false;

        for (let i = 0; i < this._tabs.length; i++) {
            const tab = this._tabs[i];
            const panelId = tab.value.panel.id;

            if (panelId === sourceTabId) {
                if (isCrossGroup) {
                    // Newly inserted tab: slide in from the end
                    const rect = tab.value.element.getBoundingClientRect();
                    tab.value.element.style.transform = isVertical
                        ? `translateY(${rect.height}px)`
                        : `translateX(${rect.width}px)`;
                    toggleClass(tab.value.element, 'dv-tab--shifting', true);
                    hasAnimation = true;
                }
                continue;
            }

            // Skip tabs outside the affected range (they don't logically move)
            if (
                animRange !== undefined &&
                (i < animRange.from || i > animRange.to)
            ) {
                continue;
            }

            const firstRect = firstPositions.get(panelId);
            if (!firstRect) {
                continue;
            }

            const lastRect = tab.value.element.getBoundingClientRect();
            const delta = isVertical
                ? firstRect.top - lastRect.top
                : firstRect.left - lastRect.left;

            if (Math.abs(delta) < 1) {
                continue;
            }

            tab.value.element.style.transform = isVertical
                ? `translateY(${delta}px)`
                : `translateX(${delta}px)`;
            toggleClass(tab.value.element, 'dv-tab--shifting', true);
            hasAnimation = true;
        }

        if (!hasAnimation) {
            return;
        }

        requestAnimationFrame(() => {
            for (const tab of this._tabs) {
                if (tab.value.element.style.transform) {
                    tab.value.element.style.transform = '';
                }
            }

            const onTransitionEnd = (event: TransitionEvent) => {
                if (event.propertyName === 'transform') {
                    this._tabsList.removeEventListener(
                        'transitionend',
                        onTransitionEnd
                    );
                    for (const tab of this._tabs) {
                        toggleClass(
                            tab.value.element,
                            'dv-tab--shifting',
                            false
                        );
                    }
                }
            };

            this._tabsList.addEventListener('transitionend', onTransitionEnd);
        });
    }
}
