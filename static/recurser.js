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

let steps = `fun(steps, jumps) {
    if (steps == 0) {
        return 1;
    }

    if (steps < 0) {
        return 0;
    }

    ways = 0;
    for (i = 0; i < len(jumps); i = i + 1) {
        ways = ways + fun(steps - jumps[i], jumps);    
    }
    return ways;
}

fun(4, [1, 2, 3]);`

let coins = `fun(coins, change, start) {
    if (change == 0) {
        return 1;
    }

    if (change < 0) {
        return 0;
    }

    ways = 0;
    for (i = start; i < len(coins); i = i + 1) {
        ways = ways + fun(coins, change - coins[i], i);
    }
    return ways;
}

fun([1, 5, 10], 10, 0);`

let examples = { fibonacci: fibonacci, factorial: factorial, steps: steps, coins: coins };

let margin = { top: 50, right: 10, bottom: 0, left: 60 };
let width = 1000 - margin.left - margin.right;
let height = 400 - margin.top - margin.bottom;

let NODE_SIZE = 30;
let timeouts = [];

/*
 ** Tree drawing algorithm made possible and inspired by the code
 ** and explanation from Rachel Lim:
 **
 ** https://rachel53461.wordpress.com/
 */

class Node {
    constructor(x, y, parent, prevSibling, dataNode) {
        this.x = x;
        this.y = y;
        this.finalY = 0;
        this.modifier = 0;

        this.parent = parent;
        this.prevSibling = prevSibling;
        this.children = [];

        this.dataNode = dataNode;
        this.collapse = false;
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

function buildTree(dataNode, parent, prevSibling, level) {
    let root = new Node(level, 0, parent, prevSibling, dataNode);
    for (let i = 0; i < dataNode.children.length; i++) {
        root.children.push(
            buildTree(
                dataNode.children[i],
                root,
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

function setAnimTimers(root, delay, delayIncrement) {
    timeouts.push(setTimeout(function() {
        let nodeEl = document.getElementById(`node-${root.dataNode.count}`);
        let lineEl = document.getElementById(`line-${root.dataNode.count}`);
        let funEl = document.getElementById(`funcall-${root.dataNode.count}`);

        if (nodeEl) {
            nodeEl.classList.add("visible");
        }
        if (lineEl) {
            lineEl.classList.add("visible");
        }
        if (funEl) {
            funEl.classList.add("visible");
        }
    }, delay));

    for (let i = 0; i < root.children.length; i++) {
        delay = setAnimTimers(root.children[i], delay + delayIncrement, delayIncrement);
    }

    delay += delayIncrement;
    timeouts.push(setTimeout(function() {
        let retEl = document.getElementById(`retval-${root.dataNode.count}`);
        if (retEl) {
            retEl.classList.add("visible");
        }
    }, delay));

    return delay;
}

function assignSiblingCounts(root) {
    let nodes = [root, null]
    let level = [];

    let siblings = 0;
    while (nodes.length) {
        let node = nodes.shift();
        if (!node) {
            for (let i = 0; i < level.length; i++) {
                level[i].siblings = siblings;
            }
            level = [];
            siblings = 0;
            if (nodes.length) {
                nodes.push(null);
            }
        } else {
            nodes = nodes.concat(node.children);
            siblings++;
            level.push(node);
        }
    }
}

function getArgLabels(args) {
    let res = [];
    for (let i = 0; i < args.length; i++) {
        if (Array.isArray(args[i])) {
            res.push(`[...]`);
        } else {
            res.push(args[i] + "");
        }
    }
    return res.join(", ");
}

function drawTree(svg, data) {
    let root = buildTree(data, null, null, 0);

    for (let i = 0; i < timeouts.length; i++) {
        clearTimeout(timeouts[i]);
    }
    timeouts = [];

    calculateInitialValues(root);
    calculateFinalValues(root, 0);
    updateYVals(root);
    fixNodeConflicts(root);
    assignSiblingCounts(root);

    let existingNotice = svg.querySelector("#notice");
    if (existingNotice) {
        svg.removeChild(existingNotice);
    }

    let existingG = svg.querySelector("g");
    if (existingG) {
        svg.removeChild(existingG);
    }

    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${margin.left}, ${margin.top})`);

    svg.appendChild(g);

    let [treeWidth, treeHeight] = getDimensions(root);
    let levelWidth = width / (treeWidth + 1);
    let levelHeight = height / (treeHeight + 1);

    NODE_SIZE = Math.min(NODE_SIZE, levelWidth, levelHeight);
    let nodeOffsetX = levelWidth / 2 - NODE_SIZE / 2;
    let nodeOffsetY = levelHeight / 2 - NODE_SIZE / 2;
    let collapseNodes = false;

    let fontSize = 16;

    let nodeCount = 0;
    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        let parent = node.parent;

        let x1 = node.x * levelWidth + nodeOffsetX;
        let y1 = node.finalY * levelHeight + nodeOffsetY;
        
        nodeCount += 1;
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
            line.setAttribute("id", `line-${node.children[i].dataNode.count}`);
            line.setAttribute("class", "invisible");
            line.setAttribute("stroke", "steelblue");

            g.appendChild(line);
        }

        nodes = nodes.concat(node.children);

        let funcall = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

        let tspan1 = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "tspan"
        );

        let tspan2 = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "tspan"
        );

        tspan1.textContent = `fun(${getArgLabels(node.dataNode.args)})`;
        tspan2.textContent = " \u2192 " + node.dataNode.retval;

        tspan1.setAttribute("id", `funcall-${node.dataNode.count}`);
        tspan2.setAttribute("id", `retval-${node.dataNode.count}`);

        tspan1.setAttribute("class", "label invisible");
        tspan2.setAttribute("class", "label invisible");

        funcall.setAttribute("id", `funcall-${node.dataNode.count}-container`);
        funcall.setAttribute("x", x1);
        funcall.setAttribute("y", y1);
        funcall.setAttribute("text-anchor", "middle");
        funcall.setAttribute("font-size", `${Math.max(fontSize - node.siblings, 8)}px`);

        funcall.appendChild(tspan1);
        funcall.appendChild(tspan2);

        g.appendChild(funcall);

        let bbox = funcall.getBBox();

        if ((bbox.width > levelWidth || bbox.height / 4 > levelHeight)) {
            collapseNodes = true;
        }
    }

    if (collapseNodes) {
        let notice = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );
        notice.textContent = "Node labels have been condensed into tooltips.";
        notice.setAttribute("id", "notice");
        notice.setAttribute("y", 20);
        notice.setAttribute("fill", "white");
        document.querySelector("svg").appendChild(notice);

        let nodes = [root];
        while (nodes.length) {
            let node = nodes.shift();
            nodes = nodes.concat(node.children);

            let funcall = g.querySelector(`#funcall-${node.dataNode.count}-container`);

            let circle = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

            let title = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "title"
            );

            let x1 = node.x * levelWidth + nodeOffsetX;
            let y1 = node.finalY * levelHeight + nodeOffsetY;

            circle.setAttribute("id", `node-${node.dataNode.count}`);
            circle.setAttribute("cx", x1);
            circle.setAttribute("cy", y1);
            circle.setAttribute("r", 4);
            circle.setAttribute("fill", "steelblue");
            circle.setAttribute("class", "invisible");

            title.textContent = `fun(${getArgLabels(node.dataNode.args)})`
            title.textContent += " \u2192 " + node.dataNode.retval;
            circle.appendChild(title);

            g.removeChild(funcall);
            g.appendChild(circle);
        }
    }

    let delayIncrement = Math.max(200, 600 - nodeCount * 10);
    setAnimTimers(root, 0, delayIncrement);
}
