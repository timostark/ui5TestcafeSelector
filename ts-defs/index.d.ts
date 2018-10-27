// Exportable lib

import { Selector } from 'testcafe';

declare global {
    interface UI5SelectorDefIdentification {
        /**
         * UI5 ID, including all parent IDs, but without a component ID
         */
        ui5Id: string,
        /**
         * UI5 ID maintained during creation in the ID field
         */
        ui5LocalId: string,
        /**
         * DOM ID of the root HTML element - should normally not be used
         */
        domId: string,
        /**
         * true in case the item referes to a cloned item-list (e.g. item 1 in a list)
         */
        idCloned: boolean,
        /**
         * true in case the id is artifical (so no static id was defined). Do not use that element
         */
        idGenerated: boolean,
        /**
         * The absolute UI5 Identifier, including all information (getId())
         */
        ui5AbsoluteId: string
    };

    interface UI5SelectorDefMetadata {
        elementName: string,
        componentName: string
    };

    interface UI5SelectorDefChildren {
    };


    interface UI5SelectorDef {
        /**
         * Identification information, mostly related about ID (getId()) information
         */
        identifier: UI5SelectorDefIdentification,
        /**
         * Metadata-Information about the control itself
         */
        metadata: UI5SelectorDefMetadata,
        /**
         * Contains information about related aggregations - structure:
         * AGGREGATION_NAME { length: the length of the aggregation }
         * 
         * Example: { items: { length: 3 }}
         */
        aggregation: any,
        /**
         * Contains information about related associations - structure:
         * ASSOCIATION_NAME { context: { same structure as binding contexts } }
         * 
         * Example: { selectedItem: { context: { undefined: { selectedKey: '02' } }
         */
        association: any,
        /**
         * Contains information about related binding contexts - structure:
         * MODEL_NAME { DYNAMIC_VALUES_OF_THE_BINDING }
         * 
         * Example: { undefined: { purchaseOrderId: '12345' }}
         */
        context: any,
        /**
         * Information about the direct parent
         */
        parent: UI5SelectorDef,
        /**
         * Information about the parent of the parent (Level 2)
         */
        parentL2: UI5SelectorDef,
        /**
         * Information about the 3 elements above the current item (Level 3)
         */
        parentL3: UI5SelectorDef,
        /**
         * Information about the 4 elements above the current item (Level 4)
         */
        parentL4: UI5SelectorDef,
        children: UI5SelectorDef[]
    };

    type UI5SelectorCallback = (element: UI5SelectorDef) => any;


    interface Selector {
        /**
         * Retrieves all information available to be asserted on, for expect calls
         * Please note that using an await to retrieve the values is not perfect - instead a function like approach should be taken
         * example:
         * t.expect( UI5Selector("id").getUI5(({ element }) => element.property.selectedKey) ).eql(3);
         * or without arrow function
         * t.expect( UI5Selector("id").getUI5(function(e) { return e.property.selectedKey }).eql(3) )
         */
        getUI5(filter?: UI5SelectorCallback): UI5SelectorDef;
    };
}



export function UI5Selector(id: UI5SelectorDef | string): Selector
export function waitForUI5(): Promise<void>