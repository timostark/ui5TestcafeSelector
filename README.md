# ui5TestcafeSelector

This library allows the execution of UI5 specific testcafe scripts, utilizing com

## Install

`$ npm install ui5-testcafe-selector --save-dev`

## Write Tests

### With Chrome Plugin
Ideally you are using the Chrome Plugin ( https://chrome.google.com/webstore/detail/ui5-e2e-test-automation/hcpkckcanianjcbiigbklddcpfiljmhj ) to generate the relevant code.

### With WebIDE
(FOLLOW)

### Manual: Selectors (with Actions)
With UI5 Identifiers:
```js
    import { UI5Selector } from "ui5-testcafe-selector";
    //[...]
    await t.click(UI5Selector("cbType-arrow"));
```

With Complex Properties (for all examples, check the chrome plugins, or the provided auto complete of visual studio code):
```js
    import { UI5Selector } from "ui5-testcafe-selector";
    //[...]
    await t.click(UI5Selector({ "parentL3": { "identifier": { "ui5Id": "cbType" } }, "property": { "key": "04" } }));
```

### Manual: Asserts
Use the getUI5 Function to retrieve client information, to be asserted on. Here as an example, the selectedKeye property.
```js
    import { UI5Selector } from "ui5-testcafe-selector";
    //[...]
    await t.expect(UI5Selector("cbType").getUI5(({ element }) => element.property.selectedKey)).eql('04');
```


## Run Tests
Use the standard testcafe cli. Example:

`$ testcafe chrome test_file.js`

Tip for UI5: The selector timeout is often not high enough. Increase it using "--selector-timeout"
