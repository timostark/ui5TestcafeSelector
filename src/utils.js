import { Selector, ClientFunction } from 'testcafe';

class Utils {
    constructor() {
    }

    async launchpadLogin(t, userName, password) {
        await t
            .maximizeWindow()
            .typeText(Selector('#USERNAME_FIELD-inner'), userName)
            .typeText(Selector('#PASSWORD_FIELD-inner'), password)
            .click(Selector('#LOGIN_LINK'));
    }

    async supportAssistant(t) {
        await t.click(Selector(".sapUiBody")); //only reason: wait for xhr requests to be finished..
        const oClientFunction = this._supportAssistant().with({ boundTestRun: t });
        return await oClientFunction();
    }

    _supportAssistant(sComponent) {
        return ClientFunction(() => {
            return new Promise(function (resolve) {
                var oReturn = { "High": [], "Medium": [], "Low": [] };
                sap.ui.require(["sap/ui/support/Bootstrap"], function (Bootstrap) {
                    Bootstrap.initSupportRules(["silent"]);
                    jQuery.sap.support.analyze().then(function () {
                        var aIssues = jQuery.sap.support.getLastAnalysisHistory();
                        if (!aIssues) {
                            resolve(oReturn);
                            return;
                        }
                        for (var i = 0; i < aIssues.issues.length; i++) {
                            var oIssue = aIssues.issues[i];
                            if (typeof oReturn[oIssue.severity] === "undefined") {
                                continue;
                            }

                            //ignore webpage scopes for the moment..
                            if (oIssue.context && oIssue.context.id === 'WEBPAGE') {
                                continue;
                            }

                            oReturn[oIssue.severity].push({
                                severity: oIssue.severity,
                                context: oIssue.context,
                                details: oIssue.details
                            });
                        }

                        resolve(oReturn);
                    });

                });
            });
        }, { dependencies: { sComponent } });
    }
}

export var utils = new Utils();