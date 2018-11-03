import { Selector } from 'testcafe';

export default Selector(id => {
    /****************************************/
    //GLOBALS
    /****************************************/

    //on purpose implemented as local methods
    //this is not readable, but is a easy approach to transform those methods to the UI5Selector Stack (one single method approach)
    var oTestGlobalBuffer = {
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
    var _getParentWithDom = function (oItem, iCounter) {
        oItem = oItem.getParent();
        while (oItem && oItem.getParent) {
            if (oItem.getDomRef && oItem.getDomRef()) {
                iCounter = iCounter - 1;
                if (iCounter <= 0) {
                    return oItem;
                }
            }
            oItem = oItem.getParent();
        }
        return null;
    };
    var _getUi5LocalId = function (oItem) {
        var sId = oItem.getId();
        if (sId.lastIndexOf("-") !== -1) {
            return sId.substr(sId.lastIndexOf("-") + 1);
        }
        return sId;
    };
    var _getItemForItem = function (oItem) {
        //(0) check if we are already an item - no issue than..
        if (oItem instanceof sap.ui.core.Item) {
            return oItem;
        }

        //(1) check by custom data..
        if (oItem.getCustomData()) {
            for (var i = 0; i < oItem.getCustomData().length; i++) {
                var oObj = oItem.getCustomData()[i].getValue();
                if (oObj instanceof sap.ui.core.Item) {
                    return oObj;
                }
            }
        }

        //(2) no custom data? search for special cases
        //2.1: Multi-Combo-Box
        var oPrt = _getParentWithDom(oItem, 3);
        if (oPrt && oPrt.getMetadata().getElementName() === "sap.m.MultiComboBox") {
            if (oPrt._getItemByListItem) {
                var oCtrl = oPrt._getItemByListItem(oItem);
                if (oCtrl) {
                    return oCtrl;
                }
            }
        }
    };

    var _getAllLabels = function () {
        if (oTestGlobalBuffer.label) {
            return oTestGlobalBuffer.label;
        }
        oTestGlobalBuffer.label = {};
        var oCoreObject = null;
        var fakePlugin = {
            startPlugin: function (core) {
                oCoreObject = core;
                return core;
            }
        };
        sap.ui.getCore().registerPlugin(fakePlugin);
        sap.ui.getCore().unregisterPlugin(fakePlugin);
        for (var sCoreObject in oCoreObject.mElements) {
            var oObject = oCoreObject.mElements[sCoreObject];
            if (oObject.getMetadata()._sClassName === "sap.m.Label") {
                var oLabelFor = oObject.getLabelFor ? oObject.getLabelFor() : null;
                if (oLabelFor) {
                    oTestGlobalBuffer.label[oLabelFor] = oObject; //always overwrite - i am very sure that is correct
                } else {
                    //yes.. labelFor is maintained in one of 15 cases (fuck it)
                    //for forms it seems to be filled "randomly" - as apparently no developer is maintaing that correctly
                    //we have to search UPWARDS, and hope we are within a form.. in that case, normally we can just take all the fields aggregation elements
                    if (oObject.getParent() && oObject.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                        //ok.. we got luck.. let's assign all fields..
                        var oFormElementFields = oObject.getParent().getFields();
                        for (var j = 0; j < oFormElementFields.length; j++) {
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


    var _getLabelForItem = function (oItem) {
        var aItems = _getAllLabels();
        return (aItems && aItems[oItem.getId()]) ? aItems[oItem.getId()] : null;
    };


    var _getUi5Id = function (oItem) {
        //remove all component information from the control
        var oParent = oItem;
        var sCurrentComponent = "";
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

        var sId = oItem.getId();
        sCurrentComponent = sCurrentComponent + "---";
        if (sId.lastIndexOf(sCurrentComponent) !== -1) {
            return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
        }
        return sId;
    };

    var _getOwnerComponent = function (oParent) {
        var sCurrentComponent = "";
        while (oParent && oParent.getParent) {
            if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                break;
            }
            oParent = oParent.getParent();
        }
        return sCurrentComponent;
    };

    var _checkItem = function (oItem, id) {
        var bFound = true;
        if (!oItem) { //e.g. parent level is not existing at all..
            return false;
        }
        if (id.metadata) {
            if (id.metadata.elementName && id.metadata.elementName !== oItem.getMetadata().getElementName()) {
                return false;
            }
            if (id.metadata.componentName && id.metadata.componentName !== _getOwnerComponent(oItem)) {
                return false;
            }
        }
        if (id.domChildWith && id.domChildWith.length > 0) {
            var oDomRef = oItem.getDomRef();
            if (!oDomRef) {
                return false;
            }
            if ($("*[id$='" + oDomRef.id + id.domChildWith + "']").length === 0) {
                return false;
            }
        }

        if (id.model) {
            for (var sModel in id.model) {
                sModel = sModel === "undefined" ? undefined : sModel;
                if (!oItem.getModel(sModel)) {
                    return false;
                }
                for (var sModelProp in id.model[sModel]) {
                    if (oItem.getModel(sModel).getProperty(sModelProp) !== id.model[sModel][sModelProp]) {
                        return false;
                    }
                }
            }
        }

        if (id.identifier) {
            if (id.identifier.ui5Id && id.identifier.ui5Id !== _getUi5Id(oItem)) {
                return false;
            }
            if (id.identifier.ui5LocalId && id.identifier.ui5LocalId !== _getUi5LocalId(oItem)) {
                return false;
            }
        }

        if (id.binding) {
            for (var sBinding in id.binding) {
                var oAggrInfo = oItem.getBindingInfo(sBinding);
                if (!oAggrInfo) {
                    //SPECIAL CASE for sap.m.Label in Forms, where the label is actually bound against the parent element (yay)
                    if (oItem.getMetadata().getElementName() === "sap.m.Label") {
                        if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                            var oParentBndg = oItem.getParent().getBinding("label");
                            if (!oParentBndg || oParentBndg.getPath() !== id.binding[sBinding].path) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                } else {
                    var oBinding = oItem.getBinding(sBinding);
                    if (!oBinding) {
                        if (oAggrInfo.path !== id.binding[sBinding].path) {
                            return false;
                        }
                    } else {
                        if (oBinding.getPath() !== id.binding[sBinding].path) {
                            return false;
                        }
                    }
                }
            }
        }

        if (id.aggregation) {
            for (var sAggregationName in id.aggregation) {
                var oAggr = id.aggregation[sAggregationName];
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
            for (var sModel in id.context) {
                var oCtx = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
                if (!oCtx) {
                    return false;
                }
                var oObjectCompare = oCtx.getObject();
                if (!oObjectCompare) {
                    return false;
                }
                var oObject = id.context[sModel];
                for (var sAttr in oObject) {
                    if (oObject[sAttr] !== oObjectCompare[sAttr]) {
                        return false;
                    }
                }
            }
        }
        if (id.property) {
            for (var sProperty in id.property) {
                if (!oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]) {
                    //property is not even available in that item.. just skip it..
                    bFound = false;
                    break;
                }
                var sPropertyValueItem = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
                var sPropertyValueSearch = id.property[sProperty];
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

    var aItem = null; //jQuery Object Array
    if (typeof sap === "undefined" || typeof sap.ui === "undefined" || typeof sap.ui.getCore === "undefined" || !sap.ui.getCore() || !sap.ui.getCore().isInitialized()) {
        return [];
    }

    if (typeof id !== "string") {
        if (JSON.stringify(id) == JSON.stringify({})) {
            return [];
        }

        var oCoreObject = null;
        var fakePlugin = {
            startPlugin: function (core) {
                oCoreObject = core;
                return core;
            }
        };
        sap.ui.getCore().registerPlugin(fakePlugin);
        sap.ui.getCore().unregisterPlugin(fakePlugin);
        var aElements = oCoreObject.mElements;

        //search for identifier of every single object..
        var bFound = false;
        var sSelectorStringForJQuery = "";
        for (var sElement in aElements) {
            var oItem = aElements[sElement];
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

            var sIdFound = oItem.getDomRef().id;
            if (sSelectorStringForJQuery.length) {
                sSelectorStringForJQuery = sSelectorStringForJQuery + ",";
            }
            sSelectorStringForJQuery += "*[id$='" + sIdFound + "']";
        }
        if (sSelectorStringForJQuery.length) {
            aItem = $(sSelectorStringForJQuery);
        } else {
            aItem = [];
        }
    } else {
        //our search for an ID is using "ends with", as we are using local IDs only (ignore component)
        //this is not really perfect for multi-component architecture (here the user has to add the component manually)
        //but sufficient for most approaches. Reason for removign component:
        //esnure testability both in standalone and launchpage enviroments
        if (id.charAt(0) === '#') {
            id = id.substr(1); //remove the trailing "#" if any
        }
        var searchId = "*[id$='" + id + "']";
        aItem = $(searchId);
    }
    if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
        return [];
    } //no ui5 contol in case

    //---postprocessing - return only my item
    return [aItem.get(0)];
}).addCustomMethods({
    getUI5: (oDomNode, fn) => {
        //preprocessing ----------------- start
        var aItem = $(oDomNode).control();
        if (!aItem.length) {
            return {};
        }
        var oItem = aItem[0];
        //preprocessing ---------------- end


        /****************************************/
        //GLOBALS
        /****************************************/
        var oTestGlobalBuffer = {
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

        var _oElementModelValues = {
            "sap.m.GenericTile": {
                "undefined": {
                    "/config/navigation_semantic_action": "Navigation-Semantic Action",
                    "/config/navigation_semantic_object": "Navigation-Semantic Object",
                    "/config/navigation_semantic_parameters": "Navigation-Semantic Paramters",
                    "/config/navigation_target_url": "Navigation-Semantic URL"
                }
            }
        };

        //on purpose implemented as local methods
        //this is not readable, but is a easy approach to transform those methods to the UI5Selector Stack (one single method approach)
        var _getParentWithDom = function (oItem, iCounter) {
            oItem = oItem.getParent();
            while (oItem && oItem.getParent) {
                if (oItem.getDomRef && oItem.getDomRef()) {
                    iCounter = iCounter - 1;
                    if (iCounter <= 0) {
                        return oItem;
                    }
                }
                oItem = oItem.getParent();
            }
            return null;
        };
        var _getUi5LocalId = function (oItem) {
            var sId = oItem.getId();
            if (sId.lastIndexOf("-") !== -1) {
                return sId.substr(sId.lastIndexOf("-") + 1);
            }
            return sId;
        };
        var _getItemForItem = function (oItem) {
            //(0) check if we are already an item - no issue than..
            if (oItem instanceof sap.ui.core.Item) {
                return oItem;
            }

            //(1) check by custom data..
            if (oItem.getCustomData()) {
                for (var i = 0; i < oItem.getCustomData().length; i++) {
                    var oObj = oItem.getCustomData()[i].getValue();
                    if (oObj instanceof sap.ui.core.Item) {
                        return oObj;
                    }
                }
            }

            //(2) no custom data? search for special cases
            //2.1: Multi-Combo-Box
            var oPrt = _getParentWithDom(oItem, 3);
            if (oPrt && oPrt.getMetadata().getElementName() === "sap.m.MultiComboBox") {
                if (oPrt._getItemByListItem) {
                    var oCtrl = oPrt._getItemByListItem(oItem);
                    if (oCtrl) {
                        return oCtrl;
                    }
                }
            }
        };

        var _getAllLabels = function () {
            if (oTestGlobalBuffer.label) {
                return oTestGlobalBuffer.label;
            }
            oTestGlobalBuffer.label = {};
            var oCoreObject = null;
            var fakePlugin = {
                startPlugin: function (core) {
                    oCoreObject = core;
                    return core;
                }
            };
            sap.ui.getCore().registerPlugin(fakePlugin);
            sap.ui.getCore().unregisterPlugin(fakePlugin);
            for (var sCoreObject in oCoreObject.mElements) {
                var oObject = oCoreObject.mElements[sCoreObject];
                if (oObject.getMetadata()._sClassName === "sap.m.Label") {
                    var oLabelFor = oObject.getLabelFor ? oObject.getLabelFor() : null;
                    if (oLabelFor) {
                        oTestGlobalBuffer.label[oLabelFor] = oObject; //always overwrite - i am very sure that is correct
                    } else {
                        //yes.. labelFor is maintained in one of 15 cases (fuck it)
                        //for forms it seems to be filled "randomly" - as apparently no developer is maintaing that correctly
                        //we have to search UPWARDS, and hope we are within a form.. in that case, normally we can just take all the fields aggregation elements
                        if (oObject.getParent() && oObject.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                            //ok.. we got luck.. let's assign all fields..
                            var oFormElementFields = oObject.getParent().getFields();
                            for (var j = 0; j < oFormElementFields.length; j++) {
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

        var _getLabelForItem = function (oItem) {
            var aItems = _getAllLabels();
            return (aItems && aItems[oItem.getId()]) ? aItems[oItem.getId()] : null;
        };


        var _getUi5Id = function (oItem) {
            //remove all component information from the control
            var oParent = oItem;
            var sCurrentComponent = "";
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

            var sId = oItem.getId();
            sCurrentComponent = sCurrentComponent + "---";
            if (sId.lastIndexOf(sCurrentComponent) !== -1) {
                return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
            }
            return sId;
        };

        var _getOwnerComponent = function (oParent) {
            var sCurrentComponent = "";
            while (oParent && oParent.getParent) {
                if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                    sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                    break;
                }
                oParent = oParent.getParent();
            }
            return sCurrentComponent;
        };
        var fnGetElementInformation = function (oItem, oDomNode, bFull) {
            var oReturn = {
                property: {},
                aggregation: [],
                association: {},
                binding: {},
                context: {},
                model: {},
                metadata: {},
                identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", localIdClonedOrGenerated: false, ui5AbsoluteId: "" },
                control: null,
                dom: null
            };
            bFull = typeof bFull === "undefined" ? true : bFull;

            if (!oItem) {
                return oReturn;
            }
            if (oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()]) {
                return oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()];
            }
            if (!oDomNode) {
                oDomNode = oItem.getDomRef();
            }

            oReturn.control = oItem;
            oReturn.dom = oDomNode;
            oReturn.identifier.ui5Id = _getUi5Id(oItem);
            oReturn.identifier.ui5LocalId = _getUi5LocalId(oItem);


            //does the ui5Id contain a "-" with a following number? it is most likely a dependn control (e.g. based from aggregation or similar)
            if (RegExp("([A-Z,a-z,0-9])-([0-9])").test(oReturn.identifier.ui5Id) === true) {
                oReturn.identifier.idCloned = true;
            } else {
                //check as per metadata..
                var oMetadata = oItem.getMetadata();
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

            //get metadata..
            oReturn.metadata = {
                elementName: oItem.getMetadata().getElementName(),
                componentName: _getOwnerComponent(oItem)
            };

            if (bFull === false) {
                oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
                return oReturn;
            }

            //bindings..
            for (var sBinding in oItem.mBindingInfos) {
                var oBinding = oItem.getBinding(sBinding);
                if (oBinding) {
                    oReturn.binding[sBinding] = {
                        path: oBinding.sPath && oBinding.getPath(),
                        "static": oBinding.oModel && oBinding.getModel() instanceof sap.ui.model.resource.ResourceModel
                    };
                } else {
                    var oBindingInfo = oItem.getBindingInfo(sBinding);
                    if (!oBindingInfo) {
                        continue;
                    }
                    if (oBindingInfo.path) {
                        oReturn.binding[sBinding] = {
                            path: oBindingInfo.path,
                            "static": true
                        };
                    } else if (oBindingInfo.parts && oBindingInfo.parts.length > 0) {
                        for (var i = 0; i < oBindingInfo.parts.length; i++) {
                            if (!oBindingInfo.parts[i].path) {
                                continue;
                            }
                            if (!oReturn.binding[sBinding]) {
                                oReturn.binding[sBinding] = { path: oBindingInfo.parts[i].path, "static": true };
                            } else {
                                oReturn.binding[sBinding].path += ";" + oBindingInfo.parts[i].path;
                            }
                        }
                    }
                }
            }

            //very special for "sap.m.Label"..
            if (oReturn.metadata.elementName === "sap.m.Label" && !oReturn.binding.text) {
                if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                    var oParentBndg = oItem.getParent().getBinding("label");
                    if (oParentBndg) {
                        oReturn.binding["text"] = {
                            path: oParentBndg.sPath && oParentBndg.getPath(),
                            "static": oParentBndg.oModel && oParentBndg.getModel() instanceof sap.ui.model.resource.ResourceModel
                        };
                    }
                }
            }


            //return all simple properties
            for (var sProperty in oItem.mProperties) {
                oReturn.property[sProperty] = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
            }

            //return all binding contexts
            oReturn.context = fnGetContexts(oItem);

            //get model information..
            var oMetadata = oItem.getMetadata();
            oReturn.model = {};
            while (oMetadata) {
                if (!oMetadata._sClassName) {
                    break;
                }
                var oType = _oElementModelValues[oMetadata._sClassName];
                if (oType) {
                    for (var sModel in oType) {
                        sModel = sModel === "undefined" ? undefined : sModel;
                        oReturn.model[sModel] = {};
                        var oCurrentModel = oItem.getModel(sModel);
                        if (!oCurrentModel) {
                            continue;
                        }
                        for (var sProperty in oType[sModel]) {
                            oReturn.model[sModel][sProperty] = oCurrentModel.getProperty(sProperty);
                        }
                    }
                }

                oMetadata = oMetadata.getParent();
            }

            //return length of all aggregations
            var aMetadata = oItem.getMetadata().getAllAggregations();
            for (var sAggregation in aMetadata) {
                if (aMetadata[sAggregation].multiple === false) {
                    continue;
                }
                var aAggregation = oItem["get" + sAggregation.charAt(0).toUpperCase() + sAggregation.substr(1)]();
                var oAggregationInfo = {
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
                for (var i = 0; i < aAggregation.length; i++) {
                    oAggregationInfo.rows.push({
                        context: fnGetContexts(aAggregation[i]),
                        ui5Id: _getUi5Id(aAggregation[i]),
                        ui5AbsoluteId: aAggregation[i].getId(),
                        control: aAggregation[i]
                    });
                }
                oReturn.aggregation[oAggregationInfo.name] = oAggregationInfo;
            }

            oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
            return oReturn;
        };
        var fnGetElementInformation = function (oItem, oDomNode, bFull) {
            var oReturn = {
                property: {},
                aggregation: [],
                association: {},
                binding: {},
                context: {},
                model: {},
                metadata: {},
                identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", localIdClonedOrGenerated: false, ui5AbsoluteId: "" },
                control: null,
                dom: null
            };
            bFull = typeof bFull === "undefined" ? true : bFull;

            if (!oItem) {
                return oReturn;
            }
            if (oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()]) {
                return oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()];
            }
            if (!oDomNode) {
                oDomNode = oItem.getDomRef();
            }

            oReturn.control = oItem;
            oReturn.dom = oDomNode;
            oReturn.identifier.ui5Id = _getUi5Id(oItem);
            oReturn.identifier.ui5LocalId = _getUi5LocalId(oItem);


            //does the ui5Id contain a "-" with a following number? it is most likely a dependn control (e.g. based from aggregation or similar)
            if (RegExp("([A-Z,a-z,0-9])-([0-9])").test(oReturn.identifier.ui5Id) === true) {
                oReturn.identifier.idCloned = true;
            } else {
                //check as per metadata..
                var oMetadata = oItem.getMetadata();
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

            //get metadata..
            oReturn.metadata = {
                elementName: oItem.getMetadata().getElementName(),
                componentName: _getOwnerComponent(oItem)
            };

            if (bFull === false) {
                oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
                return oReturn;
            }

            //bindings..
            for (var sBinding in oItem.mBindingInfos) {
                var oBinding = oItem.getBinding(sBinding);
                if (oBinding) {
                    oReturn.binding[sBinding] = {
                        path: oBinding.sPath && oBinding.getPath(),
                        "static": oBinding.oModel && oBinding.getModel() instanceof sap.ui.model.resource.ResourceModel
                    };
                } else {
                    var oBindingInfo = oItem.getBindingInfo(sBinding);
                    if (!oBindingInfo) {
                        continue;
                    }
                    if (oBindingInfo.path) {
                        oReturn.binding[sBinding] = {
                            path: oBindingInfo.path,
                            "static": true
                        };
                    } else if (oBindingInfo.parts && oBindingInfo.parts.length > 0) {
                        for (var i = 0; i < oBindingInfo.parts.length; i++) {
                            if (!oBindingInfo.parts[i].path) {
                                continue;
                            }
                            if (!oReturn.binding[sBinding]) {
                                oReturn.binding[sBinding] = { path: oBindingInfo.parts[i].path, "static": true };
                            } else {
                                oReturn.binding[sBinding].path += ";" + oBindingInfo.parts[i].path;
                            }
                        }
                    }
                }
            }

            //very special for "sap.m.Label"..
            if (oReturn.metadata.elementName === "sap.m.Label" && !oReturn.binding.text) {
                if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                    var oParentBndg = oItem.getParent().getBinding("label");
                    if (oParentBndg) {
                        oReturn.binding["text"] = {
                            path: oParentBndg.sPath && oParentBndg.getPath(),
                            "static": oParentBndg.oModel && oParentBndg.getModel() instanceof sap.ui.model.resource.ResourceModel
                        };
                    }
                }
            }


            //return all simple properties
            for (var sProperty in oItem.mProperties) {
                oReturn.property[sProperty] = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
            }

            //return all binding contexts
            oReturn.context = fnGetContexts(oItem);

            //get model information..
            var oMetadata = oItem.getMetadata();
            oReturn.model = {};
            while (oMetadata) {
                if (!oMetadata._sClassName) {
                    break;
                }
                var oType = _oElementModelValues[oMetadata._sClassName];
                if (oType) {
                    for (var sModel in oType) {
                        oReturn.model[sModel] = {};
                        var oCurrentModel = oItem.getModel(sModel);
                        if (!oCurrentModel) {
                            continue;
                        }
                        for (var sProperty in oType[sModel]) {
                            oReturn.model[sModel][sProperty] = oCurrentModel.getProperty(sProperty);
                        }
                    }
                }

                oMetadata = oMetadata.getParent();
            }

            //return length of all aggregations
            var aMetadata = oItem.getMetadata().getAllAggregations();
            for (var sAggregation in aMetadata) {
                if (aMetadata[sAggregation].multiple === false) {
                    continue;
                }
                var aAggregation = oItem["get" + sAggregation.charAt(0).toUpperCase() + sAggregation.substr(1)]();
                var oAggregationInfo = {
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
                for (var i = 0; i < aAggregation.length; i++) {
                    oAggregationInfo.rows.push({
                        context: fnGetContexts(aAggregation[i]),
                        ui5Id: _getUi5Id(aAggregation[i]),
                        ui5AbsoluteId: aAggregation[i].getId(),
                        control: aAggregation[i]
                    });
                }
                oReturn.aggregation[oAggregationInfo.name] = oAggregationInfo;
            }

            oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
            return oReturn;
        };


        //missing: get elements with same parent, to get elements "right next", "left" and on same level
        var fnGetContexts = function (oItem) {
            var oReturn = {};

            if (!oItem) {
                return oReturn;
            }

            var oModel = {};
            oModel = $.extend(true, oModel, oItem.oModels);
            oModel = $.extend(true, oModel, oItem.oPropagatedProperties.oModels);

            //second, get all binding contexts
            for (var sModel in oModel) {
                var oBindingContext = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
                if (!oBindingContext) {
                    continue;
                }

                oReturn[sModel] = oBindingContext.getObject();
            }
            return oReturn;
        };

        var oReturn = {
            property: {},
            aggregation: {},
            association: {},
            context: {},
            metadata: {},
            identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", ui5AbsoluteId: "" },
            parent: {},
            parentL2: {},
            parentL3: {},
            parentL4: {},
            itemdata: {},
            parents: [],
            control: null,
            dom: null
        };

        if (!oItem) {
            return oReturn;
        }

        //local methods on purpose (even if duplicated) (see above)
        oReturn = $.extend(true, oReturn, fnGetElementInformation(oItem, oDomNode));

        //get all parents, and attach the same information in the same structure
        oReturn.parent = fnGetElementInformation(_getParentWithDom(oItem, 1));
        oReturn.parentL2 = fnGetElementInformation(_getParentWithDom(oItem, 2));
        oReturn.parentL3 = fnGetElementInformation(_getParentWithDom(oItem, 3));
        oReturn.parentL4 = fnGetElementInformation(_getParentWithDom(oItem, 4));
        oReturn.label = fnGetElementInformation(_getLabelForItem(oItem));
        oReturn.itemdata = fnGetElementInformation(_getItemForItem(oItem));

        ///POSTPROCESSING ----------------------
        delete oReturn.control;
        delete oReturn.parent.dom;
        delete oReturn.parentL2.dom;
        delete oReturn.parentL3.dom;
        delete oReturn.parentL4.dom;

        const element = oReturn;
        if (typeof fn === 'function') {
            return fn({ element });
        }

        return { element };
    }
});