import { Selector } from 'testcafe';

export default Selector(id => {
    var aItem = null; //jQuery Object Array
    if (typeof sap === "undefined" || typeof sap.ui === "undefined" || typeof sap.ui.getCore === "undefined" || !sap.ui.getCore() || !sap.ui.getCore().isInitialized() ) {
        return [];
    }

    if (typeof id !== "string") {
        if (JSON.stringify(id) == JSON.stringify({})) {
            return [];
        }

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

        var _getUi5Id = function (oItem) {
            //remove all component information from the control
            var oParent = oItem;
            var sCurrentComponent = "";
            while (oParent && oParent.getParent) {
                if (oParent.getController && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                    sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                    break;
                }
                oParent = oParent.getParent();
            }
            if (!sCurrentComponent.length) {
                return "";
            }

            var sId = oItem.getId();
            sCurrentComponent = sCurrentComponent + "---";
            if (sId.lastIndexOf(sCurrentComponent) !== -1) {
                return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
            }
            return sId;
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
            }
            if (id.identifier) {
                if (id.identifier.ui5Id && id.identifier.ui5Id !== _getUi5Id(oItem)) {
                    return false;
                }
                if (id.identifier.ui5LocalId && id.identifier.ui5LocalId !== _getUi5LocalId(oItem)) {
                    return false;
                }
            }
            if (id.aggregation) {
                for (var i = 0; i < id.aggregation.length; i++) {
                    if (!id.aggregation[i].name) {
                        continue; //no sense to search without aggregation name..
                    }
                    if (id.aggregation[i].length) {
                        if (oItem.getAggregation(id.aggregation[i].name).length !== id.aggregation[i].length) {
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
                    var oCtx = oItem.getBindingContext(sModel);
                    if (!oCtx) {
                        return false;
                    }
                    var oObjectCompare = oCtx.getObject();
                    if (!oObjectCompare) {
                        return false;
                    }
                    var oObject = id.context[sModel].object;
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

        //search for identificaton of every single object..
        var bFound = false;
        for (var sElement in aElements) {
            var oItem = aElements[sElement];
            bFound = true;
            bFound = _checkItem(oItem, id);
            //check parent levels..
            if (id.parent) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 1), id.parent);
            }
            if (id.parentL2) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 2), id.parentL2);
            }
            if (id.parentL3) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 3), id.parentL3);
            }
            if (id.parentL4) {
                bFound = bFound && _checkItem(_getParentWithDom(oItem, 4), id.parentL4);
            }

            if (bFound === false) {
                continue;
            }

            if (!oItem.getDomRef()) {
                continue;
            }

            var aCurItems = $("#" + oItem.getDomRef().id);
            if (aItem) {
                aItem = aItem.add(aCurItems);
            } else {
                aItem = aCurItems;
            }
            if (aItem.length >= 10) {
                break; //early exit
            }
        }
    } else {
        //our search for an ID is using "ends with", as we are using local IDs only (ignore component)
        //this is not really perfect for multi-component architecture (here the user has to add the component manually)
        //but sufficient for most approaches. Reason for removign component:
        //esnure testability both in standalone and launchpage enviroments
        if (id.charAt(0) === '#') {
            id = id.substr(1); //remove the trailing "#" if any
        }
        var searchId = '*[id$=' + id + ']';
        aItem = $(searchId);
    }
    if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
        return [];
    } //no ui5 contol in case
    return [aItem.get(0)];
}).addCustomMethods({
    getUI5: (oDomNode, fn) => {
        //previous work start
        var aItem = $(oDomNode).control();
        if (!aItem.length ) {
            return;
        }
        var oItem = aItem[0];
        //previous work end

        var oReturn = {
            property: {},
            aggregation: {},
            association: {},
            context: {},
            metadata: {},
            identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", ui5AbsoluteId: "" },
            parents: [],
            children: [],
            control: null,
            dom: null
        };

        if (!oItem) {
            return oReturn;
        }

        //externalize
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

        //local methods on purpose (even if duplicated) (see above)
        var _getUi5LocalId = function (oItem) {
            var sId = oItem.getId();
            if (sId.lastIndexOf("-") !== -1) {
                return sId.substr(sId.lastIndexOf("-") + 1);
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

        var _getUi5Id = function (oItem) {
            //remove all component information from the control
            var oParent = oItem;
            var sCurrentComponent = _getOwnerComponent(oParent);
            if (!sCurrentComponent.length) {
                return "";
            }

            var sId = oItem.getId();
            sCurrentComponent = sCurrentComponent + "---";
            if (sId.lastIndexOf(sCurrentComponent) !== -1) {
                return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
            }
            return sId;
        };

        //missing: get elements with same parent, to get elements "right next", "left" and on same level
        var fnGetContexts = function (oItem) {
            //first, identify all models, which are theoretically available, via oItem.oModels
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

                oReturn[sModel] = {
                    path: oBindingContext.getPath(),
                    object: oBindingContext.getObject()
                };
            }
            return oReturn;
        };

        var fnGetElementInformation = function (oItem, oDomNode) {
            var oReturn = {
                property: {},
                aggregation: [],
                association: {},
                context: {},
                metadata: {},
                identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", ui5AbsoluteId: "" },
                control: null,
                dom: null
            };

            oReturn.control = oItem;
            oReturn.dom = oDomNode;
            oReturn.identifier.ui5Id = _getUi5Id(oItem);
            oReturn.identifier.ui5LocalId = _getUi5LocalId(oItem);

            //does the ui5Id contain a "-" with a following number? it is most likely a dependn control (e.g. based from aggregation or similar)
            if (RegExp("([A-Z,a-z,0-9])-([0-9])").test(oReturn.identifier.ui5Id) === true) {
                oReturn.identifier.idCloned = true;
            }
            //does the ui5id contain a "__"? it is most likely a generated id which should NOT BE USESD!!
            //check might be enhanced, as it seems to be that all controls are adding "__[CONTORLNAME] as dynamic view..
            if (oReturn.identifier.ui5Id.indexOf("__") !== -1) {
                oReturn.identifier.idGenerated = true;
            }

            if (oDomNode) {
                oReturn.identifier.domId = oDomNode.id;
            }
            oReturn.identifier.ui5AbsoluteId = oItem.getId();

            //return all simple properties
            for (var sProperty in oItem.mProperties) {
                oReturn.property[sProperty] = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
            }

            //return ids for all associations - for those associations additionally push the binding context object
            //having the binding context object, can be extremly helpful, to directly get e.g. the selected item key/text (or similar)
            for (var sAssociation in oItem.mAssociations) {
                oReturn.association[sAssociation] = {
                    id: oItem.mAssociations[sAssociation],
                    items: []
                };
                for (var k = 0; k < oItem.mAssociations.length; k++) {
                    oReturn.association[sAssociation].items.push({
                        id: oItem.mAssociations[sAssociation][k],
                        context: fnGetContexts(sap.ui.getCore().byId(oItem.mAssociations[sAssociation][k]))
                    });
                }
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

            //get metadata..
            oReturn.metadata = {
                elementName: oItem.getMetadata().getElementName(),
                componentName: _getOwnerComponent(oItem)
            };

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

            return oReturn;
        };

        oReturn = $.extend(true, oReturn, fnGetElementInformation(oItem, oDomNode));

        //get all parents, and attach the same information in the same structure
        var oParent = oItem.getParent();
        while (oParent) {
            if (oParent.getDomRef && oParent.getDomRef()) {
                oReturn.parents.push(fnGetElementInformation(oParent, oParent.getDomRef()));
            }
            oParent = oParent.getParent();
        }
        //afterwork start
        const element = oReturn;
        if (typeof fn === 'function') {
            return fn({ element });
        }

        return { element };
    }
});