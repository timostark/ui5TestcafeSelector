import {
    Selector
} from 'testcafe';

export default Selector(id => {
    let _wnd = window;
    let iFrames = document.getElementsByTagName("iframe");
    for (let i = 0; i < iFrames.length; i++) {
        if (iFrames[i].contentWindow && iFrames[i].contentWindow.sap) {
            _wnd = iFrames[i].contentWindow;
            break;
        }
    }

    /****************************************/
    //GLOBALS
    /****************************************/

    //on purpose implemented as local methods
    //this is not readable, but is a easy approach to transform those methods to the UI5Selector Stack (one single method approach)
    let oTestGlobalBuffer = {
        fnGetElement: {
            "true": {},
            "false": {}
        },
        findItem: {},
        fnGetElementInfo: {
            "true": {},
            "false": {}
        },
        label: null
    };

    let fnGetBindingInformation = function (oItem, sBinding) {
        let oBindingInfo = oItem.getBindingInfo(sBinding);
        let oBinding = oItem.getBinding(sBinding);
        let oReturn = {};
        if (!oBindingInfo) {
            return oReturn;
        }

        //not really perfect for composite bindings (what we are doing here) - we are just returning the first for that..
        //in case of a real use case --> enhance
        let oRelevantPart = oBindingInfo;

        if (oBindingInfo.parts && oBindingInfo.parts.length > 0) {
            oRelevantPart = oBindingInfo.parts[0];
        }

        //get the binding context we are relevant for..
        let oBndgContext = oItem.getBindingContext(oRelevantPart.model);
        let sPathPre = oBndgContext ? oBndgContext.getPath() + "/" : "";

        if (oBinding) {
            oReturn = {
                model: oRelevantPart.model,
                path: oBinding.sPath && oBinding.getPath()
            };

            oReturn.path = sPathPre + oReturn.path;
            oReturn.pathFull = oRelevantPart.model + ">" + sPathPre + oReturn.path;
            oReturn.pathRelative = oReturn.path;
        } else {
            oReturn = {
                path: oBindingInfo.path,
                pathRelative: oBindingInfo.path,
                pathFull: oRelevantPart.model + ">" + oBindingInfo.path,
                model: oRelevantPart.model
            };
        }
        return oReturn;
    };

    let _getParentWithDom = function (oItem, iCounter, bViewOnly) {
        oItem = oItem.getParent();
        while (oItem && oItem.getParent) {
            if (oItem.getDomRef && oItem.getDomRef()) {
                iCounter = iCounter - 1;
                if (iCounter <= 0) {
                    if (bViewOnly === true && !oItem.getViewData) {
                        oItem = oItem.getParent();
                        continue;
                    }
                    return oItem;
                }
            }
            oItem = oItem.getParent();
        }
        return null;
    };
    let _getLumiraId = function (oItem) {
        return oItem.zenPureId;
    };
    let _getUi5LocalId = function (oItem) {
        let sId = oItem.getId();
        if (sId.lastIndexOf("-") !== -1) {
            return sId.substr(sId.lastIndexOf("-") + 1);
        }
        return sId;
    };
    let _getItemForItem = function (oItem) {
        //(0) check if we are already an item - no issue than..
        if (oItem instanceof _wnd.sap.ui.core.Item) {
            return oItem;
        }

        //(1) check by custom data..
        if (oItem.getCustomData()) {
            for (let i = 0; i < oItem.getCustomData().length; i++) {
                let oObj = oItem.getCustomData()[i].getValue();
                if (oObj instanceof _wnd.sap.ui.core.Item) {
                    return oObj;
                }
            }
        }

        //(2) no custom data? search for combobox & multi-combo-box case..
        let iIndex = 1;
        let oPrt = oItem;
        while (iIndex < 100) {
            oPrt = _getParentWithDom(oItem, iIndex);
            if (!oPrt) {
                return null;
            }
            iIndex += 1;
            let sElementName = oPrt.getMetadata().getElementName();
            if (oPrt && (sElementName === "sap.m.MultiComboBox" || sElementName === "sap.m.ComboBox")) {
                if (oPrt._getItemByListItem) {
                    return oPrt._getItemByListItem(oItem);
                }
            }
        }
        return null;
    };

    let _getAllLabels = function () {
        if (oTestGlobalBuffer.label) {
            return oTestGlobalBuffer.label;
        }
        oTestGlobalBuffer.label = {};
        let oCoreObject = null;
        let fakePlugin = {
            startPlugin: function (core) {
                oCoreObject = core;
                return core;
            }
        };
        _wnd.sap.ui.getCore().registerPlugin(fakePlugin);
        _wnd.sap.ui.getCore().unregisterPlugin(fakePlugin);
        let aElements = {};
        if (_wnd.sap.ui.core.Element && _wnd.sap.ui.core.Element.registry) {
            aElements = _wnd.sap.ui.core.Element.registry.all();
        } else {
            aElements = oCoreObject.mElements;
        }

        for (let sCoreObject in aElements) {
            let oObject = aElements[sCoreObject];
            if (oObject.getMetadata()._sClassName === "sap.m.Label") {
                let oLabelFor = oObject.getLabelFor ? oObject.getLabelFor() : null;
                if (oLabelFor) {
                    oTestGlobalBuffer.label[oLabelFor] = oObject; //always overwrite - i am very sure that is correct
                } else {
                    //yes.. labelFor is maintained in one of 15 cases (fuck it)
                    //for forms it seems to be filled "randomly" - as apparently no developer is maintaing that correctly
                    //we have to search UPWARDS, and hope we are within a form.. in that case, normally we can just take all the fields aggregation elements
                    if (oObject.getParent() && oObject.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                        //ok.. we got luck.. let's assign all fields..
                        let oFormElementFields = oObject.getParent().getFields();
                        for (let j = 0; j < oFormElementFields.length; j++) {
                            if (!oTestGlobalBuffer.label[oFormElementFields[j].getId()]) {
                                oTestGlobalBuffer.label[oFormElementFields[j].getId()] = oObject;
                            }
                        }
                    }
                }
            }
        }

        //most simple approach is done.. unfortunatly hi
        return oTestGlobalBuffer.label;
    };


    let _getLabelForItem = function (oItem) {
        let aItems = _getAllLabels();
        return (aItems && aItems[oItem.getId()]) ? aItems[oItem.getId()] : null;
    };


    let _getUi5Id = function (oItem) {
        //remove all component information from the control
        let oParent = oItem;
        let sCurrentComponent = "";
        while (oParent && oParent.getParent) {
            if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                break;
            }
            oParent = oParent.getParent();
        }
        if (!sCurrentComponent.length) {
            return oItem.getId();
        }

        let sId = oItem.getId();
        sCurrentComponent = sCurrentComponent + "---";
        if (sId.lastIndexOf(sCurrentComponent) !== -1) {
            return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
        }
        return sId;
    };

    let _getOwnerComponent = function (oParent) {
        let sCurrentComponent = "";
        while (oParent && oParent.getParent) {
            if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                break;
            }
            oParent = oParent.getParent();
        }
        return sCurrentComponent;
    };

    let _checkItem = function (oItem, id) {
        let bFound = true;
        if (!oItem) { //e.g. parent level is not existing at all..
            return false;
        }

        if (id.identifier) {
            if (id.identifier.ui5Id && id.identifier.ui5Id !== _getUi5Id(oItem)) {
                return false;
            }
            if (id.identifier.ui5LocalId && id.identifier.ui5LocalId !== _getUi5LocalId(oItem)) {
                return false;
            }
            if (id.identifier.lumiraId && id.identifier.lumiraId !== _getLumiraId(oItem)) {
                return false;
            }
            if (id.identifier.id) {
                if (id.identifier.id !== _getUi5Id(oItem) && id.identifier.id !== _getUi5LocalId(oItem) && id.identifier.id !== _getLumiraId(oItem)) {
                    return false;
                }
            }
        }

        if (id.metadata) {
            if (id.metadata.elementName) {
                let aClassArray = [];
                let oMeta = oItem.getMetadata();
                while (oMeta) {
                    aClassArray.push(oMeta._sClassName);
                    oMeta = oMeta.getParent();
                }

                if (_wnd.$.isArray(id.metadata.elementName)) {
                    let bFoundAnyElementName = false;
                    for (let i = 0; i < id.metadata.elementName.length; i++) {
                        if (aClassArray.indexOf(id.metadata.elementName[i]) != -1) {
                            bFoundAnyElementName = true;
                            break;
                        }
                    }
                    if (!bFoundAnyElementName) {
                        return false;
                    }
                } else if (aClassArray.indexOf(id.metadata.elementName) === -1) {
                    return false;
                }
            }
            if (id.metadata.componentName && id.metadata.componentName !== _getOwnerComponent(oItem)) {
                return false;
            }
        }

        if (id.domChildWith && id.domChildWith.length > 0) {
            let oDomRef = oItem.getDomRef();
            if (!oDomRef) {
                return false;
            }
            if (_wnd.$("*[id$='" + oDomRef.id + id.domChildWith + "']").length === 0) {
                return false;
            }
        }

        if (id.model) {
            for (let sModel in id.model) {
                sModel = sModel === "undefined" ? undefined : sModel;
                if (!oItem.getModel(sModel)) {
                    return false;
                }
                for (let sModelProp in id.model[sModel]) {
                    if (oItem.getModel(sModel).getProperty(sModelProp) !== id.model[sModel][sModelProp]) {
                        return false;
                    }
                }
            }
        }

        if (id.metadata && typeof id.metadata.interactable !== "undefined") {
            var bPropVisible = oItem["getVisible"] ? oItem["getVisible"]() : null;
            var bPropEnabled = oItem["getEnabled"] ? oItem["getEnabled"]() : null;

            if ((id.metadata.interactable != bPropEnabled && bPropEnabled !== null) ||
                (id.metadata.interactable != bPropVisible && bPropVisible !== null)) {
                return false;
            }
            if (id.metadata.interactable === true) {
                if (oItem.bNeedsRerendering) { //don't interact, we are currently rerendering
                    return false;
                }
                //check if me or any direct parent is busy..
                var oCur = oItem;
                while (oCur) {
                    if (oCur.getBusy && oCur.getBusy() === true) {
                        return false;
                    }
                    oCur = oCur.getParent();
                }

                var oStaticArea = _wnd.sap.ui.getCore().getStaticAreaRef();
                var bControlIsInStaticArea = _wnd.$.contains(oStaticArea, oItem.getDomRef());
                var bOpenStaticBlockingLayer = _wnd.$("#sap-ui-blocklayer-popup").is(":visible");
                if (!bControlIsInStaticArea && bOpenStaticBlockingLayer) {
                    return false; //blocked and not interactable
                }
            }
        }

        if (id.parentAnyLevel) {
            //not all elements are supported - we will only take care of the absolute basics here (property, id and element matching for the moment..)
            let bFoundParentId = false;
            let bFoundParentElementName = false;
            let bFoundParentProperty = false;

            let oParent = oItem.getParent();

            let sParentElementName = id.parentAnyLevel.metadata && id.parentAnyLevel.metadata.element ? id.parentAnyLevel.metadata.element : null;
            let sParentId = id.parentAnyLevel.identifier && id.parentAnyLevel.identifier.id ? id.parentAnyLevel.identifier.id : null;
            let oParentProp = id.parentAnyLevel.property ? id.parentAnyLevel.property : null;


            while (oParent) {
                bFoundParentElementName = sParentElementName === null;
                bFoundParentId = sParentId === null;
                bFoundParentProperty = oParentProp === null;

                if (sParentId) {
                    if (sParentId === _getUi5Id(oParent) || sParentId === _getUi5LocalId(oParent) || sParentId === _getLumiraId(oParent)) {
                        bFoundParentId = true;
                    }
                }
                if (sParentElementName) {
                    if (sParentElementName === oParent.getMetadata()._sClassName) {
                        bFoundParentElementName = true;
                    }
                }
                if (oParentProp) {
                    let bFoundNegativePropFound = false;
                    for (let sProperty in oParentProp) {
                        if (!oParent["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]) {
                            bFoundNegativePropFound = true;
                            break;
                        }
                        let sPropertyValueItem = oParent["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
                        let sPropertyValueSearch = oParentProp[sProperty];
                        if (sPropertyValueItem !== sPropertyValueSearch) {
                            bFoundNegativePropFound = true;
                            break;
                        }
                    }
                    bFoundParentProperty = bFoundNegativePropFound === false;
                }

                if (bFoundParentElementName === true && bFoundParentId === true && bFoundParentProperty === true) {
                    break;
                }
                oParent = oParent.getParent();
            }

            if (bFoundParentElementName != true || bFoundParentId != true || bFoundParentProperty != true) {
                return false;
            }
        }

        if (typeof id.tableSettings !== "undefined") {
            if (typeof id.tableSettings.insideATable !== "undefined" ||
                typeof id.tableSettings.tableRow !== "undefined" || typeof id.tableSettings.tableCol !== "undefined" || typeof id.tableSettings.tableColId !== "undefined"
                || typeof id.tableSettings.tableColDescr !== "undefined") {
                var bIsInTable = false;
                let iTableRow = 0;
                let iTableCol = 0;
                let sTableColId = "";
                let sTableColDescr = "";
                let aParentIds = [];
                aParentIds.push(oItem.getId());
                var oParent = oItem.getParent();
                while (oParent) {
                    aParentIds.push(oParent.getId());
                    var sControl = oParent.getMetadata()._sClassName;
                    if (sControl === "sap.m.Table" || sControl === "sap.ui.table.Table" || sControl === "sap.m.List" || sControl === "sap.m.PlanningCalendar" ||
                        sControl === "sap.ui.table.TreeTable" || sControl === "sap.zen.crosstab.Crosstab") {
                        bIsInTable = true;

                        if (typeof id.tableSettings.tableRow !== "undefined" || typeof id.tableSettings.tableCol !== "undefined") {
                            let aRows = oParent.getAggregation("rows") ? oParent.getAggregation("rows") : oParent.getAggregation("items");

                            var aCol = oParent.getColumns ? oParent.getColumns() : [];

                            if (aRows) {
                                for (let j = 0; j < aRows.length; j++) {
                                    if (aParentIds.indexOf(aRows[j].getId()) !== -1) {
                                        iTableRow = j;
                                        iTableCol = 0;
                                        var iVisibleColCounter = 0;
                                        let aCells = aRows[j].getCells ? aRows[j].getCells() : [];
                                        for (let x = 0; x < aCells.length; x++) {
                                            if (aCol && aCol.length && aCol.length > x) {
                                                if (aCol[x].getVisible() === false) {
                                                    continue;
                                                }
                                            }
                                            if (aParentIds.indexOf(aCells[x].getId()) !== -1) {
                                                iTableCol = iVisibleColCounter;

                                                if (aCol && aCol.length && aCol.length > x) {
                                                    sTableColId = _getUi5Id(aCol[x]);
                                                    sTableColDescr = aCol[x].getLabel ? aCol[x].getLabel().getText() : "";
                                                }
                                                break;
                                            }
                                            iVisibleColCounter = iVisibleColCounter + 1;
                                        }
                                        break;
                                    }
                                }
                            }

                            if ((typeof id.tableSettings.tableRow !== "undefined" && id.tableSettings.tableRow !== iTableRow) ||
                                (typeof id.tableSettings.tableCol !== "undefined" && id.tableSettings.tableCol !== iTableCol)) {
                                return false;
                            }
                            if ((typeof id.tableSettings.tableColId !== "undefined" && id.tableSettings.tableColId !== sTableColId) ||
                                (typeof id.tableSettings.tableColDescr !== "undefined" && id.tableSettings.tableColDescr !== sTableColDescr)) {
                                return false;
                            }
                        }
                        break;
                    }
                    oParent = oParent.getParent();
                }
                if (bIsInTable !== id.tableSettings.insideATable) {
                    return false;
                }
            }
        }

        if (id.bindingContext) {
            for (let sModel in id.bindingContext) {
                let oCtx = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
                if (!oCtx) {
                    return false;
                }

                if (oCtx.getPath() !== id.bindingContext[sModel]) {
                    return false;
                }
            }
        }

        if (id.binding) {
            for (let sBinding in id.binding) {
                let oBndgInfo = fnGetBindingInformation(oItem, sBinding);

                var aCheckArray = [oBndgInfo.path, oBndgInfo.pathFull, oBndgInfo.pathRelative];
                if (aCheckArray.indexOf(oBndgInfo.path) === -1) {
                    if (oItem.getMetadata().getElementName() === "sap.m.Label") {
                        if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                            let oParentBndg = oItem.getParent().getBinding("label");
                            if (!oParentBndg || oParentBndg.getPath() !== id.binding[sBinding].path) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }
        }

        if (id.lumiraProperty) {
            if (typeof id.lumiraProperty.numberOfDimensionsOnRow !== "undefined" && id.lumiraProperty.numberOfDimensionsOnRow !== oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis()) {
                return false;
            }
            if (typeof id.lumiraProperty.numberOfDimensionsOnCol !== "undefined" && id.lumiraProperty.numberOfDimensionsOnCol !== oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis()) {
                return false;
            }
            if (typeof id.lumiraProperty.numberOfRows !== "undefined" && id.lumiraProperty.numberOfRows !== oItem.rowHeaderArea.oDataModel.getRowCnt()) {
                return false;
            }
            if (typeof id.lumiraProperty.numberOfCols !== "undefined" && id.lumiraProperty.numberOfCols !== oItem.columnHeaderArea.oDataModel.getColCnt()) {
                return false;
            }
            if (typeof id.lumiraProperty.numberOfDataCells !== "undefined" && id.lumiraProperty.numberOfDataCells !== oItem.getAggregation("dataCells").length) {
                return false;
            }
            if (typeof id.lumiraProperty.chartTitle !== "undefined" && id.lumiraProperty.chartTitle !== oItem.widget.getTitleTextInternal()) {
                return false;
            }
            if (typeof id.lumiraProperty.chartType !== "undefined" && id.lumiraProperty.chartType !== oItem.widget.vizType()) {
                return false;
            }
            if (typeof id.lumiraProperty.dimensionCount !== "undefined" || typeof id.lumiraProperty.measuresCount !== "undefined") {
                let aFeedItems = JSON.parse(oItem.widget.feedItems());
                let iDimCount = 0;
                let iMeasCount = 0;
                aFeedItems.filter(function (e) {
                    return e.type == "Dimension";
                }).forEach(function (e) {
                    iDimCount += e.values.length;
                });
                aFeedItems.filter(function (e) {
                    return e.type == "Measure";
                }).forEach(function (e) {
                    iMeasCount += e.values.length;
                });
                if (typeof id.lumiraProperty.dimensionCount !== "undefined" && id.lumiraProperty.dimensionCount !== iDimCount) {
                    return false;
                }
                if (typeof id.lumiraProperty.measuresCount !== "undefined" && id.lumiraProperty.measuresCount !== iMeasCount) {
                    return false;
                }
            }
            if (typeof id.lumiraProperty.dataCellCount !== "undefined") {
                let iDataCellCount = 0;
                oItem.widget._uvbVizFrame.vizData().data().data.forEach(function (e) {
                    iDataCellCount += e.length;
                });
                if (typeof id.lumiraProperty.dataCellCount !== "undefined" && id.lumiraProperty.dataCellCount !== iDataCellCount) {
                    return false;
                }
            }
        }

        if (id.aggregation) {
            for (let sAggregationName in id.aggregation) {
                let oAggr = id.aggregation[sAggregationName];
                if (!oAggr.name) {
                    continue; //no sense to search without aggregation name..
                }
                if (typeof oAggr.length !== "undefined") {
                    if (oItem.getAggregation(sAggregationName).length !== oAggr.length) {
                        bFound = false;
                    }
                }
                if (bFound === false) {
                    return false;
                }
            }
        }
        if (id.context) {
            for (let sModel in id.context) {
                let oCtx = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
                if (!oCtx) {
                    return false;
                }
                let oObjectCompare = oCtx.getObject();
                if (!oObjectCompare) {
                    return false;
                }
                let oObject = id.context[sModel];
                for (let sAttr in oObject) {
                    if (oObject[sAttr] !== oObjectCompare[sAttr]) {
                        return false;
                    }
                }
            }
        }

        if (id.smartContext) {
            var bAnyBinding = false;
            var oCurParent = oItem;
            var sModelName = "";

            //"smart": maybe enable to search for more specific bindings based on the control - i.e. for texts, search for texts..
            while (oCurParent) {
                var sControlParent = oCurParent.getMetadata()._sClassName;
                if (sControlParent === "sap.m.Table" || sControlParent === "sap.m.PlanningCalendar" || sControlParent === "sap.m.Tree" || sControlParent === "sap.m.List" || sControlParent === "sap.ui.table.Table" || sControlParent === "sap.ui.table.TreeTable" || sControlParent === "sap.zen.crosstab.Crosstab") {
                    if (oCurParent.mBindingInfos["items"] || oCurParent.mBindingInfos["rows"]) {
                        var sBinding = oCurParent.mBindingInfos["items"] ? "items" : "rows";
                        var oBndg = oCurParent.mBindingInfos[sBinding];
                        if (oBndg.parts) {
                            for (let i = 0; i < oBndg.parts.length; i++) {
                                sModelName = oItem.mBindingInfos[sBinding].parts[i].model ? oItem.mBindingInfos[sBinding].parts[i].model : "undefined";
                                break;
                            }
                        } else {
                            sModelName = oBndg.model ? oBndg.model : "undefined";
                        }
                    }
                    break;
                }
                oCurParent = oCurParent.getParent();
            }
            if (sModelName.length === 0) {
                for (let sBinding in oItem.mBindingInfos) {
                    if (!oItem.mBindingInfos[sBinding].parts) {
                        continue;
                    }
                    for (let i = 0; i < oItem.mBindingInfos[sBinding].parts.length; i++) {
                        sModelName = oItem.mBindingInfos[sBinding].parts[i].model ? oItem.mBindingInfos[sBinding].parts[i].model : "undefined";
                    }
                    bAnyBinding = true;
                }
                if (!bAnyBinding) {
                    //search up the binding context hierarchy (first=direct element bindings, than bindings coming directly from parent, than via propagated views/elements)
                    let bndgCtx = {};
                    if (!$.isEmptyObject(oItem.mElementBindingContexts)) {
                        bndgCtx = oItem.mElementBindingContexts;
                    } else if (!$.isEmptyObject(oItem.oBindingContexts)) {
                        bndgCtx = oItem.oBindingContexts;
                    } else if (!$.isEmptyObject(oItem.oPropagatedProperties.oBindingContexts)) {
                        bndgCtx = oItem.oPropagatedProperties.oBindingContexts;
                    } else {
                        return false;
                    }
                    for (let sModelNameLoc in bndgCtx) {
                        sModelName = sModelNameLoc ? sModelNameLoc : "undefined";
                        break;
                    }
                }
            }
            let oCtx = oItem.getBindingContext(sModelName === "undefined" ? undefined : sModelName);
            if (!oCtx) {
                return false;
            }
            let oObjectCompare = oCtx.getObject();
            if (!oObjectCompare) {
                return false;
            }
            for (let sAttr in id.smartContext) {
                if (id.smartContext[sAttr] !== oObjectCompare[sAttr]) {
                    return false;
                }
            }
        }

        if (id.viewProperty) {
            let oView = _getParentWithDom(oItem, 1, true);
            if (oView) {
                var sViewProp = oView.getProperty("viewName");
                var sLocalView = sViewProp.split(".").pop();
                if (id.viewProperty.localViewName && id.viewProperty.localViewName !== sLocalView) {
                    return false;
                }
                if (id.viewProperty.viewName && id.viewProperty.viewName !== sViewProp) {
                    return false;
                }
            }
        }

        if (id.property) {
            for (let sProperty in id.property) {
                if (!oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]) {
                    //property is not even available in that item.. just skip it..
                    bFound = false;
                    break;
                }
                let sPropertyValueItem = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
                let sPropertyValueSearch = id.property[sProperty];
                if (sPropertyValueItem !== sPropertyValueSearch) {
                    bFound = false;
                    break;
                }
            }
            if (bFound === false) {
                return false;
            }
        }
        return true;
    };

    let aItem = null; //jQuery Object Array
    if (typeof _wnd.sap === "undefined" || typeof _wnd.sap.ui === "undefined" || typeof _wnd.sap.ui.getCore === "undefined" || !_wnd.sap.ui.getCore() || !_wnd.sap.ui.getCore().isInitialized()) {
        return [];
    }


    let oCoreObject = null;
    let fakePlugin = {
        startPlugin: function (core) {
            oCoreObject = core;
            return core;
        }
    };
    _wnd.sap.ui.getCore().registerPlugin(fakePlugin);
    _wnd.sap.ui.getCore().unregisterPlugin(fakePlugin);
    let aElements = {};
    if (_wnd.sap.ui.core.Element && _wnd.sap.ui.core.Element.registry) {
        aElements = _wnd.sap.ui.core.Element.registry.all();
    } else {
        aElements = oCoreObject.mElements;
    }

    //First Step: Early exits, in case anything suspicious is happening..
    //1.1: early exit in case of transitions..
    for (let sElement in aElements) {
        let oItem = aElements[sElement];
        if (oItem instanceof sap.m.NavContainer) {
            if (oItem.bTransition2EndPending === true ||
                oItem.bTransitionEndPending === true ||
                oItem._bNavigating === true ||
                (oItem._aQueue && oItem._aQueue.length > 0)) {
                return [];
            }
        }
    }

    let fnFindByComplexParameter = function (id) {
        if (JSON.stringify(id) == JSON.stringify({})) {
            return [];
        }


        //search for identifier of every single object..
        let bFound = false;
        let sSelectorStringForJQuery = "";
        for (let sElement in aElements) {
            let oItem = aElements[sElement];
            if (window.__ui5SelectorDebug) {
                if (oItem.getId().substr(window.__ui5SelectorDebug) !== -1) {
                    // eslint-disable-next-line no-debugger
                    debugger;
                }
            }
            bFound = true;
            bFound = _checkItem(oItem, id);
            if (bFound === false) {
                continue;
            }
            if (id.label) {
                bFound = bFound && _checkItem(_getLabelForItem(oItem), id.label);
                if (bFound === false) {
                    continue;
                }
            }

            //check parent levels..
            if (id.parent) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 1), id.parent);
                if (bFound === false) {
                    continue;
                }
            }
            if (id.parentL2) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 2), id.parentL2);
                if (bFound === false) {
                    continue;
                }
            }
            if (id.parentL3) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 3), id.parentL3);
                if (bFound === false) {
                    continue;
                }
            }
            if (id.parentL4) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 4), id.parentL4);
                if (bFound === false) {
                    continue;
                }
            }
            if (id.itemdata) {
                bFound = bFound && _checkItem(_getItemForItem(oItem), id.itemdata);
                if (bFound === false) {
                    continue;
                }
            }

            if (bFound === false) {
                continue;
            }

            if (!oItem.getDomRef()) {
                continue;
            }

            let sIdFound = oItem.getDomRef().id;
            if (sSelectorStringForJQuery.length) {
                sSelectorStringForJQuery = sSelectorStringForJQuery + ",";
            }
            sSelectorStringForJQuery += "*[id$='" + sIdFound + "']";
            break;
        }
        if (sSelectorStringForJQuery.length) {
            aItem = _wnd.$(sSelectorStringForJQuery);
        } else {
            aItem = [];
        }
        return aItem;
    };

    if (typeof id === "string") {
        //our search for an ID is using "ends with", as we are using local IDs only (ignore component)
        //this is not really perfect for multi-component architecture (here the user has to add the component manually)
        //but sufficient for most approaches. Reason for removign component:
        //esnure testability both in standalone and launchpage enviroments
        if (id.charAt(0) === '#') {
            id = id.substr(1); //remove the trailing "#" if any
        }
        let searchId = "*[id$='" + id + "']";
        aItem = _wnd.$(searchId);

        //fallbacks to make the API simpler - search for ui5-id as if the user would search for ids
        if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
            //try to get via complex search parameters, i.E. via localId, via lumiraId and via
            aItem = fnFindByComplexParameter({
                identifier: {
                    ui5AbsoluteId: id
                }
            });
            if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
                aItem = fnFindByComplexParameter({
                    identifier: {
                        ui5LocalId: id
                    }
                });
                if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
                    aItem = fnFindByComplexParameter({
                        identifier: {
                            lumiraId: id
                        }
                    });
                }
            }
        }
    } else {
        aItem = fnFindByComplexParameter(id);
    }

    if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
        return [];
    }

    //try to make a "smart guess" (in case selector does not explicitly define it)
    let oField = aItem.get(0);
    if (oField instanceof sap.m.InputBase && typeof id.domChildWith === "undefined") {
        //get the "inner" field for input - we are always working with inner..
        let sIdUsed = oField.id;
        if (sIdUsed && !sIdUsed.endsWith("-inner")) {
            let oElement = document.getElementById(sIdUsed + "-inner");
            if (oElement) {
                aItem = [oElement];
            }
        }
    }

    if (typeof id.domChildWith !== "undefined") {
        aItem = _wnd.$("*[id$='" + aItem.get(0).id + id.domChildWith + "']");
    }

    //---postprocessing - return only my item
    return [aItem.get(0)];
}).addCustomMethods({
    getUI5: (oDomNode, fn) => {
        let _wnd = window;
        let iFrames = document.getElementsByTagName("iframe");
        for (let i = 0; i < iFrames.length; i++) {
            if (iFrames[i].contentWindow && iFrames[i].contentWindow.sap) {
                _wnd = iFrames[i].contentWindow;
                break;
            }
        }

        //preprocessing ----------------- start
        let aItem = _wnd.$(oDomNode).control();
        if (!aItem.length) {
            return {};
        }
        let oItem = aItem[0];
        //preprocessing ---------------- end


        /****************************************/
        //GLOBALS
        /****************************************/
        let oTestGlobalBuffer = {
            fnGetElement: {
                "true": {},
                "false": {}
            },
            findItem: {},
            fnGetElementInfo: {
                "true": {},
                "false": {}
            },
            label: null
        };
        //on purpose implemented as local methods
        //this is not readable, but is a easy approach to transform those methods to the UI5Selector Stack (one single method approach)

        let _getParentWithDom = function (oItem, iCounter, bViewOnly) {
            oItem = oItem.getParent();
            while (oItem && oItem.getParent) {
                if (oItem.getDomRef && oItem.getDomRef()) {
                    iCounter = iCounter - 1;
                    if (iCounter <= 0) {
                        if (bViewOnly === true && !oItem.getViewData) {
                            oItem = oItem.getParent();
                            continue;
                        }
                        return oItem;
                    }
                }
                oItem = oItem.getParent();
            }
            return null;
        };
        let _getUi5LocalId = function (oItem) {
            let sId = oItem.getId();
            if (sId.lastIndexOf("-") !== -1) {
                return sId.substr(sId.lastIndexOf("-") + 1);
            }
            return sId;
        };
        let _getItemForItem = function (oItem) {
            //(0) check if we are already an item - no issue than..
            if (oItem instanceof _wnd.sap.ui.core.Item) {
                return oItem;
            }

            //(1) check by custom data..
            if (oItem.getCustomData()) {
                for (let i = 0; i < oItem.getCustomData().length; i++) {
                    let oObj = oItem.getCustomData()[i].getValue();
                    if (oObj instanceof _wnd.sap.ui.core.Item) {
                        return oObj;
                    }
                }
            }

            //(2) no custom data? search for combobox & multi-combo-box case..
            let iIndex = 1;
            let oPrt = oItem;
            while (iIndex < 100) {
                oPrt = _getParentWithDom(oItem, iIndex);
                if (!oPrt) {
                    return null;
                }
                iIndex += 1;
                let sElementName = oPrt.getMetadata().getElementName();
                if (oPrt && (sElementName === "sap.m.MultiComboBox" || sElementName === "sap.m.ComboBox")) {
                    if (oPrt._getItemByListItem) {
                        return oPrt._getItemByListItem(oItem);
                    }
                }
            }
            return null;
        };

        let _getAllLabels = function () {
            if (oTestGlobalBuffer.label) {
                return oTestGlobalBuffer.label;
            }
            oTestGlobalBuffer.label = {};
            let oCoreObject = null;
            let fakePlugin = {
                startPlugin: function (core) {
                    oCoreObject = core;
                    return core;
                }
            };
            _wnd.sap.ui.getCore().registerPlugin(fakePlugin);
            _wnd.sap.ui.getCore().unregisterPlugin(fakePlugin);

            let aElements = {};
            if (_wnd.sap.ui.core.Element && _wnd.sap.ui.core.Element.registry) {
                aElements = _wnd.sap.ui.core.Element.registry.all();
            } else {
                aElements = oCoreObject.mElements;
            }

            for (let sCoreObject in aElements) {
                let oObject = aElements[sCoreObject];
                if (oObject.getMetadata()._sClassName === "sap.m.Label") {
                    let oLabelFor = oObject.getLabelFor ? oObject.getLabelFor() : null;
                    if (oLabelFor) {
                        oTestGlobalBuffer.label[oLabelFor] = oObject; //always overwrite - i am very sure that is correct
                    } else {
                        //yes.. labelFor is maintained in one of 15 cases (fuck it)
                        //for forms it seems to be filled "randomly" - as apparently no developer is maintaing that correctly
                        //we have to search UPWARDS, and hope we are within a form.. in that case, normally we can just take all the fields aggregation elements
                        // eslint-disable-next-line no-lonely-if
                        if (oObject.getParent() && oObject.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                            //ok.. we got luck.. let's assign all fields..
                            let oFormElementFields = oObject.getParent().getFields();
                            for (let j = 0; j < oFormElementFields.length; j++) {
                                if (!oTestGlobalBuffer.label[oFormElementFields[j].getId()]) {
                                    oTestGlobalBuffer.label[oFormElementFields[j].getId()] = oObject;
                                }
                            }
                        }
                    }
                }
            }

            //most simple approach is done.. unfortunatly hi
            return oTestGlobalBuffer.label;
        };

        let _getLabelForItem = function (oItem) {
            let aItems = _getAllLabels();
            return (aItems && aItems[oItem.getId()]) ? aItems[oItem.getId()] : null;
        };


        let _getUi5Id = function (oItem) {
            //remove all component information from the control
            let oParent = oItem;
            let sCurrentComponent = "";
            while (oParent && oParent.getParent) {
                if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                    sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                    break;
                }
                oParent = oParent.getParent();
            }
            if (!sCurrentComponent.length) {
                return oItem.getId();
            }

            let sId = oItem.getId();
            sCurrentComponent = sCurrentComponent + "---";
            if (sId.lastIndexOf(sCurrentComponent) !== -1) {
                return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
            }
            return sId;
        };

        let _getOwnerComponent = function (oParent) {
            let sCurrentComponent = "";
            while (oParent && oParent.getParent) {
                if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                    sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                    break;
                }
                oParent = oParent.getParent();
            }
            return sCurrentComponent;
        };
        let fnGetBindingContextInformation = function (oItem, sModel) {
            let oCtx = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
            if (!oCtx) {
                return null;
            }
            return oCtx.getPath();
        };

        let fnGetBindingInformation = function (oItem, sBinding) {
            let oBindingInfo = oItem.getBindingInfo(sBinding);
            let oBinding = oItem.getBinding(sBinding);
            let oReturn = {};
            if (!oBindingInfo) {
                return oReturn;
            }

            //not really perfect for composite bindings (what we are doing here) - we are just returning the first for that..
            //in case of a real use case --> enhance
            let oRelevantPart = oBindingInfo;

            if (oBindingInfo.parts && oBindingInfo.parts.length > 0) {
                oRelevantPart = oBindingInfo.parts[0];
            }

            //get the binding context we are relevant for..
            let oBndgContext = oItem.getBindingContext(oRelevantPart.model);
            let sPathPre = oBndgContext ? oBndgContext.getPath() + "/" : "";

            if (oBinding) {
                oReturn = {
                    model: oRelevantPart.model,
                    path: oBinding.sPath && oBinding.getPath()
                };

                oReturn.path = sPathPre + oReturn.path;
                oReturn.pathFull = oRelevantPart.model + ">" + sPathPre + oReturn.path;
                oReturn.pathRelative = oReturn.path;
            } else {
                oReturn = {
                    path: oBindingInfo.path,
                    pathRelative: oBindingInfo.path,
                    pathFull: oRelevantPart.model + ">" + oBindingInfo.path,
                    model: oRelevantPart.model
                };
            }
            return oReturn;
        };


        var fnGetTableData = function fnGetTableData(oItem) {
            let oReturn = {};
            if (oItem.getMetadata()._sClassName === "sap.zen.crosstab.Crosstab" && oItem.oHeaderInfo) {
                //dimensions:
                let iDimensionsColAxis = oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis();
                let iDimensionsRowAxis = oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis();
                let oDimCols = {};
                let oDimRows = {};
                let i = 0;
                oReturn.visibleDimensionsCol = [];
                oReturn.visibleDimensionsRow = [];
                oReturn.data = [];
                for (i = 0; i < iDimensionsColAxis; i++) {
                    oDimCols[i] = oItem.oHeaderInfo.getDimensionNameByRow(i);
                    oReturn.visibleDimensionsCol.push(oDimCols[i]);
                }
                for (i = 0; i < iDimensionsRowAxis; i++) {
                    oDimRows[i] = oItem.oHeaderInfo.getDimensionNameByCol(i);
                    oReturn.visibleDimensionsRow.push(oDimRows[i]);
                }

                let aDataCells = oItem.getAggregation("dataCells");
                for (i = 0; i < aDataCells.length; i++) {
                    let oDataCell = aDataCells[i].mProperties;

                    //we have our row && col --> get all corresponding attributes..
                    let oDataLine = {};
                    for (let x = 0; x < iDimensionsRowAxis; x++) {
                        let oColVal = oItem.rowHeaderArea.oDataModel.getCell(oDataCell.tableRow - iDimensionsColAxis, x);
                        if (!oColVal) {
                            continue;
                        }
                        oDataLine[oDimRows[x]] = oColVal.mProperties.text;
                    }
                    for (let x = 0; x < iDimensionsColAxis; x++) {
                        let oColVal = oItem.columnHeaderArea.oDataModel.getCell(oDataCell.tableCol - iDimensionsRowAxis, x);
                        if (!oColVal) {
                            continue;
                        }
                        oDataLine[oDimCols[x]] = oColVal.mProperties.text;
                    }
                    oDataLine.cellValue = oDataCell.text;
                    oDataLine.tableRow = oDataCell.tableRow - iDimensionsColAxis;
                    oDataLine.tableCol = oDataCell.tableCol - iDimensionsRowAxis;
                    oReturn.data.push(oDataLine);
                }

                oReturn.data = oReturn.data.sort(function (a, b) {
                    if (a.tableRow < b.tableRow) {
                        return -1;
                    } else if (a.tableRow > b.tableRow) {
                        return 1;
                    } else if (a.tableCol < b.tableCol) {
                        return -1;
                    } else {
                        return 1;
                    }
                });
            } else if (oItem.getMetadata()._sClassName === "sap.designstudio.sdk.AdapterControl" &&
                oItem.zenType === "com_sap_ip_bi_VizFrame" && oItem.widget) {
                oReturn.feeds = [];

                let aFeedItems = JSON.parse(oItem.widget.feedItems());
                for (let i = 0; i < aFeedItems.length; i++) {
                    oReturn.feeds.push({
                        type: aFeedItems[i].type,
                        id: aFeedItems[i].id,
                        dimensions: aFeedItems[i].values.filter(function (e) {
                            return e.type === "dimension";
                        }).map(function (e) {
                            return {
                                id: e.id,
                                name: e.name
                            };
                        }),
                        measures: aFeedItems[i].values.filter(function (e) {
                            return e.type === "measure";
                        }).map(function (e) {
                            return {
                                id: e.id,
                                name: e.name
                            };
                        })
                    });
                }

                //hardcore internal:
                let aDataPoints = oItem.widget._uvbVizFrame.chart()._chartView()._chart.app._dataModel.dataModel.getDataPoints();

                let chartData = oItem.widget._uvbVizFrame.vizData().data();
                oReturn.data = [];
                oReturn.dimensions = chartData.metadata.fields.filter(function (e) {
                    return e.type === "Dimension";
                }).map(function (e) {
                    return {
                        id: e.id,
                        name: e.name
                    };
                });

                oReturn.measures = chartData.metadata.fields.filter(function (e) {
                    return e.type === "Measure";
                }).map(function (e) {
                    return {
                        id: e.id,
                        name: e.name
                    };
                });

                for (let i = 0; i < chartData.data.length; i++) {
                    let oDataLine = {};
                    for (let k = 0; k < oReturn.dimensions.length; k++) {
                        oDataLine[oReturn.dimensions[k].id] = chartData.data[i][k].v;
                        oDataLine[oReturn.dimensions[k].id + ".d"] = chartData.data[i][k].d;
                    }
                    let oDataPointSearch = oDataLine;
                    for (let j = oReturn.dimensions.length; j < chartData.data[i].length; j++) {
                        oDataLine[oReturn.measures[j - oReturn.dimensions.length].id] = chartData.data[i][j];

                        oDataPointSearch[oReturn.measures[j - oReturn.dimensions.length].id] = chartData.data[i][j];

                        //try to find the datapoint per dimensions..
                        for (let k = 0; k < aDataPoints.length; k++) {
                            let oDataPointData = aDataPoints[k]._data;
                            let bFalse = false;
                            for (let sData in oDataPointData) {
                                if (oDataPointData[sData] != oDataPointSearch[sData]) {
                                    bFalse = true;
                                    break;
                                }
                            }
                            if (bFalse === true) {
                                continue;
                            }
                            //we have the datapoint!!!
                            oDataPointSearch[oReturn.measures[j - oReturn.dimensions.length].id + "_selector"] = "[data-datapoint-id='" + aDataPoints[k].id + "']";
                            break;
                        }
                    }

                    oReturn.data.push(oDataLine);
                }
            } else if (oItem.getMetadata()._sClassName === "sap.m.Table") {
                let oBndg = oItem.getBinding("items");
                if (oBndg) {
                    let aContext = oBndg.getContexts(0, oBndg.getLength());
                    oReturn.finalLength = oBndg.getLength();
                    oReturn.data = [];
                    for (let i = 0; i < aContext.length; i++) {
                        oReturn.data.push(aContext[i].getObject());
                    }
                }
            } else if (oItem.getMetadata()._sClassName === "sap.ui.table.Table" || oItem.getMetadata()._sClassName === "sap.ui.table.TreeTable") {
                let oBndg = oItem.getBinding("rows");
                if (oBndg) {
                    let aContext = oBndg.getContexts(0, oBndg.getLength());
                    oReturn.finalLength = oBndg.getLength();
                    oReturn.data = [];
                    for (let i = 0; i < aContext.length; i++) {
                        oReturn.data.push(aContext[i].getObject());
                    }
                }
            } else if (oItem.getMetadata()._sClassName === "sap.m.MultiInput") {
                let oToken = oItem.getTokens();
                oReturn = [];
                for (let i = 0; i < oToken.length; i++) {
                    oReturn.push({
                        key: oToken[i].getKey(),
                        text: oToken[i].getText()
                    });
                }
            }
            return oReturn;
        };


        let fnGetContextModels = function (oItem) {
            let oReturn = {};

            if (!oItem) {
                return oReturn;
            }

            let oModel = oItem.oModels;
            for (let s in oItem.oPropagatedProperties.oModels) {
                if (!oModel[s]) {
                    oModel[s] = oItem.oPropagatedProperties.oModels[s];
                }
            }

            return oModel;
        };

        let fnGetElementInformation = function (oItem, oDomNode, bFull, bCurElement) {
            let oReturn = {
                property: {},
                aggregation: [],
                association: {},
                binding: {},
                bindingContext: {},
                context: {},
                model: {},
                metadata: {},
                lumiraProperty: {},
                viewProperty: {},
                classArray: [],
                identifier: {
                    domId: "",
                    ui5Id: "",
                    idCloned: false,
                    idGenerated: false,
                    ui5LocalId: "",
                    localIdClonedOrGenerated: false,
                    ui5AbsoluteId: "",
                    lumiraId: ""
                },
                control: null,
                dom: null,
                tableSettings: {
                    insideATable: false
                }
            };
            bFull = typeof bFull === "undefined" ? true : bFull;

            if (!oItem) {
                return oReturn;
            }
            if (oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()]) {
                return oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()];
            }
            if (!oDomNode && oItem.getDomRef) {
                oDomNode = oItem.getDomRef();
            }

            oReturn.identifier.ui5Id = _getUi5Id(oItem);
            oReturn.identifier.ui5LocalId = _getUi5LocalId(oItem);

            oReturn.classArray = [];
            let oMeta = oItem.getMetadata();
            while (oMeta) {
                oReturn.classArray.push({
                    elementName: oMeta._sClassName
                });
                oMeta = oMeta.getParent();
            }

            //does the ui5Id contain a "-" with a following number? it is most likely a dependn control (e.g. based from aggregation or similar)
            if (RegExp("([A-Z,a-z,0-9])-([0-9])").test(oReturn.identifier.ui5Id) === true) {
                oReturn.identifier.idCloned = true;
            } else {
                //check as per metadata..
                let oMetadata = oItem.getMetadata();
                while (oMetadata) {
                    if (!oMetadata._sClassName) {
                        break;
                    }
                    if (["sap.ui.core.Item", "sap.ui.table.Row", "sap.m.ObjectListItem"].indexOf(oMetadata._sClassName) !== -1) {
                        oReturn.identifier.idCloned = true;
                    }
                    oMetadata = oMetadata.getParent();
                }
            }
            //does the ui5id contain a "__"? it is most likely a generated id which should NOT BE USESD!!
            //check might be enhanced, as it seems to be that all controls are adding "__[CONTORLNAME] as dynamic view..
            if (oReturn.identifier.ui5Id.indexOf("__") !== -1) {
                oReturn.identifier.idGenerated = true;
            }
            if (oDomNode) {
                oReturn.identifier.domId = oDomNode.id;
            }
            if (oReturn.identifier.idCloned === true || oReturn.identifier.ui5LocalId.indexOf("__") !== -1) {
                oReturn.identifier.localIdClonedOrGenerated = true;
            }
            oReturn.identifier.ui5AbsoluteId = oItem.getId();

            if (oItem.zenPureId) {
                oReturn.identifier.lumiraId = oItem.zenPureId;
            }

            //get metadata..
            oReturn.metadata = {
                elementName: oItem.getMetadata().getElementName(),
                componentName: _getOwnerComponent(oItem),
                componentId: "",
                componentTitle: "",
                componentDescription: "",
                componentDataSource: {},
                lumiraType: ""
            };

            if (oItem.zenType) {
                oReturn.metadata.lumiraType = oItem.zenType;
            }

            //enhance component information..
            let oComponent = _wnd.sap.ui.getCore().getComponent(oReturn.metadata.componentName);
            if (oComponent) {
                let oManifest = oComponent.getManifest();
                if (oManifest && oManifest["sap.app"]) {
                    let oApp = oManifest["sap.app"];
                    oReturn.metadata.componentId = oApp.id;
                    oReturn.metadata.componentTitle = oApp.title;
                    oReturn.metadata.componentDescription = oApp.description;
                    if (oApp.dataSources) {
                        for (let sDs in oApp.dataSources) {
                            let oDS = oApp.dataSources[sDs];
                            if (oDS.type !== "OData") {
                                continue;
                            }
                            oReturn.metadata.componentDataSource[sDs] = {
                                uri: oDS.uri,
                                localUri: (oDS.settings && oDS.settings.localUri) ? oDS.settings.localUri : ""
                            };
                        }
                    }
                }
            }

            if (bFull === false) {
                oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
                return oReturn;
            }

            //view..
            let oView = _getParentWithDom(oItem, 1, true);
            if (oView) {
                if (oView.getProperty("viewName")) {
                    oReturn.viewProperty.viewName = oView.getProperty("viewName");
                    oReturn.viewProperty.localViewName = oReturn.viewProperty.viewName.split(".").pop();
                    if (oReturn.viewProperty.localViewName.length) {
                        oReturn.viewProperty.localViewName = oReturn.viewProperty.localViewName.charAt(0).toUpperCase() + oReturn.viewProperty.localViewName.substring(1);
                    }
                }
            }

            //bindings..
            for (let sBinding in oItem.mBindingInfos) {
                oReturn.binding[sBinding] = fnGetBindingInformation(oItem, sBinding);
            }


            //very special for "sap.m.Label"..
            if (oReturn.metadata.elementName === "sap.m.Label" && !oReturn.binding.text) {
                if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                    let oParentBndg = oItem.getParent().getBinding("label");
                    if (oParentBndg) {
                        oReturn.binding["text"] = {
                            path: oParentBndg.sPath && oParentBndg.getPath(),
                            "static": oParentBndg.oModel && oParentBndg.getModel() instanceof _wnd.sap.ui.model.resource.ResourceModel
                        };
                    }
                }
            }

            //binding context
            let aModels = fnGetContextModels(oItem);
            for (let sModel in aModels) {
                let oBndg = fnGetBindingContextInformation(oItem, sModel);
                if (!oBndg) {
                    continue;
                }
                oReturn.bindingContext[sModel] = oBndg;
            }

            //return all simple properties
            for (let sProperty in oItem.mProperties) {
                if (typeof oItem.mProperties[sProperty] === "function" || typeof oItem.mProperties[sProperty] === "object") {
                    continue;
                }
                let fnGetter = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)];
                if (fnGetter) {
                    oReturn.property[sProperty] = fnGetter.call(oItem);
                } else {
                    oReturn.property[sProperty] = oItem.mProperties[sProperty];
                }
            }

            if (oItem.getMetadata()._sClassName === "sap.zen.crosstab.Crosstab") {
                oReturn.lumiraProperty["numberOfDimensionsOnRow"] = oItem.oHeaderInfo ? oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis() : 0;
                oReturn.lumiraProperty["numberOfDimensionsOnCol"] = oItem.oHeaderInfo ? oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis() : 0;
                oReturn.lumiraProperty["numberOfRows"] = oItem.rowHeaderArea ? oItem.rowHeaderArea.oDataModel.getRowCnt() : 0;
                oReturn.lumiraProperty["numberOfCols"] = oItem.columnHeaderArea ? oItem.columnHeaderArea.oDataModel.getColCnt() : 0;
                oReturn.lumiraProperty["numberOfDataCells"] = oItem.getAggregation("dataCells").length;
            }
            if (oItem.getMetadata()._sClassName === "sap.designstudio.sdk.AdapterControl" &&
                oItem.zenType === "com_sap_ip_bi_VizFrame" && oItem.widget) {
                oReturn.lumiraProperty["chartTitle"] = oItem.widget.getTitleTextInternal();
                oReturn.lumiraProperty["chartType"] = oItem.widget.vizType();
                let aFeedItems = JSON.parse(oItem.widget.feedItems());
                oReturn.lumiraProperty["dimensionCount"] = 0;
                oReturn.lumiraProperty["measuresCount"] = 0;
                aFeedItems.filter(function (e) {
                    return e.type == "Dimension";
                }).forEach(function (e) {
                    oReturn.lumiraProperty["dimensionCount"] += e.values.length;
                });
                aFeedItems.filter(function (e) {
                    return e.type == "Measure";
                }).forEach(function (e) {
                    oReturn.lumiraProperty["measuresCount"] += e.values.length;
                });

                oReturn.lumiraProperty["dataCellCount"] = 0;
                oItem.widget._uvbVizFrame.vizData().data().data.forEach(function (e) {
                    oReturn.lumiraProperty["numberOfDataCells"] += e.length;
                });
            }

            //return all binding contexts
            oReturn.context = fnGetContexts(oItem);

            if (bCurElement) {
                oReturn.tableData = fnGetTableData(oItem);
            }

            let aParentIds = [];
            aParentIds.push(oItem.getId());
            let oParent = oItem.getParent();
            while (oParent) {
                aParentIds.push(oParent.getId());
                var sControl = oParent.getMetadata()._sClassName;
                if (sControl === "sap.m.Table" || sControl === "sap.m.PlanningCalendar" || sControl === "sap.m.List" || sControl === "sap.ui.table.Table" ||
                    sControl === "sap.ui.table.TreeTable" || sControl === "sap.zen.crosstab.Crosstab") {
                    oReturn.tableSettings.insideATable = true;

                    let aRows = oParent.getAggregation("rows") ? oParent.getAggregation("rows") : oParent.getAggregation("items");
                    var aCol = oParent.getColumns ? oParent.getColumns() : [];

                    if (aRows) {
                        for (let j = 0; j < aRows.length; j++) {
                            if (aParentIds.indexOf(aRows[j].getId()) !== -1) {
                                oReturn.tableSettings.tableRow = j;
                                oReturn.tableSettings.tableCol = 0;
                                var iVisibleColCounter = 0;
                                let aCells = aRows[j].getCells ? aRows[j].getCells() : [];
                                for (let x = 0; x < aCells.length; x++) {
                                    if (aCol && aCol.length && aCol.length > x) {
                                        if (aCol[x].getVisible() === false) {
                                            continue;
                                        }
                                    }
                                    if (aParentIds.indexOf(aCells[x].getId()) !== -1) {
                                        oReturn.tableSettings.tableCol = iVisibleColCounter;
                                        if (aCol && aCol.length && aCol.length > x) {
                                            oReturn.tableSettings.tableColId = _getUi5Id(aCol[x]);
                                            oReturn.tableSettings.tableColDescr = aCol[x].getLabel ? aCol[x].getLabel().getText() : "";
                                        }
                                        break;
                                    }
                                    iVisibleColCounter = iVisibleColCounter + 1;
                                }
                                break;
                            }
                        }
                    }
                    break;
                }
                oParent = oParent.getParent();
            }

            //get model information..
            oReturn.model = {};

            //return length of all aggregations
            let aMetadata = oItem.getMetadata().getAllAggregations();
            for (let sAggregation in aMetadata) {
                if (aMetadata[sAggregation].multiple === false) {
                    continue;
                }
                let aAggregation = oItem["get" + sAggregation.charAt(0).toUpperCase() + sAggregation.substr(1)]();
                let oAggregationInfo = {
                    rows: [],
                    filled: false,
                    name: sAggregation,
                    length: 0
                };
                if (typeof aAggregation !== "undefined" && aAggregation !== null) {
                    oAggregationInfo.filled = true;
                    oAggregationInfo.length = aAggregation.length;
                }

                //for every single line, get the binding context, and the row id, which can later on be analyzed again..
                for (let i = 0; i < aAggregation.length; i++) {
                    oAggregationInfo.rows.push({
                        context: fnGetContexts(aAggregation[i]),
                        ui5Id: _getUi5Id(aAggregation[i]),
                        ui5AbsoluteId: aAggregation[i].getId()
                    });

                    //performance and navigation: in case we have more than 50 aggregation we just don't need them in any realistic scenario..
                    if (i > 50) {
                        break;
                    }
                }
                oReturn.aggregation[oAggregationInfo.name] = oAggregationInfo;
            }

            oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
            return oReturn;
        };

        //missing: get elements with same parent, to get elements "right next", "left" and on same level
        let fnGetContexts = function (oItem) {
            let oReturn = {};

            if (!oItem) {
                return oReturn;
            }

            let oModel = oItem.oModels;
            for (let s in oItem.oPropagatedProperties.oModels) {
                if (!oModel[s]) {
                    oModel[s] = oItem.oPropagatedProperties.oModels[s];
                }
            }

            //second, get all binding contexts
            for (let sModel in oModel) {
                let oBindingContext = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
                if (!oBindingContext) {
                    continue;
                }

                oReturn[sModel] = oBindingContext.getObject();
            }
            return oReturn;
        };

        let oReturn = {
            property: {},
            aggregation: {},
            association: {},
            context: {},
            metadata: {},
            identifier: {
                domId: "",
                ui5Id: "",
                idCloned: false,
                idGenerated: false,
                ui5LocalId: "",
                ui5AbsoluteId: ""
            },
            parent: {},
            parentL2: {},
            parentL3: {},
            parentL4: {},
            itemdata: {},
            parents: [],
            control: null,
            dom: null,
            insideATable: false
        };

        if (!oItem) {
            return oReturn;
        }

        //local methods on purpose (even if duplicated) (see above)
        oReturn = fnGetElementInformation(oItem, oDomNode, true, true);

        //get all parents, and attach the same information in the same structure
        oReturn.parent = fnGetElementInformation(_getParentWithDom(oItem, 1));
        oReturn.parentL2 = fnGetElementInformation(_getParentWithDom(oItem, 2));
        oReturn.parentL3 = fnGetElementInformation(_getParentWithDom(oItem, 3));
        oReturn.parentL4 = fnGetElementInformation(_getParentWithDom(oItem, 4));
        oReturn.label = fnGetElementInformation(_getLabelForItem(oItem));
        oReturn.itemdata = fnGetElementInformation(_getItemForItem(oItem));

        ///POSTPROCESSING ----------------------

        const element = oReturn;
        if (typeof fn === 'function') {
            return fn(element);
        }

        return element;
    }
});