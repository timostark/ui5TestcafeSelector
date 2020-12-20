// Exportable lib

import { Selector } from 'testcafe';

interface UI5SelectorDefIdentification {
    /**
     * For getUI5() the "ui5Id" - for checking, it will search all id patterns (ui5Id, ui5LocalId, domId, lumiraId)
     */
    id?: string;

    /**
     * UI5 ID, including all parent IDs, but without a component ID
     */
    ui5Id?: string,
    /**
     * UI5 ID maintained during creation in the ID field
     */
    ui5LocalId?: string,
    /**
     * DOM ID of the root HTML element - should normally not be used
     */
    domId?: string,
    /**
     * For Lumira Applications: Lumira Identifier
     */
    lumriaId?: string,
    /**
     * true in case the item referes to a cloned item-list (e.g. item 1 in a list)
     */
    idCloned?: boolean,
    /**
     * true in case the id is artifical (so no static id was defined). Do not use that element
     */
    idGenerated?: boolean,
    /**
     * The absolute UI5 Identifier, including all information (getId())
     */
    ui5AbsoluteId?: string
}

interface UI5BindingDefProperty {
    path: string,
    pathRelative: string,
    model: string
}

interface UI5PropertyDefMetadata {
    [property: string]: string | number | boolean;
}

interface UI5LumiraProperty {
    [property: string]: string | number | boolean;
}

interface UI5BindingDefMetadata {
    [binding: string]: UI5BindingDefProperty
}

interface UI5TableData {
    visibleDimensionsCol?: string[];
    visibleDimensionsRow?: string[];
    finalLength?: number;
    data: any[];
}

interface UI5BindingContextDefMetadata {
    [binding: string]: string
}

interface UI5SelectorDefMetadata {
    elementName?: string | string[],
    componentName?: string,
    /**
     * For Lumira Applications: Lumira Element Type
     */
    lumiraType?: string,
    interactable?: boolean
}

interface UI5SelectorDefChildren {
}

interface UI5TableSettings {
    insideATable?: boolean;
    tableRow?: number;
    tableCol?: number;
}


interface UI5SelectorDef {
    /**
     * Identification information, mostly related about ID (getId()) information
     */
    identifier?: UI5SelectorDefIdentification,
    /**
     * Metadata-Information about the control itself
     */
    metadata?: UI5SelectorDefMetadata,
    /**
     * Contains information about related aggregations - structure:
     * AGGREGATION_NAME { length: the length of the aggregation }
     * 
     * Example: { items: { length: 3 }}
     */
    aggregation?: any,
    /**
     * Contains information about related associations - structure:
     * ASSOCIATION_NAME { context: { same structure as binding contexts } }
     * 
     * Example: { selectedItem: { context: { undefined: { selectedKey: '02' } }
     */
    association?: any,
    /**
     * Contains information about related binding contexts - structure:
     * MODEL_NAME { DYNAMIC_VALUES_OF_THE_BINDING }
     * 
     * Example: { undefined: { purchaseOrderId: '12345' }}
     */
    context?: any,

    /**
     * Identical to "context", but not using any model-name, for better upgradeability
     * It is searching for local bindings and taking the model-name defined here..
     * 
     */
    smartContext?: any,

    tableData?: UI5TableData,

    binding?: UI5BindingDefMetadata,

    bindingContext?: UI5BindingContextDefMetadata,

    itemdata?: any,

    property?: UI5PropertyDefMetadata,

    lumiraProperty?: UI5LumiraProperty,

    domChildWith?: string,

    parentAnyLevel?: UI5SelectorDef;

    /**
     * Information about the direct parent
     */
    parent?: UI5SelectorDef,
    /**
     * Information about the parent of the parent (Level 2)
     */
    parentL2?: UI5SelectorDef,
    /**
     * Information about the 3 elements above the current item (Level 3)
     */
    parentL3?: UI5SelectorDef,
    /**
     * Information about the 4 elements above the current item (Level 4)
     */
    parentL4?: UI5SelectorDef,
    children?: UI5SelectorDef[],

    /**
     * Set in case any parent is of type sap.m.Table, sap.ui.table.Table, sap.ui.table.TreeTable or sap.zen.crosstab.Crosstab
     */
    tableSettings?: UI5TableSettings;
}

type UI5DataCallback = (element: UI5SelectorDef) => any;

interface SupportAssistantResultLine {
    context: string,
    details: string
}

interface SupportAssistantResult {
    High: SupportAssistantResultLine[];
    Medium: SupportAssistantResultLine[];
    Low: SupportAssistantResultLine[];
}

interface Utils {
    boLogin(t: TestController, userName: string, password: string): void;
    launchpadLogin(t: TestController, userName: string, password: string): void;
    supportAssistant(t: TestController, componentNamem?: string): SupportAssistantResult;
}

declare global {
    interface Selector {
        /**
         * Retrieves all information available to be asserted on, for expect calls
         * Please note that using an await to retrieve the values is not perfect - instead a function like approach should be taken
         * example:
         * t.expect( UI5Selector("id").getUI5(({ element }) => element.property.selectedKey) ).eql(3);
         * or without arrow function
         * t.expect( UI5Selector("id").getUI5(function(e) { return e.property.selectedKey }).eql(3) )
         */
        getUI5(filter?: UI5DataCallback): UI5SelectorDef | any;
    }
}

export var utils: Utils
export function UI5Selector(id: UI5SelectorDef | string, options?: SelectorOptions): Selector
export function waitForUI5(): Promise<void>
