
import { ClientFunction } from "testcafe";

/*eslint-disable no-unused-vars*/
export default function waitForUI5() {

    return ClientFunction(() => {
        return new Promise((resolve, reject) => {
            var fnTest = function () {
                if (typeof sap === "undefined" || typeof sap.ui === "undefined" || typeof sap.ui.getCore === "undefined" || !sap.ui.getCore() || !sap.ui.getCore().isInitialized()) {
                    setTimeout(100, fnTest);
                    return;
                }
                if (sap.ui.getCore().getUIDirty() === true) {
                    setTimeout(100, fnTest);
                    return;
                }
                resolve();
            };
            fnTest();
        });
    })();
}