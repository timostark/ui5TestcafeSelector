import { UI5Selector } from "../lib/index";

fixture('Browse Orders')
    .page('https://openui5.hana.ondemand.com/test-resources/sap/m/demokit/orderbrowser/webapp/test/mockServer.html#');

test('Browse Orders', async t => {
    await t.maximizeWindow();
    
    await t.click(UI5Selector({ metadata: { elementName: "sap.m.ObjectListItem" }, parent: { identifier: { ui5Id: "master--list" } }, binding: { number: { path: "/Orders(7991)/OrderDate" } } }));

    //new route:#/Orders/7991/?tab=shipping
    await t.click(UI5Selector("detail--closeColumn-button"));

    //new route:
    await t.click(UI5Selector({ metadata: { elementName: "sap.m.ObjectListItem" }, parent: { identifier: { ui5Id: "master--list" } }, bindingContext: { undefined: "/Orders(7918)" } }));
});