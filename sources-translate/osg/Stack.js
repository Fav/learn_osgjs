'use strict';
//堆栈
var Stack = function () {
    this.globalDefault = undefined;
    this.lastApplied = undefined;
    this.asChanged = false;

    this._values = [];
    this._back = undefined;//栈顶的值
};

Stack.prototype = {
    empty: function () {
        return this._values.length === 0;
    },
    values: function () {
        return this._values;
    },
    back: function () {
        return this._back;
    },
    push: function ( value ) {
        this._values.push( value );
        this._back = value;
    },
    pop: function () {
        var value = this._values.pop();
        this._back = this._values[ this._values.length - 1 ];
        return value;
    }
};

module.exports = Stack;
