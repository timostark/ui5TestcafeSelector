import { UI5Selector } from '../lib/index';

fixture`ui5-js`
    .page`http://localhost:8080/test/ui5/`;

test('root node', async t => {
    const root = UI5Selector("idComboBox");
    //const test = root.

    await t
        .click(root);
});