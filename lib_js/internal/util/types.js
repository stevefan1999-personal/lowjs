'use strict';

const ReflectApply = Reflect.apply;

// This function is borrowed from the function with the same name on V8 Extras'
// `utils` object. V8 implements Reflect.apply very efficiently in conjunction
// with the spread syntax, such that no additional special case is needed for
// function calls w/o arguments.
// Refs: https://github.com/v8/v8/blob/d6ead37d265d7215cf9c5f768f279e21bd170212/src/js/prologue.js#L152-L156
const uncurryThis = (func) => (thisArg, ...args) => ReflectApply(func, thisArg, args);

// Cached to make sure no userland code can tamper with it.
const isArrayBufferView = ArrayBuffer.isView;

const isUint8Array = (value) => value instanceof Uint8Array;

const isUint8ClampedArray = (value) => value instanceof Uint8ClampedArray;

const isUint16Array = (value) => value instanceof Uint16Array;

const isUint32Array = (value) => value instanceof Uint32Array;

const isInt8Array = (value) => value instanceof Int8Array;

const isInt16Array = (value) => value instanceof Int16Array;

const isInt32Array = (value) => value instanceof Int32Array;

const isFloat32Array = (value) => value instanceof Float32Array;

const isFloat64Array = (value) => value instanceof Float64Array;

const isBigInt64Array = (value) => value instanceof BigInt64Array;

const isBigUint64Array = (value) => value instanceof BigUint64Array;

const isAnyArrayBuffer = (value) => false;

const isArgumentsObject = (value) => false;

const isDataView = (value) => value instanceof DataView;

const isExternal = (value) => false;

const isMap = (value) => value instanceof Map;

const isMapIterator = (value) => false;

const isPromise = (value) => value instanceof Promise;

const isSet = (value) => value instanceof Set;

const isSetIterator = (value) => false;

const isWeakMap = (value) => value instanceof WeakMap;

const isWeakSet = (value) => value instanceof WeakSet;

const isRegExp = (value) => value instanceof RegExp;

const isDate = (value) => value instanceof Date;

const isTypedArray = (value) => false;

const isModuleNamespaceObject = (value) => false;

// TODO: check list of util/types

module.exports = {
    isArrayBufferView,
    isTypedArray,
    isUint8Array,
    isUint8ClampedArray,
    isUint16Array,
    isUint32Array,
    isInt8Array,
    isInt16Array,
    isInt32Array,
    isFloat32Array,
    isFloat64Array,
    isBigInt64Array,
    isBigUint64Array,
    isAnyArrayBuffer,
    isArgumentsObject,
    isDataView,
    isExternal,
    isMap,
    isMapIterator,
    isPromise,
    isSet,
    isSetIterator,
    isWeakMap,
    isWeakSet,
    isRegExp,
    isDate,
    isModuleNamespaceObject
}
;
