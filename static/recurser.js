let fibonacci = `fun(n) {
    if (n <= 1) {
        return n;
    }
    return fun(n - 1) + fun(n - 2);
}

fun(5);`;

let factorial = `fun(n) {
    if (n <= 1) {
        return n;
    }
    return n * fun(n - 1);
}

fun(5);`;

let examples = { fibonacci: fibonacci, factorial: factorial };

let margin = { top: 50, right: 0, bottom: 0, left: 0 };
let width = 1000 - margin.left - margin.right;
let height = 400 - margin.top - margin.bottom;

let NODE_SIZE = 30;

/*
 ** Tree drawing algorithm made possible and inspired by the code
 ** and explanation from Rachel Lim:
 **
 ** https://rachel53461.wordpress.com/
 */

class Node {
    constructor(x, y, prevSibling, dataNode) {
        this.x = x;
        this.y = y;
        this.finalY = 0;
        this.modifier = 0;

        this.prevSibling = prevSibling;
        this.children = [];

        this.dataNode = dataNode;
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
        let minY = Infinity;
        let maxY = -minY;
        for (let i = 0; i < node.children.length; i++) {
            minY = Math.min(minY, node.children[i].y);
            maxY = Math.max(maxY, node.children[i].y);
        }
        node.modifier = node.y - (maxY - minY) / 2;
    }
}

function calculateFinalValues(node, modSum) {
    node.finalY = node.y + modSum;
    for (let i = 0; i < node.children.length; i++) {
        calculateFinalValues(node.children[i], node.modifier + modSum);
    }
}

function getContour(root, val, func) {
    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        nodes = nodes.concat(node.children);
        val = func(val, node.finalY);
    }
    return val;
}

function shiftDown(root, shiftValue) {
    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        nodes = nodes.concat(node.children);
        node.finalY += shiftValue;
    }
}

function fixNodeConflicts(root) {
    for (let i = 0; i < root.children.length; i++) {
        fixNodeConflicts(root.children[i]);
    }

    for (let i = 0; i < root.children.length - 1; i++) {
        // Get the bottom-most contour position of the current node
        let botContour = getContour(root.children[i], -Infinity, Math.max);

        // Get the topmost contour position of the node underneath the current one
        let topContour = getContour(root.children[i + 1], Infinity, Math.min);

        if (botContour >= topContour) {
            shiftDown(root.children[i + 1], botContour - topContour + 3);
        }
    }
}

function buildTree(dataNode, prevSibling, level) {
    let root = new Node(level, 0, prevSibling, dataNode);
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

function updateYVals(root) {
    let minYVal = Infinity;
    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        nodes = nodes.concat(node.children);
        if (node.finalY < minYVal) {
            minYVal = node.finalY;
        }
    }

    nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        nodes = nodes.concat(node.children);
        node.finalY += Math.abs(minYVal);
    }
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

function setAnimTimers(root) {
    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        nodes = nodes.concat(node.children);

        setTimeout(function(_node) {
            let lineEl = document.getElementById(`line-${_node.dataNode.count}`);
            let nodeEl = document.getElementById(`node-${_node.dataNode.count}`);

            lineEl.classList.add("visible");
            nodeEl.classList.add("visible");
        }.bind(null, node), node.dataNode.count * 100);
    }
}


function drawTree(svg, data) {
    let root = buildTree(data, null, 0);

    calculateInitialValues(root);
    calculateFinalValues(root, 0);
    updateYVals(root);
    fixNodeConflicts(root);
    setAnimTimers(root);

    let existingG = svg.querySelector("g");
    if (existingG) {
        svg.removeChild(existingG);
    }

    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${margin.left}, ${margin.top})`);

    let [treeWidth, treeHeight] = getDimensions(root);
    let levelWidth = width / (treeWidth + 1);
    let levelHeight = height / (treeHeight + 1);

    NODE_SIZE = Math.min(NODE_SIZE, levelWidth, levelHeight);
    let nodeOffsetX = levelWidth / 2 - NODE_SIZE / 2;
    let nodeOffsetY = levelHeight / 2 - NODE_SIZE / 2;

    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();

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
            line.setAttribute("id", `line-${node.dataNode.count}`);
            line.setAttribute("class", "invisible");
            line.setAttribute("stroke", "steelblue");

            g.appendChild(line);
        }

        nodes = nodes.concat(node.children);

        let text = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

        text.setAttribute("x", x1);
        text.setAttribute("y", y1);
        text.setAttribute("id", `node-${node.dataNode.count}`);
        text.setAttribute("class", "funcall invisible");
        text.textContent =
            "fun(" +
            node.dataNode.args.join(", ") +
            ") \u2192 " +
            node.dataNode.retval;

        g.appendChild(text);
    }
    svg.appendChild(g);
}
