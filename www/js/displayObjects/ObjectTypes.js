import { Fill } from './Fill.js';
import { Rectangle } from './Rectangle.js';
import { Line } from './Line.js';
import { Circle } from './Circle.js';
import { Triangle } from './Triangle.js';
import { Text } from './Text.js';
import { Bitmap } from './Bitmap.js';

export const OBJECT_TYPES = {
    fill: {
        name: 'Fill Screen',
        icon: 'paint-bucket',
        class: Fill,
        properties: [
            { key: 'color', name: 'Color', type: 'color' }
        ]
    },
    rect: {
        name: 'Rectangle',
        icon: 'rectangle-horizontal',
        class: Rectangle,
        properties: [
            { key: 'x', name: 'X', type: 'posX' },
            { key: 'y', name: 'Y', type: 'posY' },
            { key: 'width', name: 'Width', type: 'width' },
            { key: 'height', name: 'Height', type: 'height' },
            { key: 'radius', name: 'Corner Radius', type: 'int' },
            { key: 'color', name: 'Color', type: 'color' },
            { key: 'fill', name: 'Fill', type: 'bool' }
        ]
    },
    line: {
        name: 'Line',
        icon: 'slash',
        class: Line,
        properties: [
            { key: 'x0', name: 'X1', type: 'posX' },
            { key: 'y0', name: 'Y1', type: 'posY' },
            { key: 'x1', name: 'X2', type: 'posX' },
            { key: 'y1', name: 'Y2', type: 'posY' },
            { key: 'color', name: 'Color', type: 'color' }
        ]
    },
    circle: {
        name: 'Circle',
        icon: 'circle',
        class: Circle,
        properties: [
            { key: 'x', name: 'Center X', type: 'posX' },
            { key: 'y', name: 'Center Y', type: 'posY' },
            { key: 'radius', name: 'Radius', type: 'int' },
            { key: 'color', name: 'Color', type: 'color' },
            { key: 'fill', name: 'Fill', type: 'bool' }
        ]
    },
    triangle: {
        name: 'Triangle',
        icon: 'triangle',
        class: Triangle,
        properties: [
            { key: 'x0', name: 'X1', type: 'posX' },
            { key: 'y0', name: 'Y1', type: 'posY' },
            { key: 'x1', name: 'X2', type: 'posX' },
            { key: 'y1', name: 'Y2', type: 'posY' },
            { key: 'x2', name: 'X3', type: 'posX' },
            { key: 'y2', name: 'Y3', type: 'posY' },
            { key: 'color', name: 'Color', type: 'color' },
            { key: 'fill', name: 'Fill', type: 'bool' }
        ]
    },
    text: {
        name: 'Text',
        icon: 'type',
        class: Text,
        properties: [
            { key: 'x', name: 'X', type: 'posX' },
            { key: 'y', name: 'Y', type: 'posY' },
            { key: 'fontSize', name: 'Font Size', type: 'int' },
            { key: 'font', name: 'Font', type: 'font' },
            { key: 'content', name: 'Text', type: 'text' },
            { key: 'color', name: 'Color', type: 'color' }
        ]
    },
    bitmap: {
        name: 'Image',
        icon: 'image',
        class: Bitmap,
        properties: [
            { key: 'x', name: 'X', type: 'posX' },
            { key: 'y', name: 'Y', type: 'posY' },
            { key: 'width', name: 'Width', type: 'width' },
            { key: 'height', name: 'Height', type: 'height' },
            { key: 'file', name: 'Image File', type: 'image' },
            { key: 'color', name: 'Color', type: 'color' },
            { key: 'monochrome', name: 'Static Color', type: 'bool' }
        ]
    }
};
Object.freeze(OBJECT_TYPES);
