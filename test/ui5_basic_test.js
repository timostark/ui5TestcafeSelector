import { UI5Selector } from "../lib/index";

fixture('Icon Explorer')
    .page('https://sapui5.hana.ondemand.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html#/overview/SAP-icons/?tab=grid&search=show&icon=show');

test('Browse Orders', async t => {
    await t.maximizeWindow();

    await t.click(UI5Selector({
        metadata: { elementName: "sap.ui.layout.VerticalLayout" }, parentL2: { identifier: { ui5Id: "overview--results" } },
        bindingContext: { undefined: "/SAP-icons/groups/0/icons/505" }
    }));
});