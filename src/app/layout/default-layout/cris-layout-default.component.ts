import {
  Component,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  ComponentFactoryResolver,
  ComponentRef,
  OnDestroy } from '@angular/core';
import { Tab } from 'src/app/core/layout/models/tab.model';
import { CrisLayoutLoaderDirective } from '../directives/cris-layout-loader.directive';
import { TabDataService } from 'src/app/core/layout/tab-data.service';
import { getFirstSucceededRemoteListPayload, getAllSucceededRemoteDataPayload } from 'src/app/core/shared/operators';
import { GenericConstructor } from 'src/app/core/shared/generic-constructor';
import { getCrisLayoutTab } from '../decorators/cris-layout-tab.decorator';
import { CrisLayoutPage } from '../decorators/cris-layout-page.decorator';
import { CrisLayoutPage as CrisLayoutPageObj } from '../models/cris-layout-page.model';
import { LayoutPage } from '../enums/layout-page.enum';
import { hasValue } from 'src/app/shared/empty.util';
import { Subscription } from 'rxjs';
import { EditItemDataService } from 'src/app/core/submission/edititem-data.service';
import { EditItem } from 'src/app/core/submission/models/edititem.model';
import { mergeMap } from 'rxjs/operators';
import { followLink } from 'src/app/shared/utils/follow-link-config.model';
import { EditItemMode } from 'src/app/core/submission/models/edititem-mode.model';

/**
 * This component defines the default layout for all DSpace Items.
 * This component can be overwritten for a specific Item type using
 * CrisLayoutPage decorator
 */
@Component({
  selector: 'ds-cris-layout-default',
  templateUrl: './cris-layout-default.component.html',
  styleUrls: ['./cris-layout-default.component.scss']
})
@CrisLayoutPage(LayoutPage.DEFAULT)
export class CrisLayoutDefaultComponent extends CrisLayoutPageObj implements OnInit, OnDestroy {
  /**
   * This parameter define the status of sidebar (hide/show)
   */
  sidebarStatus = true;
  /**
   * Tabs
   */
  tabs: Tab[];
  /**
   * Directive hook used to place the dynamic child component
   */
  @ViewChild(CrisLayoutLoaderDirective, {static: true}) crisLayoutLoader: CrisLayoutLoaderDirective;

  componentRef: ComponentRef<Component>;
  /**
   * List of subscriptions
   */
  subs: Subscription[] = [];
  /**
   * List of Edit Modes available on this item
   * for the current user
   */
  editModes: EditItemMode[] = [];

  constructor(
    private tabService: TabDataService,
    public cd: ChangeDetectorRef,
    private componentFactoryResolver: ComponentFactoryResolver,
    private editItemService: EditItemDataService
  ) {
    super();
  }

  ngOnInit() {
    // Retrieve tabs by UUID of item
    this.subs.push(this.tabService.findByItem(this.item.id)
      .pipe(getFirstSucceededRemoteListPayload())
      .subscribe(
        (next) => {
          this.tabs = next;
          // Show sidebar only if exists more then one tab
          this.sidebarStatus = !(hasValue(this.tabs) && this.tabs.length > 1);
          this.cd.markForCheck();
        }
    ));
    // Retrieve edit modes
    this.subs.push(this.editItemService.findById(this.item.id + ':none', followLink('modes'))
      .pipe(
        getAllSucceededRemoteDataPayload(),
        mergeMap((editItem: EditItem) => editItem.modes.pipe(
            getFirstSucceededRemoteListPayload())
          )
        ).subscribe(
        (editItemModes) => {
          console.log('EDIT_ITEM: ', editItemModes);
          this.editModes = editItemModes;
        }
      ));
  }

  /**
   * It is used for hide/show the left sidebar
   */
  hideShowSidebar(): void {
    this.sidebarStatus = !this.sidebarStatus;
  }

  /**
   * Set dynamic child component
   */
  changeTab(tab: Tab) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(this.getComponent(tab.shortname));
    const viewContainerRef = this.crisLayoutLoader.viewContainerRef;
    viewContainerRef.clear();

    if (this.componentRef) {
      this.componentRef.destroy();
    }
    this.componentRef = viewContainerRef.createComponent(componentFactory);
    (this.componentRef.instance as any).item = this.item;
    (this.componentRef.instance as any).tab = tab;
  }

  /**
   * Fetch the component depending on the item type and shortname of tab
   * @returns {GenericConstructor<Component>}
   */
  private getComponent(tabShortname: string): GenericConstructor<Component> {
    return getCrisLayoutTab(this.item, tabShortname);
  }

  ngOnDestroy(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
    }
    this.subs.filter((sub) => hasValue(sub)).forEach((sub) => sub.unsubscribe());
  }

  /**
   * Hide the sidebar controll button if exists only one tab
   */
  hideSideBarControl(): boolean {
    return hasValue(this.tabs) && this.tabs.length > 1;
  }
}
