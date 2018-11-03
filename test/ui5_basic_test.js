import { UI5Selector } from "../lib/index";

fixture('Shopping Cart')
    .page('https://sapui5.hana.ondemand.com/test-resources/sap/m/demokit/cart/webapp/index.html#');

test('Shopping Cart', async t => {
    await t.typeText(UI5Selector("homeView--searchField-I"), "Screen clean");
    await t.click(UI5Selector({ metadata: { elementName: "sap.m.ObjectListItem" }, parent: { identifier: { ui5Id: "homeView--productList" } }, context: { undefined: { ProductId: "HT-1113" } } }));
    await t.click(UI5Selector({ metadata: { elementName: "sap.ui.core.Icon" }, identifier: { ui5LocalId: "img" }, parentL3: { identifier: { ui5Id: "productView--page" } }, property: { src: "sap-icon://cart-3" } }));
    await t.click(UI5Selector({ metadata: { elementName: "sap.ui.core.Icon" }, identifier: { ui5LocalId: "img" }, parentL2: { identifier: { ui5Id: "homeView--page-intHeader" } } }));
    await t.click(UI5Selector("cartView--proceedButton"));
    await t.click(UI5Selector("checkoutView--contentsStep-nextButton"));
    await t.click(UI5Selector("checkoutView--payViaCOD-button"));
    await t.click(UI5Selector("checkoutView--paymentTypeStep-nextButton"));
    await t.typeText(UI5Selector("checkoutView--cashOnDeliveryName-inner"), "Timo");
    await t.typeText(UI5Selector("checkoutView--cashOnDeliveryLastName-inner"), "Stark");
    await t.typeText(UI5Selector("checkoutView--cashOnDeliveryPhoneNumber-inner"), "0123456789");
    await t.typeText(UI5Selector("checkoutView--cashOnDeliveryEmail-inner"), "test@test.de");
    await t.click(UI5Selector("checkoutView--cashOnDeliveryStep-nextButton"));
    await t.click(UI5Selector("checkoutView--differentDeliveryAddress"));
    await t.click(UI5Selector("checkoutView--differentDeliveryAddress"));
    await t.typeText(UI5Selector("checkoutView--invoiceAddressAddress-inner"), "Test");
    await t.typeText(UI5Selector("checkoutView--invoiceAddressCity-inner"), "Munich");
    await t.typeText(UI5Selector("checkoutView--invoiceAddressZip-inner"), "80999");
    await t.typeText(UI5Selector("checkoutView--invoiceAddressCountry-inner"), "Germany");
    await t.typeText(UI5Selector({ domChildWith: "-inner", metadata: { elementName: "sap.m.TextArea" }, parentL3: { identifier: { ui5Id: "checkoutView--invoiceStep" } } }), "This is a small test note");
    await t.click(UI5Selector("checkoutView--invoiceStep-nextButton"));
    await t.click(UI5Selector("checkoutView--deliveryTypeStep-nextButton"));
    await t.click(UI5Selector("checkoutView--submitOrder"));
    await t.click(UI5Selector({ metadata: { elementName: "sap.m.Button" }, property: { text: "Ja" } }));
    await t.click(UI5Selector("orderCompletedView--returnToShopButton"));
});