import UI5Selector from "./selector";

class ui5 {
    constructor() {
        this._id = {};
    }

    button() {
        this._id = this._enhanceWith(this._id, {
            metadata: {
                elementName: "sap.m.Button"
            }
        });
        return this;
    }

    text() {
        this._id = this._enhanceWith(this._id, {
            metadata: {
                elementName: "sap.m.Text"
            }
        });
        return this;
    }

    insideATable() {
        this._id = this._enhanceWith(this._id, {
            insideATable: true
        });
        return this;
    }

    localId(id) {
        this._id = this._enhanceWith(this._id, {
            identifier: {
                ui5LocalId: id
            }
        });
        return this;
    }

    _enhanceWith(id, enhanceWith) {
        var oEnhanceBasis = {};
        if (typeof id === "string") {
            oEnhanceBasis.identifier.id = id;
        } else {
            oEnhanceBasis = Object.assign(oEnhanceBasis, enhanceWith);
        }
        return oEnhanceBasis;
    }
}

export default ui5;