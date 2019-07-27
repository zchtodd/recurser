let margin = { top: 100, right: 20, bottom: 100, left: 20 };
let width = 1000 - margin.left - margin.right;
let height = 400 - margin.top - margin.bottom;

let NODE_SIZE = 30;

class Node {
    constructor(x, y, prevSibling) {
        this.x = x;
        this.y = y;
        this.finalY = 0;
        this.modifier = 0;

        this.prevSibling = prevSibling;
        this.children = [];
    }
}

function calculateInitialValues(node) {
    for (let i = 0; i < node.children.length; i++) {
        calculateInitialValues(node.children[i]);
    }

    if (node.prevSibling) {
        node.y = node.prevSibling.y + 3;
    } else {
        node.y = 0;
    }

    if (node.children.length == 1) {
        node.modifier = node.y;
    } else if (node.children.length >= 2) {
        let totalY = 0;
        for (let i = 0; i < node.children.length; i++) {
            totalY += node.children[i].y;
        }
        node.modifier = node.y - totalY / 2;
    }
}

function calculateFinalValues(node, modSum) {
    node.finalY = node.y + modSum;
    for (let i = 0; i < node.children.length; i++) {
        calculateFinalValues(node.children[i], node.modifier + modSum);
    }
}

function buildTree(dataNode, prevSibling, level) {
    let root = new Node(level, 0, prevSibling);
    for (let i = 0; i < dataNode.children.length; i++) {
        root.children.push(
            buildTree(
                dataNode.children[i],
                i >= 1 ? root.children[i - 1] : null,
                level + 1
            )
        );
    }
    return root;
}

function getDimensions(root) {
    let minWidth = Infinity;
    let maxWidth = -minWidth;

    let minHeight = Infinity;
    let maxHeight = -minWidth;

    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        nodes = nodes.concat(node.children);

        if (node.x < minWidth) {
            minWidth = node.x;
        }

        if (node.x > maxWidth) {
            maxWidth = node.x;
        }

        if (node.finalY < minHeight) {
            minHeight = node.finalY;
        }

        if (node.finalY > maxHeight) {
            maxHeight = node.finalY;
        }
    }
    return [maxWidth - minWidth, maxHeight - minHeight];
}

function drawTree(svg, data) {
    let root = buildTree(data, null, 0);

    calculateInitialValues(root);
    calculateFinalValues(root, 0);

    //let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    //g.setAttribute(
    //    "transform",
    //    `translate(${margin.left}, ${margin.top}) rotate(-90)`
    //);

    let [treeWidth, treeHeight] = getDimensions(root);
    let levelWidth = width / (treeWidth + 1);
    let levelHeight = height / (treeHeight + 1);

    NODE_SIZE = Math.min(NODE_SIZE, levelWidth, levelHeight);
    let nodeOffsetX = levelWidth / 2 - NODE_SIZE / 2;
    let nodeOffsetY = levelHeight / 2 - NODE_SIZE / 2;

    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        let circ = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

        let x1 = node.x * levelWidth + nodeOffsetX;
        let y1 = node.finalY * levelHeight + nodeOffsetY;

        for (let i = 0; i < node.children.length; i++) {
            let x2 = node.children[i].x * levelWidth + nodeOffsetX;
            let y2 = node.children[i].finalY * levelHeight + nodeOffsetY;

            let line = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );

            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("stroke", "red");

            svg.appendChild(line);
        }

        nodes = nodes.concat(node.children);

        circ.setAttribute("cx", x1);
        circ.setAttribute("cy", y1);
        circ.setAttribute("fill", "red");
        circ.setAttribute("r", NODE_SIZE);

        svg.appendChild(circ);
    }
}
