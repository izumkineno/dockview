import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Type } from '@angular/core';
import {
    CreateContextMenuItemComponentOptions,
    IContextMenuItemComponentProps,
} from 'dockview-core';
import { DockviewAngularComponent } from '../lib/dockview/dockview-angular.component';
import { AngularRenderer } from '../lib/utils/angular-renderer';
import { setupTestBed, getTestComponents } from './__test_utils__/test-helpers';

@Component({
    selector: 'test-context-menu-item',
    template: '<div class="test-menu-item">My Item</div>',
})
class TestContextMenuItemComponent {}

describe('DockviewAngularComponent – context menu', () => {
    let component: DockviewAngularComponent;
    let fixture: ComponentFixture<DockviewAngularComponent>;

    beforeEach(async () => {
        setupTestBed();
        TestBed.overrideModule(
            (await import('../lib/dockview-angular.module'))
                .DockviewAngularModule,
            {}
        );
        await TestBed.compileComponents();

        fixture = TestBed.createComponent(DockviewAngularComponent);
        component = fixture.componentInstance;
        component.components = getTestComponents();
    });

    afterEach(() => {
        component.getDockviewApi()?.dispose();
        fixture.destroy();
        TestBed.resetTestingModule();
    });

    it('getTabContextMenuItems input is accepted without error', () => {
        const getTabContextMenuItems = jest
            .fn()
            .mockReturnValue(['close', 'closeAll']);
        component.getTabContextMenuItems = getTabContextMenuItems;

        expect(() => component.ngOnInit()).not.toThrow();
    });

    it('createContextMenuItemComponent returns an AngularRenderer for a component', () => {
        component.ngOnInit();

        // Access the private method via casting to any
        const frameworkOptions = (component as any).createFrameworkOptions();
        const factory = frameworkOptions.createContextMenuItemComponent;

        expect(factory).toBeDefined();

        const renderer = factory({
            id: 'test-id',
            component: TestContextMenuItemComponent as Type<any>,
        } as CreateContextMenuItemComponentOptions);

        expect(renderer).toBeInstanceOf(AngularRenderer);
    });

    it('createContextMenuItemComponent returns undefined when no component provided', () => {
        component.ngOnInit();

        const frameworkOptions = (component as any).createFrameworkOptions();
        const factory = frameworkOptions.createContextMenuItemComponent;

        const renderer = factory({
            id: 'test-id',
            component: undefined,
        } as CreateContextMenuItemComponentOptions);

        expect(renderer).toBeUndefined();
    });

    it('AngularRenderer returned by factory can be initialised with context menu props', () => {
        component.ngOnInit();

        const frameworkOptions = (component as any).createFrameworkOptions();
        const factory = frameworkOptions.createContextMenuItemComponent;

        const renderer: AngularRenderer = factory({
            id: 'test-id',
            component: TestContextMenuItemComponent as Type<any>,
        } as CreateContextMenuItemComponentOptions);

        const props: IContextMenuItemComponentProps = {
            panel: {} as any,
            group: {} as any,
            api: {} as any,
            close: jest.fn(),
        };

        expect(() => renderer.init(props)).not.toThrow();
        renderer.dispose();
    });
});
