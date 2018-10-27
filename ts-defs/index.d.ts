// Exportable lib

import { Selector } from 'testcafe';

declare global {
    interface Selector {
        getUI5(filter?: Function): any;
    }
}

export function UI5Selector(selector: string): Selector